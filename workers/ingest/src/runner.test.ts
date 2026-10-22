// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Env, Job } from "./job";
import { runIngest } from "./runner";

const env: Env = {
  SUPABASE_URL: "https://db.example.com",
  SUPABASE_SERVICE_ROLE_KEY: "service-key",
  DISCORD_WEBHOOK_URL: "https://discord.example.com/webhook",
};

// 2026-10-22（木）03:00 JST
const SCHEDULED = Date.parse("2026-10-21T18:00:00Z");

type Sent = { method: string; url: URL; body: unknown };

// Supabase（PostgREST）と Discord の代わり。送られたものを記録し、表ごとに決めた応答を返す
function fakeBackend(options: {
  staleRuns?: { id: number; job: string }[];
  unresolvedTowns?: { town_name: string; source_id: string; occurrences: number; last_seen_at: string }[];
  failInsertRun?: boolean;
} = {}) {
  const sent: Sent[] = [];
  let nextRunId = 1;
  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    sent.push({ method, url, body });
    const path = url.pathname;
    const json = (value: unknown) => new Response(JSON.stringify(value), { status: 200 });

    if (url.host === "discord.example.com") return new Response(null, { status: 204 });
    if (path === "/rest/v1/ingest_runs" && method === "PATCH" && url.searchParams.get("status") === "eq.running") {
      return json(options.staleRuns ?? []);
    }
    if (path === "/rest/v1/ingest_runs" && method === "POST") {
      if (options.failInsertRun) return new Response('{"message":"permission denied"}', { status: 401 });
      return json([{ id: nextRunId++ }]);
    }
    if (path === "/rest/v1/ingest_runs" && method === "PATCH") return new Response(null, { status: 204 });
    if (path === "/rest/v1/ingest_runs" && method === "GET") return json([{ progress: { quarter: "2025Q4" } }]);
    if (path === "/rest/v1/town_district_map") {
      return json([
        { town_name: "鼎", city_district: "鼎", district_id: "kanae" },
        { town_name: "大瀬木", city_district: "伊賀良", district_id: "igara" },
      ]);
    }
    if (path === "/rest/v1/rpc/record_unmapped_towns") return new Response(null, { status: 204 });
    if (path === "/rest/v1/unmapped_towns") return json(options.unresolvedTowns ?? []);
    throw new Error(`想定していない呼び出し：${method} ${url}`);
  });
  const finishes = () =>
    sent.filter((s) => s.method === "PATCH" && s.url.searchParams.get("id")?.startsWith("eq."));
  const discordPosts = () => sent.filter((s) => s.url.host === "discord.example.com");
  return { fetch: fetchMock as unknown as typeof fetch, sent, finishes, discordPosts };
}

function job(overrides: Partial<Job> & Pick<Job, "name">): Job {
  return { sourceId: "test_source", shouldRun: () => true, run: async () => ({ rowsWritten: 0 }), ...overrides };
}

