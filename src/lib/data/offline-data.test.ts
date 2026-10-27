import { afterEach, describe, expect, it, vi } from "vitest";
import { FakeCacheStorage } from "@/test/fake-cache-storage";
import { DATA_CACHE_NAME, fetchRpcWithOfflineCopy, offlineCopyGeneratedAt, offlineNoticeText, reportLoaded, subscribeOfflineCopy } from "./offline-data";

const config = { url: "https://example.supabase.co", publishableKey: "sb_publishable_test" };
const noSleep = () => Promise.resolve();
const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchRpcWithOfflineCopy", () => {
  it("つながっていれば最新を読み、端末に残す", async () => {
    const storage = new FakeCacheStorage();
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(ok({ generated_at: "2026-10-27T03:00:00Z" }));
    await expect(fetchRpcWithOfflineCopy(config, "screen_data", { fetch: fetchImpl, caches: storage.asCacheStorage() })).resolves.toEqual({
      raw: { generated_at: "2026-10-27T03:00:00Z" },
      offline: false,
    });
    const saved = await (await storage.open(DATA_CACHE_NAME)).match("https://example.supabase.co/rest/v1/rpc/screen_data");
    expect(await saved?.json()).toEqual({ generated_at: "2026-10-27T03:00:00Z" });
  });

  it("圏外のときは、前に残した応答を返す", async () => {
    const storage = new FakeCacheStorage();
    const online = vi.fn<typeof fetch>().mockResolvedValue(ok({ day: 1 }));
    await fetchRpcWithOfflineCopy(config, "map_data", { fetch: online, caches: storage.asCacheStorage() });

    const offline = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(fetchRpcWithOfflineCopy(config, "map_data", { fetch: offline, caches: storage.asCacheStorage(), sleep: noSleep })).resolves.toEqual({
      raw: { day: 1 },
      offline: true,
    });
  });

  it("つながっていれば、残した応答より新しいものを使う", async () => {
    const storage = new FakeCacheStorage();
    await fetchRpcWithOfflineCopy(config, "screen_data", { fetch: vi.fn<typeof fetch>().mockResolvedValue(ok({ day: 1 })), caches: storage.asCacheStorage() });
    const result = await fetchRpcWithOfflineCopy(config, "screen_data", {
      fetch: vi.fn<typeof fetch>().mockResolvedValue(ok({ day: 2 })),
      caches: storage.asCacheStorage(),
    });
    expect(result).toEqual({ raw: { day: 2 }, offline: false });
  });

  it("圏外で、残した応答もなければ通信のエラーを返す", async () => {
    const offline = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(
      fetchRpcWithOfflineCopy(config, "screen_data", { fetch: offline, caches: new FakeCacheStorage().asCacheStorage(), sleep: noSleep }),
    ).rejects.toMatchObject({ name: "ScreenDataError", kind: "network" });
  });

  it("4xx は残した応答で隠さない（キーの誤りなどは直さないと読めないため）", async () => {
    const storage = new FakeCacheStorage();
    await fetchRpcWithOfflineCopy(config, "screen_data", { fetch: vi.fn<typeof fetch>().mockResolvedValue(ok({ day: 1 })), caches: storage.asCacheStorage() });
    const unauthorized = vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status: 401 }));
    await expect(fetchRpcWithOfflineCopy(config, "screen_data", { fetch: unauthorized, caches: storage.asCacheStorage() })).rejects.toMatchObject({
      status: 401,
    });
  });

  it("端末に残せなくても、読んだデータはそのまま返す", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const broken = { open: () => Promise.reject(new DOMException("quota", "QuotaExceededError")) } as unknown as CacheStorage;
    await expect(fetchRpcWithOfflineCopy(config, "screen_data", { fetch: vi.fn<typeof fetch>().mockResolvedValue(ok({ day: 1 })), caches: broken })).resolves.toEqual({
      raw: { day: 1 },
      offline: false,
    });
    expect(warn).toHaveBeenCalledOnce();
  });

  it("Cache API が使えないときは、ふつうに読むだけにする", async () => {
    await expect(
      fetchRpcWithOfflineCopy(config, "screen_data", { fetch: vi.fn<typeof fetch>().mockResolvedValue(ok({ day: 1 })), caches: null }),
    ).resolves.toEqual({ raw: { day: 1 }, offline: false });
  });
});

describe("オフライン表示の状態と文言", () => {
  it("端末のデータを出しているあいだだけ日付を持ち、画面と地図で違えば古いほうを出す", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeOfflineCopy(listener);
    reportLoaded("screen_data", "2026-10-27T03:00:00Z", true);
    reportLoaded("map_data", "2026-10-25T03:00:00Z", true);
    expect(offlineCopyGeneratedAt()).toBe("2026-10-25T03:00:00Z");
    reportLoaded("map_data", "2026-10-27T03:00:00Z", false);
    expect(offlineCopyGeneratedAt()).toBe("2026-10-27T03:00:00Z");
    reportLoaded("screen_data", "2026-10-27T03:00:00Z", false);
    expect(offlineCopyGeneratedAt()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(4);
    unsubscribe();
  });

  it("日付は日本時間で出す", () => {
    // 日本時間では 10月28日の 0時30分
    expect(offlineNoticeText("2026-10-27T15:30:00Z")).toBe("オフライン表示中・データは10月28日時点");
  });
});
