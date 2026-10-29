// 生成AIで作った絵（assets/illust/）から、画面用の WebP を public/illust/ に書き出す（チケット 028）。
// 使い方：npm run illust（元の画像を差しかえたら流し直す）
//   - 背景・選択肢の絵は、一覧（src/lib/illust/assets.ts）の横幅ごとに縮める
//   - キャラクターのシートは、人と人のあいだの透明な列で1人ずつに切り分け、全員同じ倍率で縮める
//   - 家は少し透けているところを不透明にそろえ、透明なふちを切り落としてから縮める
//   - 切り出した人物と家の大きさを src/lib/illust/sprites.ts に書く（画面で並べる位置の計算に使う）
//   - 一覧にない古い WebP は消す
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { HOUSE_SOURCES, HOUSE_WIDTHS, ILLUST_DIR, ILLUST_PICTURES, SPRITE_SCALE, SPRITE_SOURCES } from "../src/lib/illust/assets.ts";

const root = join(import.meta.dirname, "..");
const sourceDir = join(root, "assets/illust");
const outDir = join(root, "public", ILLUST_DIR);
mkdirSync(outDir, { recursive: true });

// 半透明のふちは「人がいる」とみなさない（シートの隙間にうっすら残るにじみを拾わないため）
const ALPHA_THRESHOLD = 16;
// これより狭い列のかたまりは、にじみとして捨てる
const MIN_FIGURE_WIDTH = 40;
// 腕と体のあいだなど、人の中の細い隙間はつなげる
const MAX_GAP_INSIDE_FIGURE = 12;
const WEBP_QUALITY = 82;
// 家の絵で、これより濃いところは家そのもの（透明度 250 前後で、ほんの少し透けている）として不透明にする。
// これより薄いところは輪郭のにじみなので、そのまま残す
const HOUSE_OPAQUE_ALPHA = 224;

const written = new Set();

for (const [id, picture] of Object.entries(ILLUST_PICTURES)) {
  const source = sharp(join(sourceDir, picture.source));
  const { width, height } = await source.metadata();
  if (width !== picture.width || height !== picture.height) {
    throw new Error(`${picture.source} の大きさが一覧（${picture.width}×${picture.height}）と違います: ${width}×${height}`);
  }
  for (const outWidth of picture.widths) {
    const file = `${id}-${outWidth}.webp`;
    const info = await source.clone().resize({ width: outWidth }).webp({ quality: WEBP_QUALITY }).toFile(join(outDir, file));
    written.add(file);
    console.log(`書き出し：public/${ILLUST_DIR}/${file}（${info.width}×${info.height}、${Math.round(info.size / 1024)}KB）`);
  }
}

// シートの列ごとに「人がいるか」を見て、左から順に人の左右の端を返す
function figureColumns(data, width, height, channels) {
  const filled = [];
  for (let x = 0; x < width; x++) {
    let found = false;
    for (let y = 0; y < height && !found; y++) found = data[(y * width + x) * channels + 3] > ALPHA_THRESHOLD;
    filled.push(found);
  }
  const runs = [];
  for (let x = 0; x < width; x++) {
    if (!filled[x]) continue;
    const last = runs.at(-1);
    if (last && x - last.right <= MAX_GAP_INSIDE_FIGURE) last.right = x;
    else runs.push({ left: x, right: x });
  }
  return runs.filter((run) => run.right - run.left + 1 >= MIN_FIGURE_WIDTH);
}

function figureRows(data, width, channels, left, right, height) {
  let top = height;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = left; x <= right; x++) {
      if (data[(y * width + x) * channels + 3] > ALPHA_THRESHOLD) {
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
        break;
      }
    }
  }
  return { top, bottom };
}

