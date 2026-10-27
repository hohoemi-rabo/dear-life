// 画面の部品を端末に残す Service Worker（024・要件 8.2）。scripts/build-sw.mjs が先頭に VERSION（版）と PRECACHE（残すファイル）を書き足して out/sw.js にする。
//
// - 画面の部品・ドット絵：端末に残したものを先に使う（キャッシュ優先）。版ごとに入れ物を分け、新しい版は入れ終わってから
//   画面がすべて閉じられたあと（次に開いたとき）に入れ替わる。skipWaiting はしない（開いている画面の部品と混ざらないように）
// - Supabase の応答：ここでは扱わない。画面の側（src/lib/data/offline-data.ts）がネットワーク優先で読み、"dearlife-data" に残す。
//   版の入れ替えで消すのは STATIC_PREFIX の付いた入れ物だけなので、データは残る
// - 地図の背景（地理院タイル）：端末に残さない。圏外では出ないことを地図の画面に書いてある
// - プッシュ通知・裏での同期はしない
/* global VERSION, PRECACHE */
const STATIC_PREFIX = "dearlife-static-";
const STATIC_CACHE = `${STATIC_PREFIX}${VERSION}`;

self.addEventListener("install", (event) => {
  event.waitUntil(precache());
});

// 1つでも取れなければ入れるのをやめる（部品が欠けた版で圏外表示をしないため）。次に開いたときにやり直す
async function precache() {
  const cache = await caches.open(STATIC_CACHE);
  await Promise.all(
    PRECACHE.map(async (url) => {
      const response = await fetch(url, { cache: "reload" });
      if (!response.ok) throw new Error(`${url} を取れませんでした（HTTP ${response.status}）`);
      await cache.put(url, response);
    }),
  );
}

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name.startsWith(STATIC_PREFIX) && name !== STATIC_CACHE).map((name) => caches.delete(name)));
      // はじめて入れたときも、開いている画面をすぐ受け持つ（そのまま圏外になっても画面を移れるように）
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // ほかのサイト（Supabase・地理院タイル）は扱わない
  if (url.origin !== self.location.origin || url.pathname === "/sw.js") return;
  event.respondWith(respond(request, url));
});

async function respond(request, url) {
  const cache = await caches.open(STATIC_CACHE);
  // 画面は条件の URL パラメータ（F-02）、画面の移動で読む .txt は ?_rsc= が付くので、パラメータを除いて探す
  const ignoreSearch = request.mode === "navigate" || url.pathname.endsWith(".txt");
  const cached = await cache.match(request, { ignoreSearch, ignoreVary: true });
  if (cached) return cached;
  try {
    const response = await fetch(request);
    // フォントなど、先に残さなかった部品は使ったときに残す（ファイル名に中身の印が付いているので、版の中では変わらない）
    if (response.ok && url.pathname.startsWith("/_next/static/")) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    // 残していない画面を圏外で開いたときは入口を出す（前に見た画面へ戻るボタンがある）
    if (request.mode === "navigate") {
      const home = await cache.match("/");
      if (home) return home;
    }
    throw error;
  }
}
