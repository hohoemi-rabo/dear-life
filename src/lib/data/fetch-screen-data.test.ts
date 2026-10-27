import { describe, expect, it, vi } from "vitest";
import { fetchRpc, ScreenDataError, type FetchOptions } from "./fetch-screen-data";

const config = { url: "https://example.supabase.co/", publishableKey: "sb_publishable_test" };
const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const noSleep = () => Promise.resolve();
const fetchScreenData = (target: typeof config, options: FetchOptions) => fetchRpc(target, "screen_data", options);

describe("fetchRpc", () => {
  it("publishable key を付けて screen_data を GET で呼ぶ", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(ok({ districts: [] }));
    await expect(fetchScreenData(config, { fetch: fetchImpl })).resolves.toEqual({ districts: [] });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://example.supabase.co/rest/v1/rpc/screen_data");
    expect(init?.method).toBe("GET");
    expect(init?.headers).toEqual({ apikey: "sb_publishable_test", Accept: "application/json" });
  });

  it("5xx と通信の失敗は待ってからやり直し、待ち時間は倍々にする", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(ok({ ok: true }));
    const sleep = vi.fn(noSleep);
    await expect(fetchScreenData(config, { fetch: fetchImpl, retries: 2, backoffMs: 100, sleep })).resolves.toEqual({ ok: true });
    expect(sleep.mock.calls).toEqual([[100], [200]]);
  });

  it("やり直しても失敗したら、最後のエラーを返す", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("Failed to fetch"));
    const error = await fetchScreenData(config, { fetch: fetchImpl, retries: 1, sleep: noSleep }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ScreenDataError);
    expect(error).toMatchObject({ kind: "network" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("4xx はやり直さない（キーの誤りなどは何度呼んでも同じ）", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status: 401 }));
    await expect(fetchScreenData(config, { fetch: fetchImpl, retries: 3, sleep: noSleep })).rejects.toMatchObject({
      kind: "http",
      status: 401,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("待ち時間を過ぎたら通信を打ち切り、timeout のエラーにする", async () => {
    const fetchImpl: typeof fetch = (_, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      });
    await expect(fetchScreenData(config, { fetch: fetchImpl, timeoutMs: 10, retries: 0 })).rejects.toMatchObject({ kind: "timeout" });
  });
});
