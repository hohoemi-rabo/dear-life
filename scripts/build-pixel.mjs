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
import { placeInSlot } from "../src/lib/pixel/scenes.ts";

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

// 確認用の場面。実際の組み合わせは場面のひな形（017）が決める
const previewScenes = {
  "spring-children": [["bg-spring", "full"], ["landmark-chushin", "landmark"], ["event-festival", "fieldLeft"], ["facility-school", "fieldRight"], ["family-a2-c1", "family"]],
  "spring-no-children": [["bg-spring", "full"], ["landmark-kanae", "landmark"], ["facility-nursery", "fieldLeft"], ["facility-public", "fieldRight"], ["family-a2-c0", "family"]],
  "summer-rain": [["bg-summer", "full"], ["landmark-kamisato", "landmark"], ["facility-shelter", "fieldRight"], ["family-a2-c3", "family"], ["overlay-rain", "full"]],
  "autumn-events": [["bg-autumn", "full"], ["landmark-igara", "landmark"], ["event-sports", "fieldLeft"], ["event-culture", "fieldRight"], ["family-a1-c2", "family"]],
  "autumn-other": [["bg-autumn", "full"], ["event-other", "fieldLeft"], ["family-a1-c0", "family"]],
  "winter-car": [["bg-winter", "full"], ["landmark-chushin-winter", "landmark"], ["family-a2-c2", "family"], ["vehicle-car", "roadRight"]],
  "winter-no-car": [["bg-winter", "full"], ["landmark-kamisato-winter", "landmark"], ["vehicle-train", "fieldRight"], ["family-a2-c3", "family"], ["vehicle-bus", "roadRight"]],
};
for (const [name, parts] of Object.entries(previewScenes)) {
  const layers = parts.map(([asset, slot]) => placeInSlot(asset, slot));
  writeFileSync(join(previewDir, `scene-${name}.png`), encodePng(composeScene(layers, DRAW), 4));
}
console.log(`確認用：.pixel-preview/ に部品（8倍）と場面${Object.keys(previewScenes).length}枚（4倍）`);
