// 静的書き出し（out/）から Service Worker（out/sw.js）を作る（チケット 024）。npm run build のあとに自動で動く（postbuild）。
// 版は out/ の中身から決めるので、中身が変わらなければ版も変わらず、利用者の端末の部品も入れ替わらない
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { precacheUrl, precacheUrls, serviceWorkerSource } from "../src/lib/pwa/precache.ts";

const root = join(import.meta.dirname, "..");
const outDir = join(root, "out");

function listFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(path) : [relative(outDir, path).split(sep).join("/")];
  });
}

const files = listFiles(outDir)
  .filter((file) => file !== "sw.js")
  .sort();
const hash = createHash("sha256");
for (const file of files) {
  hash.update(file);
  hash.update(readFileSync(join(outDir, file)));
}
const version = hash.digest("hex").slice(0, 16);

const urls = precacheUrls(files);
const template = readFileSync(join(root, "src/lib/pwa/service-worker.js"), "utf8");
writeFileSync(join(outDir, "sw.js"), serviceWorkerSource(template, version, urls));

const bytes = files.filter((file) => precacheUrl(file) !== null).reduce((sum, file) => sum + statSync(join(outDir, file)).size, 0);
console.log(`out/sw.js を書きました（版 ${version}・先に残すファイル ${urls.length} 個・${(bytes / 1024 / 1024).toFixed(1)} MB）`);
