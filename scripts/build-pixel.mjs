// ドット絵を描いて public/pixel/<id>.png に書き出す（チケット 013）。
// 使い方：npm run pixel
//   - 一覧（src/lib/pixel/assets.ts）にない古い PNG は消す
//   - 確認用に、場面を重ねて8倍にした PNG を .pixel-preview/ に書く（公開しない・コミットしない）
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DRAW } from "../src/lib/pixel/art/index.ts";
import { PIXEL_ASSETS } from "../src/lib/pixel/assets.ts";
import { composeScene } from "../src/lib/pixel/compose.ts";
import { encodePng } from "../src/lib/pixel/png.ts";
import { PROTOTYPE_SPRING_SCENE } from "../src/lib/pixel/scenes.ts";

const root = join(import.meta.dirname, "..");
const outDir = join(root, "public/pixel");
const previewDir = join(root, ".pixel-preview");
mkdirSync(outDir, { recursive: true });
mkdirSync(previewDir, { recursive: true });

const ids = Object.keys(PIXEL_ASSETS);
for (const id of ids) {
  const canvas = DRAW[id]();
  const { width, height } = PIXEL_ASSETS[id];
  if (canvas.width !== width || canvas.height !== height) {
    throw new Error(`${id} の大きさが一覧（${width}×${height}）と違います: ${canvas.width}×${canvas.height}`);
  }
  writeFileSync(join(outDir, `${id}.png`), encodePng(canvas));
  writeFileSync(join(previewDir, `${id}.png`), encodePng(canvas, 8));
  console.log(`書き出し：public/pixel/${id}.png（${width}×${height}）`);
}

for (const file of readdirSync(outDir)) {
  if (file.endsWith(".png") && !ids.includes(file.slice(0, -4))) {
    rmSync(join(outDir, file));
    console.log(`削除：public/pixel/${file}（一覧にない）`);
  }
}

writeFileSync(join(previewDir, "scene-spring-prototype.png"), encodePng(composeScene(PROTOTYPE_SPRING_SCENE, DRAW), 4));
console.log("確認用：.pixel-preview/scene-spring-prototype.png（4倍）");
