// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createTownResolver } from "../../../src/lib/town-district/resolve";
import { CallBudget, createHttpClient } from "./http";
import type { JobContext } from "./job";
import { busFeeds } from "./jobs/bus-feeds";
import type { SupabaseRest } from "./supabase";
import { toJstDate } from "./time";
import { UnmappedTownCollector } from "./towns";

// 2026-10-23（金）03:00 JST
const TODAY = toJstDate(Date.parse("2026-10-22T18:00:00Z"));

type Stored = { feed_id: string; organization_id: string; file_uid: string; valid_to: string };
type Remote = { uid: string; license?: string; discontinued?: boolean };

const stored = (feedId: string, validTo = "2027-03-31"): Stored => ({
  feed_id: feedId,
  organization_id: "minamishinshu",
  file_uid: `${feedId}-v1`,
  valid_to: validTo,
});

// GTFS データリポジトリと Supabase の代わり
function fakeWorld(feeds: Stored[], remote: Record<string, Remote>) {
  const requested: string[] = [];
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input));
    requested.push(url.pathname);
    const feedId = url.pathname.split("/").at(-1)!;
    const feed = remote[feedId];
    if (!feed) return new Response("{}", { status: 404 });
    return new Response(
      JSON.stringify({
        body: {
          feed_license: feed.license ?? "CC BY 4.0",
          is_discontinued: feed.discontinued ?? false,
          gtfs_files: [
            { rid: "current", gtfs_file_uid: feed.uid, from_date: "2027-04-01", to_date: "2028-03-31" },
            { rid: "prev_1", gtfs_file_uid: "old", from_date: "2025-04-01", to_date: "2026-03-31" },
          ],
        },
      }),
      { status: 200 },
    );
  });
  const selects: string[] = [];
  const db: SupabaseRest = {
    async select<T>(table: string, query: string) {
      selects.push(`${table}?${query}`);
      return feeds as T[];
    },
    insert: async () => [],
    update: async () => [],
    rpc: async () => {
      throw new Error("rpc は呼ばない");
    },
  };
  const context: JobContext = {
    env: { SUPABASE_URL: "https://db.example.com", SUPABASE_SERVICE_ROLE_KEY: "service-key" },
    today: TODAY,
    external: createHttpClient({ budget: new CallBudget(), maxRetries: 0, fetch: fetchMock as unknown as typeof fetch }),
    db,
    townResolver: async () => createTownResolver([]),
    unmappedTowns: new UnmappedTownCollector(),
    previousProgress: async () => null,
  };
  return { context, requested, selects };
}

describe("bus_feeds", () => {
  it("取り込んだ版が今の版と同じなら、何もせずに成功する（フィードごとに1回ずつ問い合わせる）", async () => {
    const world = fakeWorld([stored("A"), stored("B")], { A: { uid: "A-v1" }, B: { uid: "B-v1" } });
    await expect(busFeeds.run(world.context)).resolves.toEqual({ rowsWritten: 0 });
    expect(world.requested).toEqual(["/v2/organizations/minamishinshu/feeds/A", "/v2/organizations/minamishinshu/feeds/B"]);
    expect(world.selects).toEqual(["gtfs_feeds?select=feed_id,organization_id,file_uid,valid_to&source_id=eq.gtfs_minamishinshu_bus&order=feed_id"]);
  });

  it("新しい版が出たら、取り直しの手順を添えて失敗にする（runner が通知する）", async () => {
    const world = fakeWorld([stored("A"), stored("B")], { A: { uid: "A-v1" }, B: { uid: "B-v2" } });
    await expect(busFeeds.run(world.context)).rejects.toThrow(/B に新しい版が出た（2027-04-01〜2028-03-31）.*npm run bus:sql/);
  });

  it("ライセンスが変わった・配布が終わったときも知らせる", async () => {
    const world = fakeWorld([stored("A"), stored("B")], { A: { uid: "A-v1", license: "カスタムライセンス" }, B: { uid: "B-v1", discontinued: true } });
    await expect(busFeeds.run(world.context)).rejects.toThrow(/A のライセンスが変わった（カスタムライセンス）.*B の配布が終わった/);
  });

  it("有効期間の終わりが30日以内に近づいたとき・切れたときに知らせる", async () => {
    const soon = fakeWorld([stored("A", "2026-11-22")], { A: { uid: "A-v1" } });
    await expect(busFeeds.run(soon.context)).rejects.toThrow("あと30日");
    const later = fakeWorld([stored("A", "2026-11-23")], { A: { uid: "A-v1" } });
    await expect(busFeeds.run(later.context)).resolves.toEqual({ rowsWritten: 0 });
    const expired = fakeWorld([stored("A", "2026-10-22")], { A: { uid: "A-v1" } });
    await expect(busFeeds.run(expired.context)).rejects.toThrow("切れた");
  });

  it("まだ取り込んでいない・リポジトリの応答がおかしいときは失敗にする", async () => {
    await expect(busFeeds.run(fakeWorld([], {}).context)).rejects.toThrow("gtfs_feeds が空");
    await expect(busFeeds.run(fakeWorld([stored("A")], {}).context)).rejects.toThrow("404");
  });
});
