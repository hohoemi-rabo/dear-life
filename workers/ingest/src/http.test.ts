// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CallBudget, CallBudgetExceededError, createHttpClient, HttpRequestError } from "./http";

beforeEach(() => {
  vi.useFakeTimers({ now: Date.parse("2026-10-22T03:00:00+09:00") });
});

afterEach(() => {
  vi.useRealTimers();
});

// 送った時刻を記録し、決めた順に応答を返す fetch
function scriptedFetch(responses: (() => Response | Promise<Response>)[]) {
  const sentAt: number[] = [];
  const fetchMock = vi.fn(async () => {
    sentAt.push(Date.now());
    const next = responses.shift();
    if (!next) throw new Error("想定より多く呼ばれた");
    return next();
  });
  return { fetch: fetchMock as unknown as typeof fetch, sentAt, fetchMock };
}

const ok = () => new Response("ok");

describe("createHttpClient", () => {
  it("外部 API の呼び出しの間を、前の応答から 1.5 秒以上あける", async () => {
    const { fetch, sentAt } = scriptedFetch([ok, ok, ok]);
    const client = createHttpClient({ budget: new CallBudget(), minIntervalMs: 1500, fetch });

    const done = (async () => {
      for (let i = 0; i < 3; i++) await client.request("https://api.example.com/a");
    })();
    await vi.runAllTimersAsync();
    await done;

    expect(sentAt[1] - sentAt[0]).toBeGreaterThanOrEqual(1500);
    expect(sentAt[2] - sentAt[1]).toBeGreaterThanOrEqual(1500);
    expect(client.calls).toBe(3);
  });

  it("5xx と 429 は待ち時間を倍にしながら送り直し、成功すれば応答を返す", async () => {
    const { fetch, sentAt } = scriptedFetch([
      () => new Response("busy", { status: 503 }),
      () => new Response("slow down", { status: 429 }),
      () => new Response("done"),
    ]);
    const client = createHttpClient({ budget: new CallBudget(), backoffBaseMs: 1000, fetch });

    const result = client.request("https://api.example.com/a");
    await vi.runAllTimersAsync();

    expect(await (await result).text()).toBe("done");
    expect(sentAt[1] - sentAt[0]).toBe(1000);
    expect(sentAt[2] - sentAt[1]).toBe(2000);
    expect(client.calls).toBe(3);
  });

  it("Retry-After があれば、その秒数だけ待つ", async () => {
    const { fetch, sentAt } = scriptedFetch([
      () => new Response("", { status: 429, headers: { "Retry-After": "10" } }),
      ok,
    ]);
    const client = createHttpClient({ budget: new CallBudget(), backoffBaseMs: 1000, fetch });

    const result = client.request("https://api.example.com/a");
    await vi.runAllTimersAsync();
    await result;

    expect(sentAt[1] - sentAt[0]).toBe(10_000);
  });

  it("4xx は送り直さずに失敗にし、エラーに URL のクエリ（API キーなど）を出さない", async () => {
    const { fetch, fetchMock } = scriptedFetch([() => new Response("bad request", { status: 400 })]);
    const client = createHttpClient({ budget: new CallBudget(), fetch });

    const error = await client.request("https://api.example.com/a?key=SECRET").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HttpRequestError);
    expect((error as HttpRequestError).status).toBe(400);
    expect((error as Error).message).toContain("api.example.com/a");
    expect((error as Error).message).not.toContain("SECRET");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("リトライの回数を使い切ったら、最後の応答で失敗にする", async () => {
    const { fetch, fetchMock } = scriptedFetch([
      () => new Response("", { status: 500 }),
      () => new Response("", { status: 502 }),
    ]);
    const client = createHttpClient({ budget: new CallBudget(), maxRetries: 1, fetch });

    const result = client.request("https://api.example.com/a").catch((e: unknown) => e);
    await vi.runAllTimersAsync();

    expect(((await result) as HttpRequestError).status).toBe(502);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("応答がなければタイムアウトで打ち切り、送り直す", async () => {
    const hang = () =>
      new Promise<Response>(() => {
        // 応答しない
      });
    const fetchMock = vi.fn((_url: string, init?: RequestInit) =>
      Promise.race([
        hang(),
        new Promise<Response>((_, reject) =>
          init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))),
        ),
      ]),
    );
    const client = createHttpClient({
      budget: new CallBudget(),
      timeoutMs: 5000,
      maxRetries: 1,
      fetch: fetchMock as unknown as typeof fetch,
    });

    const result = client.request("https://api.example.com/a").catch((e: unknown) => e);
    await vi.runAllTimersAsync();

    expect(((await result) as Error).message).toContain("5000ms で応答がなかった");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("通信そのものの失敗も送り直す", async () => {
    const { fetch } = scriptedFetch([
      () => {
        throw new TypeError("network down");
      },
      ok,
    ]);
    const client = createHttpClient({ budget: new CallBudget(), fetch });

    const result = client.request("https://api.example.com/a");
    await vi.runAllTimersAsync();

    expect((await result).ok).toBe(true);
  });

  it("呼び出し回数の上限は、記録用に残す回数を除いて数え、リトライも1回と数える", async () => {
    const budget = new CallBudget(5);
    const { fetch } = scriptedFetch([() => new Response("", { status: 500 }), ok, ok, ok, ok]);
    const external = createHttpClient({ budget, keepCalls: 2, fetch });
    const bookkeeping = createHttpClient({ budget, fetch });

    const first = external.request("https://api.example.com/a");
    await vi.runAllTimersAsync();
    await first;
    // 500 → 成功 で2回使い、残り3回。外部用はあと1回だけ
    await external.request("https://api.example.com/b");
    await expect(external.request("https://api.example.com/c")).rejects.toBeInstanceOf(CallBudgetExceededError);
    // 記録用の2回は残っている
    await bookkeeping.request("https://db.example.com/x");
    await bookkeeping.request("https://db.example.com/y");
    expect(budget.remaining).toBe(0);
  });
});
