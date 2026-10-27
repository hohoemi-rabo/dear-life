// MapLibre の worker を public/maplibre/ に写す（021）。
// Turbopack は MapLibre の worker を書き出すときに、worker が読む maplibre-gl-shared.mjs を一緒に出さないので、
// MapLibre の説明書（Next.js・Turbopack）の手順どおり、2つとも静的ファイルとして配信する。dev・build の前に自動で動く
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const dist = path.join(path.dirname(createRequire(import.meta.url).resolve("maplibre-gl/package.json")), "dist");
const dest = path.join(process.cwd(), "public", "maplibre");

mkdirSync(dest, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(path.join(dist, file), path.join(dest, file));
}
