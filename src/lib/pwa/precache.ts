// Service Worker（024）が入れるときに端末に残すファイルの一覧と、sw.js の組み立て。scripts/build-sw.mjs とテストが使う。
// 残すのは、画面（HTML と、画面の移動で読む .txt）・JS と CSS・ドット絵・アイコン・地図の部品。
// _next/static/media（フォントの分割ファイル約120個と、MapLibre の使わない写し）は大きいので先に残さず、使ったときに残す（service-worker.js）
export function precacheUrl(file: string): string | null {
  if (file === "sw.js" || file === "404.html") return null;
  if (file.startsWith("_next/static/media/")) return null;
  if (file === "index.html") return "/";
  // 静的書き出しの karte.html は /karte で配る（Cloudflare の静的アセットの既定）。.html を付けると /karte に転送される
  if (file.endsWith(".html")) return `/${file.slice(0, -".html".length)}`;
  return `/${file}`;
}

export function precacheUrls(files: readonly string[]): string[] {
  return files
    .map(precacheUrl)
    .filter((url): url is string => url !== null)
    .sort();
}

// テンプレート（src/lib/pwa/service-worker.js）の先頭に、版と一覧を書き足す
export function serviceWorkerSource(template: string, version: string, urls: readonly string[]): string {
  if (!/^[0-9a-f]{8,}$/.test(version)) throw new Error(`版は16進数で書いてください: ${version}`);
  return `// npm run build のあと scripts/build-sw.mjs が書いたもの。手で直さない（元は src/lib/pwa/service-worker.js）\nconst VERSION = "${version}";\nconst PRECACHE = ${JSON.stringify(urls)};\n\n${template}`;
}
