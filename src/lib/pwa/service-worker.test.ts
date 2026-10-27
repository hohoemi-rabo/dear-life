import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { FAKE_ORIGIN, FakeCacheStorage } from "@/test/fake-cache-storage";
import { DATA_CACHE_NAME } from "@/lib/data/offline-data";
import { precacheUrls, serviceWorkerSource } from "./precache";

const template = readFileSync(join(import.meta.dirname, "service-worker.js"), "utf8");

describe("precacheUrls", () => {
  it("画面は .html を除いた URL にし、フォントなどの media と 404・sw.js は先に残さない", () => {
    expect(
      precacheUrls([
        "index.html",
        "karte.html",
        "karte.txt",
        "404.html",
        "sw.js",
        "manifest.webmanifest",
        "icons/icon-192.png",
        "pixel/bg-winter.png",
        "_next/static/chunks/a.js",
        "_next/static/media/font.woff2",
        "maplibre/maplibre-gl-worker.mjs",
      ]),
    ).toEqual([
      "/",
      "/_next/static/chunks/a.js",
      "/icons/icon-192.png",
      "/karte",
      "/karte.txt",
      "/manifest.webmanifest",
      "/maplibre/maplibre-gl-worker.mjs",
      "/pixel/bg-winter.png",
    ]);
  });

  it("版は16進数だけを受け付ける（sw.js にそのまま書くため）", () => {
    expect(() => serviceWorkerSource(template, '1"; alert(1); "', [])).toThrow("16進数");
  });
});

type Handler = (event: Record<string, unknown>) => void;
type FakeRequest = { url: string; method: string; mode: string };

// sw.js を、偽の self・caches・fetch の上で動かす
function startWorker(version: string, urls: string[], network: (url: string) => Promise<Response>, storage = new FakeCacheStorage()) {
  const handlers: Record<string, Handler> = {};
  const self = {
    addEventListener: (type: string, handler: Handler) => (handlers[type] = handler),
    location: new URL(FAKE_ORIGIN),
    clients: { claim: vi.fn(() => Promise.resolve()) },
  };
  const fetchMock = vi.fn((input: string | FakeRequest) => network(typeof input === "string" ? new URL(input, FAKE_ORIGIN).href : input.url));
  new Function("self", "caches", "fetch", serviceWorkerSource(template, version, urls))(self, storage, fetchMock);

  const run = (type: string, fields: Record<string, unknown> = {}) => {
    let waited: Promise<unknown> | undefined;
    handlers[type]({ ...fields, waitUntil: (p: Promise<unknown>) => (waited = p), respondWith: (p: Promise<unknown>) => (waited = p) });
    return waited;
  };
  const request = (path: string, mode = "cors"): FakeRequest => ({ url: new URL(path, FAKE_ORIGIN).href, method: "GET", mode });
  return {
    storage,
    self,
    fetchMock,
    install: () => run("install"),
    activate: () => run("activate"),
    fetch: (path: string, mode?: string) => run("fetch", { request: request(path, mode) }) as Promise<Response> | undefined,
  };
}

const page = (body: string) => () => Promise.resolve(new Response(body, { status: 200 }));
const siteNetwork = (url: string): Promise<Response> => {
  const path = new URL(url).pathname;
  return path === "/missing" ? Promise.resolve(new Response("", { status: 404 })) : page(`network:${path}`)();
};
const offline = () => Promise.reject(new TypeError("Failed to fetch"));

describe("Service Worker", () => {
  it("入れるときに一覧のファイルをすべて端末に残す", async () => {
    const worker = startWorker("aaaa0000", ["/", "/karte", "/pixel/bg-winter.png"], siteNetwork);
    await worker.install();
    const cache = await worker.storage.open("dearlife-static-aaaa0000");
    expect([...cache.entries.keys()]).toEqual([`${FAKE_ORIGIN}/`, `${FAKE_ORIGIN}/karte`, `${FAKE_ORIGIN}/pixel/bg-winter.png`]);
  });

  it("1つでも取れなければ入れない（欠けた版で圏外表示をしない）", async () => {
    const worker = startWorker("aaaa0000", ["/", "/missing"], siteNetwork);
    await expect(worker.install()).rejects.toThrow("/missing");
  });

  it("新しい版に入れ替わったら古い版の部品を消し、データは残す", async () => {
    const storage = new FakeCacheStorage();
    await storage.open("dearlife-static-0001d000");
    await storage.open(DATA_CACHE_NAME);
    const worker = startWorker("bbbb1111", ["/"], siteNetwork, storage);
    await worker.install();
    await worker.activate();
    expect(await storage.keys()).toEqual([DATA_CACHE_NAME, "dearlife-static-bbbb1111"]);
    expect(worker.self.clients.claim).toHaveBeenCalled();
  });

  it("圏外でも、条件の付いた画面と画面の移動の .txt を端末から出す", async () => {
    let network = siteNetwork;
    const worker = startWorker("aaaa0000", ["/karte", "/karte.txt"], (url) => network(url));
    await worker.install();
    network = offline;
    expect(await (await worker.fetch("/karte?d=kanae&a=2", "navigate"))?.text()).toBe("network:/karte");
    expect(await (await worker.fetch("/karte.txt?_rsc=abc"))?.text()).toBe("network:/karte.txt");
  });

  it("先に残さなかった部品（フォントなど）は使ったときに残し、次は圏外でも出す", async () => {
    let network = siteNetwork;
    const worker = startWorker("aaaa0000", [], (url) => network(url));
    await worker.install();
    expect(await (await worker.fetch("/_next/static/media/a.woff2"))?.text()).toBe("network:/_next/static/media/a.woff2");
    network = offline;
    expect(await (await worker.fetch("/_next/static/media/a.woff2"))?.text()).toBe("network:/_next/static/media/a.woff2");
  });

  it("残していない画面を圏外で開いたら入口を出す", async () => {
    let network = siteNetwork;
    const worker = startWorker("aaaa0000", ["/"], (url) => network(url));
    await worker.install();
    network = offline;
    expect(await (await worker.fetch("/somewhere", "navigate"))?.text()).toBe("network:/");
  });

  it("ほかのサイト（Supabase・地図のタイル）は扱わない", async () => {
    const worker = startWorker("aaaa0000", [], siteNetwork);
    expect(worker.fetch("https://example.supabase.co/rest/v1/rpc/screen_data")).toBeUndefined();
    expect(worker.fetch("https://cyberjapandata.gsi.go.jp/xyz/std/10/1/1.png")).toBeUndefined();
  });
});