const sheets = new Map();
async function figuresOf(sheet) {
  if (!sheets.has(sheet)) {
    const { data, info } = await sharp(join(sourceDir, sheet)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const columns = figureColumns(data, info.width, info.height, info.channels);
    const figures = columns.map(({ left, right }) => ({ left, right, ...figureRows(data, info.width, info.channels, left, right, info.height) }));
    sheets.set(sheet, figures);
  }
  return sheets.get(sheet);
}

const sizes = {};
for (const [id, { sheet, index }] of Object.entries(SPRITE_SOURCES)) {
  const figures = await figuresOf(sheet);
  const figure = figures[index];
  if (!figure) throw new Error(`${sheet} に左から${index + 1}人目がいません（${figures.length}人）`);
  const cropWidth = figure.right - figure.left + 1;
  const cropHeight = figure.bottom - figure.top + 1;
  const outWidth = Math.round(cropWidth * SPRITE_SCALE);
  const outHeight = Math.round(cropHeight * SPRITE_SCALE);
  const file = `person-${id}.webp`;
  const info = await sharp(join(sourceDir, sheet))
    .extract({ left: figure.left, top: figure.top, width: cropWidth, height: cropHeight })
    .resize({ width: outWidth, height: outHeight })
    .webp({ quality: WEBP_QUALITY, alphaQuality: 100 })
    .toFile(join(outDir, file));
  written.add(file);
  sizes[id] = { width: outWidth, height: outHeight };
  console.log(`書き出し：public/${ILLUST_DIR}/${file}（${outWidth}×${outHeight}、${Math.round(info.size / 1024)}KB）`);
}

// 家：濃いところを不透明にし、透明なふちを切り落とす。大きさは縦横の比を画面で使うため、切り落とした元の大きさを残す
const houseSizes = {};
for (const [housing, { source }] of Object.entries(HOUSE_SOURCES)) {
  const { data, info } = await sharp(join(sourceDir, source)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width;
  let right = -1;
  let top = info.height;
  let bottom = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const alpha = (y * info.width + x) * info.channels + 3;
      if (data[alpha] >= HOUSE_OPAQUE_ALPHA) data[alpha] = 255;
      if (data[alpha] > ALPHA_THRESHOLD) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  }
  if (right < 0) throw new Error(`${source} に家が見つかりません（全部透明）`);
  const cropWidth = right - left + 1;
  const cropHeight = bottom - top + 1;
  const cropped = sharp(data, { raw: info }).extract({ left, top, width: cropWidth, height: cropHeight });
  for (const outWidth of HOUSE_WIDTHS) {
    const file = `house-${housing}-${outWidth}.webp`;
    const out = await cropped.clone().resize({ width: outWidth }).webp({ quality: WEBP_QUALITY, alphaQuality: 100 }).toFile(join(outDir, file));
    written.add(file);
    console.log(`書き出し：public/${ILLUST_DIR}/${file}（${out.width}×${out.height}、${Math.round(out.size / 1024)}KB）`);
  }
  houseSizes[housing] = { width: cropWidth, height: cropHeight };
}

const spriteLines = Object.entries(sizes).map(([id, { width, height }]) => `  "${id}": { width: ${width}, height: ${height} },`);
writeFileSync(
  join(root, "src/lib/illust/sprites.ts"),
  `// npm run illust（scripts/build-illust.mjs）が書くファイル。手で直さない。
// 切り出した人物の WebP の大きさ（px）。画面で家族を並べる位置の計算に使う
import type { Housing } from "../conditions/labels.ts";
import type { SpriteId } from "./assets.ts";

export const SPRITE_SIZES: Record<SpriteId, { width: number; height: number }> = {
${spriteLines.join("\n")}
};

// ふちを切り落とした家の大きさ（元の画像の px）。縦横の比を画面で使う
export const HOUSE_SIZES: Record<Housing, { width: number; height: number }> = {
${Object.entries(houseSizes).map(([housing, { width, height }]) => `  ${housing}: { width: ${width}, height: ${height} },`).join("\n")}
};
`,
);
console.log("書き出し：src/lib/illust/sprites.ts");

for (const file of readdirSync(outDir)) {
  if (!written.has(file)) {
    rmSync(join(outDir, file));
    console.log(`削除：public/${ILLUST_DIR}/${file}（一覧にない）`);
  }
}