beforeEach(() => {
  vi.useFakeTimers({ now: SCHEDULED });
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("runIngest", () => {
  it("その日に動かす処理だけを実行し、開始と成功を記録する。問題がなければ知らせない", async () => {
    const backend = fakeBackend();
    const summary = await runIngest(env, SCHEDULED, {
      fetch: backend.fetch,
      jobs: [
        job({ name: "daily", run: async () => ({ rowsWritten: 12, progress: { page: 3 } }) }),
        job({ name: "april_only", shouldRun: (today) => today.month === 4 }),
      ],
    });

    expect(summary.ran).toEqual(["daily"]);
    expect(summary.failures).toEqual([]);
    expect(summary.notified).toBe(false);
    const start = backend.sent.find((s) => s.method === "POST" && s.url.pathname === "/rest/v1/ingest_runs");
    expect(start?.body).toEqual({ job: "daily", source_id: "test_source" });
    expect(backend.finishes()[0].body).toMatchObject({
      status: "succeeded",
      rows_written: 12,
      external_calls: 0,
      progress: { page: 3 },
    });
    expect(backend.discordPosts()).toHaveLength(0);
  });

  it("Supabase には service_role key を付けて送る", async () => {
    const backend = fakeBackend();
    await runIngest(env, SCHEDULED, { fetch: backend.fetch, jobs: [job({ name: "daily" })] });

    const init = vi.mocked(backend.fetch).mock.calls[0][1];
    expect(init?.headers).toMatchObject({ apikey: "service-key", Authorization: "Bearer service-key" });
  });

  it("処理が失敗したら失敗を記録して Discord に知らせ、後に続く処理は動かす", async () => {
    const backend = fakeBackend();
    const summary = await runIngest(env, SCHEDULED, {
      fetch: backend.fetch,
      jobs: [
        job({
          name: "broken",
          run: async () => {
            throw new Error("API の形が変わった");
          },
        }),
        job({ name: "after" }),
      ],
    });

    expect(summary.ran).toEqual(["broken", "after"]);
    expect(summary.failures).toEqual([{ job: "broken", message: "API の形が変わった" }]);
    expect(backend.finishes().map((f) => (f.body as { status: string }).status)).toEqual(["failed", "succeeded"]);
    expect(backend.finishes()[0].body).toMatchObject({ error_message: "API の形が変わった" });
    const [post] = backend.discordPosts();
    expect((post.body as { content: string }).content).toContain("broken：API の形が変わった");
    expect(post.body).toMatchObject({ allowed_mentions: { parse: [] } });
    expect(summary.notified).toBe(true);
  });

  it("Supabase に記録できないときは処理を動かさず、それでも知らせる", async () => {
    const backend = fakeBackend({ failInsertRun: true });
    const run = vi.fn(async () => ({ rowsWritten: 1 }));
    const summary = await runIngest(env, SCHEDULED, { fetch: backend.fetch, jobs: [job({ name: "daily", run })] });

    expect(run).not.toHaveBeenCalled();
    expect(summary.failures[0].message).toContain("開始を記録できなかった");
    expect(backend.discordPosts()).toHaveLength(1);
  });

  it("住所を対応表で振り分け、当たらなかった町名は処理の最後にまとめて記録する", async () => {
    const backend = fakeBackend();
    const districts: (string | null)[] = [];
    await runIngest(env, SCHEDULED, {
      fetch: backend.fetch,
      jobs: [
        job({
          name: "facilities",
          run: async (context) => {
            const resolve = await context.townResolver();
            for (const address of ["飯田市鼎中平1970", "飯田市大瀬木1101", "飯田市座光寺3349", "飯田市座光寺10"]) {
              const entry = resolve(address);
              districts.push(entry?.districtId ?? null);
              if (!entry) context.unmappedTowns.add(address);
            }
            return { rowsWritten: 2 };
          },
        }),
      ],
    });

    expect(districts).toEqual(["kanae", "igara", null, null]);
    const rpc = backend.sent.filter((s) => s.url.pathname === "/rest/v1/rpc/record_unmapped_towns");
    expect(rpc).toHaveLength(1);
    expect(rpc[0].body).toEqual({ p_source_id: "test_source", p_town_names: ["座光寺", "座光寺"] });
  });

  it("処理が失敗したときは、対応表にない町名を記録しない（次の実行で数え直すため）", async () => {
    const backend = fakeBackend();
    await runIngest(env, SCHEDULED, {
      fetch: backend.fetch,
      jobs: [
        job({
          name: "facilities",
          run: async (context) => {
            context.unmappedTowns.add("飯田市座光寺3349");
            throw new Error("途中で失敗");
          },
        }),
      ],
    });

    expect(backend.sent.some((s) => s.url.pathname === "/rest/v1/rpc/record_unmapped_towns")).toBe(false);
  });

  it("前回の続きの位置を読める", async () => {
    const backend = fakeBackend();
    let progress: unknown;
    await runIngest(env, SCHEDULED, {
      fetch: backend.fetch,
      jobs: [
        job({
          name: "tiles",
          run: async (context) => {
            progress = await context.previousProgress();
            return { rowsWritten: 0 };
          },
        }),
      ],
    });

    expect(progress).toEqual({ quarter: "2025Q4" });
    const query = backend.sent.find((s) => s.method === "GET" && s.url.pathname === "/rest/v1/ingest_runs");
    expect(query?.url.searchParams.get("job")).toBe("eq.tiles");
    expect(query?.url.searchParams.get("status")).toBe("eq.succeeded");
  });

  it("running のまま残った実行を失敗として閉じ、知らせる", async () => {
    const backend = fakeBackend({ staleRuns: [{ id: 7, job: "transactions" }] });
    const summary = await runIngest(env, SCHEDULED, { fetch: backend.fetch, jobs: [] });

    const close = backend.sent[0];
    expect(close.method).toBe("PATCH");
    expect(close.url.searchParams.get("started_at")).toBe(`lt.${new Date(SCHEDULED - 60 * 60 * 1000).toISOString()}`);
    expect(close.body).toMatchObject({ status: "failed" });
    expect((backend.discordPosts()[0].body as { content: string }).content).toContain("#7 transactions");
    expect(summary.staleRuns).toHaveLength(1);
  });

  it("今回見つかった未反映の町名があれば、未反映の町名を並べて知らせる", async () => {
    const backend = fakeBackend({
      unresolvedTowns: [
        { town_name: "座光寺", source_id: "test_source", occurrences: 2, last_seen_at: new Date(SCHEDULED).toISOString() },
        { town_name: "竜丘", source_id: "test_source", occurrences: 1, last_seen_at: "2026-10-01T00:00:00Z" },
      ],
    });
    await runIngest(env, SCHEDULED, { fetch: backend.fetch, jobs: [] });

    const content = (backend.discordPosts()[0].body as { content: string }).content;
    expect(content).toContain("未反映 2件、うち今回見つかったもの 1件");
    expect(content).toContain("座光寺（test_source、2回）");
    expect(content).toContain("竜丘");
  });

  it("以前からの未反映の町名だけなら、月曜にだけ知らせる", async () => {
    const unresolvedTowns = [
      { town_name: "竜丘", source_id: "test_source", occurrences: 1, last_seen_at: "2026-10-01T00:00:00Z" },
    ];
    const thursday = fakeBackend({ unresolvedTowns });
    await runIngest(env, SCHEDULED, { fetch: thursday.fetch, jobs: [] });
    expect(thursday.discordPosts()).toHaveLength(0);

    const monday = fakeBackend({ unresolvedTowns });
    const mondayTime = Date.parse("2026-10-25T18:00:00Z");
    vi.setSystemTime(mondayTime);
    await runIngest(env, mondayTime, { fetch: monday.fetch, jobs: [] });
    expect(monday.discordPosts()).toHaveLength(1);
  });

  it("service_role key が登録されていなければ、Supabase を呼ばずにそのことを知らせる", async () => {
    const backend = fakeBackend();
    const run = vi.fn(async () => ({ rowsWritten: 0 }));
    const summary = await runIngest({ ...env, SUPABASE_SERVICE_ROLE_KEY: "" }, SCHEDULED, {
      fetch: backend.fetch,
      jobs: [job({ name: "daily", run })],
    });

    expect(run).not.toHaveBeenCalled();
    expect(backend.sent.filter((s) => s.url.host === "db.example.com")).toHaveLength(0);
    expect((backend.discordPosts()[0].body as { content: string }).content).toContain(
      "SUPABASE_SERVICE_ROLE_KEY が登録されていない",
    );
    expect(summary.notified).toBe(true);
  });

  it("Webhook が登録されていなければ、知らせる内容をログに出す", async () => {
    const backend = fakeBackend({ staleRuns: [{ id: 7, job: "transactions" }] });
    await runIngest({ ...env, DISCORD_WEBHOOK_URL: undefined }, SCHEDULED, { fetch: backend.fetch, jobs: [] });

    expect(backend.discordPosts()).toHaveLength(0);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("#7 transactions"));
  });

  it("外部 API の呼び出しは間をあけ、回数を処理ごとに記録する", async () => {
    const backend = fakeBackend();
    const externalFetch = vi.fn(async () => new Response("{}"));
    const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) =>
      String(input).startsWith("https://api.example.com")
        ? externalFetch()
        : backend.fetch(input, init)) as typeof fetch;

    const result = runIngest(env, SCHEDULED, {
      fetch: fetchImpl,
      jobs: [
        job({
          name: "api",
          run: async (context) => {
            await context.external.request("https://api.example.com/a");
            await context.external.request("https://api.example.com/b");
            return { rowsWritten: 0 };
          },
        }),
      ],
    });
    await vi.runAllTimersAsync();
    await result;

    expect(externalFetch).toHaveBeenCalledTimes(2);
    expect(backend.finishes()[0].body).toMatchObject({ external_calls: 2 });
  });
});
