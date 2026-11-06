// 画面の部品を端末に残す Service Worker（024・要件 8.2）。scripts/build-sw.mjs が先頭に VERSION（版）と PRECACHE（残すファイル）を書き足して out/sw.js にする。
//
// - 画面の部品・ドット絵：端末に残したものを先に使う（キャッシュ優先）。版ごとに入れ物を分け、新しい版は入れ終わってから
//   画面がすべて閉じられたあと（次に開いたとき）に入れ替わる。勝手に skipWaiting はしない（開いている画面の部品と混ざらないように）。
//   画面で「更新する」が押されたときだけ入れ替え、画面はすぐ読み直す（030。src/lib/pwa/update.ts）
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

// 「更新する」が押されたら待たずに入れ替える。値は src/lib/pwa/update.ts の SKIP_WAITING_MESSAGE と同じ
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // ほかのサイト（Supabase・地理院タイル）は扱わない
  if (url.origin !== self.location.origin || url.pathname === "/sw.js") return;
  event.respondWith(respond(request, url));
});

function isCachedOnUse(pathname) {
  return pathname.startsWith("/_next/static/") || pathname.startsWith("/illust/");
}

async function respond(request, url) {
  const cache = await caches.open(STATIC_CACHE);
  // 画面は条件の URL パラメータ（F-02）、画面の移動で読む .txt は ?_rsc= が付くので、パラメータを除いて探す
  const ignoreSearch = request.mode === "navigate" || url.pathname.endsWith(".txt");
  const cached = await cache.match(request, { ignoreSearch, ignoreVary: true });
  if (cached) return cached;
  try {
    const response = await fetch(request);
    // フォント・生成AIの絵など、先に残さなかった部品は使ったときに残す（フォントはファイル名に中身の印が付いている。
    // 絵は名前が同じでも、差しかえると版が変わり、古い版の入れ物ごと消えるので、版の中では変わらない）
    if (response.ok && isCachedOnUse(url.pathname)) await cache.put(request, response.clone());
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
