// 生成AIで作った絵（assets/illust/）から、画面用の WebP を public/illust/ に書き出す（チケット 028）。
// 使い方：npm run illust（元の画像を差しかえたら流し直す）
//   - 背景・選択肢の絵は、一覧（src/lib/illust/assets.ts）の横幅ごとに縮める（crop があるものは先に切り出す）
//   - キャラクターのシートは、人と人のあいだの透明な列で1人ずつに切り分け、全員同じ倍率で縮める（シートごとの描き方の差は scale でそろえる）
//     （人もほんの少し透けているので、家と同じく不透明にそろえる。透けると後ろの柵などが見えてしまう）
//   - 家・車・大切にしたいことの絵などの小物は少し透けているところを不透明にそろえ、透明なふちを切り落としてから縮める
//     （1枚に並んだ小物は、人物と同じく透明な列で切り分ける）
//   - 切り出した人物・家・小物の大きさを src/lib/illust/sprites.ts に書く（画面で並べる位置の計算に使う）
//   - 一覧にない古い WebP は消す
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import {
  HOUSE_SOURCES,
  HOUSE_WIDTHS,
  ILLUST_DIR,
  ILLUST_PICTURES,
  PRIORITY_ICON_INDEX,
  PRIORITY_ICON_SOURCE,
  PRIORITY_ICON_WIDTHS,
  PROP_SOURCES,
  PROP_WIDTHS,
  SPRITE_SCALE,
  SPRITE_SOURCES,
} from "../src/lib/illust/assets.ts";

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
// 人・家・小物の絵で、これより濃いところは絵そのもの（透明度 250 前後で、ほんの少し透けている）として不透明にする。
// これより薄いところは輪郭のにじみなので、そのまま残す
const HOUSE_OPAQUE_ALPHA = 224;

const written = new Set();

for (const [id, picture] of Object.entries(ILLUST_PICTURES)) {
  const source = sharp(join(sourceDir, picture.source));
  const { width, height } = await source.metadata();
  const expectedWidth = picture.sourceWidth ?? picture.width;
  const expectedHeight = picture.sourceHeight ?? picture.height;
  if (width !== expectedWidth || height !== expectedHeight) {
    throw new Error(`${picture.source} の大きさが一覧（${expectedWidth}×${expectedHeight}）と違います: ${width}×${height}`);
  }
  const shown = picture.crop
    ? source.clone().extract({ left: picture.crop.left, top: picture.crop.top, width: picture.width, height: picture.height })
    : source;
  for (const outWidth of picture.widths) {
    const file = `${id}-${outWidth}.webp`;
    const info = await shown.clone().resize({ width: outWidth }).webp({ quality: WEBP_QUALITY }).toFile(join(outDir, file));
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

// 濃いところ（人・家・小物そのもの）を不透明にする。薄いところは輪郭のにじみなので、そのまま残す
function makeOpaque(data, channels) {
  for (let alpha = channels - 1; alpha < data.length; alpha += channels) {
    if (data[alpha] >= HOUSE_OPAQUE_ALPHA) data[alpha] = 255;
  }
}

const sheets = new Map();
async function sheetOf(sheet) {
  if (!sheets.has(sheet)) {
    const { data, info } = await sharp(join(sourceDir, sheet)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    makeOpaque(data, info.channels);
    const columns = figureColumns(data, info.width, info.height, info.channels);
    const figures = columns.map(({ left, right }) => ({ left, right, ...figureRows(data, info.width, info.channels, left, right, info.height) }));
    sheets.set(sheet, { data, info, figures });
  }
  return sheets.get(sheet);
}

async function figuresOf(sheet) {
  return (await sheetOf(sheet)).figures;
}

const sizes = {};
for (const [id, { sheet, index, scale = 1 }] of Object.entries(SPRITE_SOURCES)) {
  const { data, info, figures } = await sheetOf(sheet);
  const figure = figures[index];
  if (!figure) throw new Error(`${sheet} に左から${index + 1}人目がいません（${figures.length}人）`);
  const cropWidth = figure.right - figure.left + 1;
  const cropHeight = figure.bottom - figure.top + 1;
  const outWidth = Math.round(cropWidth * SPRITE_SCALE * scale);
  const outHeight = Math.round(cropHeight * SPRITE_SCALE * scale);
  const file = `person-${id}.webp`;
  const out = await sharp(data, { raw: info })
    .extract({ left: figure.left, top: figure.top, width: cropWidth, height: cropHeight })
    .resize({ width: outWidth, height: outHeight })
    .webp({ quality: WEBP_QUALITY, alphaQuality: 100 })
    .toFile(join(outDir, file));
  written.add(file);
  sizes[id] = { width: outWidth, height: outHeight };
  console.log(`書き出し：public/${ILLUST_DIR}/${file}（${outWidth}×${outHeight}、${Math.round(out.size / 1024)}KB）`);
}

// 家・小物：濃いところを不透明にし、透明なふちを切り落とす。columns を渡すと、その列の範囲だけを見る（1枚に並んだ小物）。
// 大きさは縦横の比を画面で使うため、切り落とした元の大きさを返す
async function writeOpaqueCrop(source, columns, name, widths) {
  const { data, info } = await sharp(join(sourceDir, source)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { left: fromX, right: toX } = columns ?? { left: 0, right: info.width - 1 };
  let left = info.width;
  let right = -1;
  let top = info.height;
  let bottom = -1;
  makeOpaque(data, info.channels);
  for (let y = 0; y < info.height; y++) {
    for (let x = fromX; x <= toX; x++) {
      const alpha = (y * info.width + x) * info.channels + 3;
      if (data[alpha] > ALPHA_THRESHOLD) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  }
  if (right < 0) throw new Error(`${source} に絵が見つかりません（全部透明）`);
  const cropWidth = right - left + 1;
  const cropHeight = bottom - top + 1;
  const cropped = sharp(data, { raw: info }).extract({ left, top, width: cropWidth, height: cropHeight });
  for (const outWidth of widths) {
    const file = `${name}-${outWidth}.webp`;
    const out = await cropped.clone().resize({ width: outWidth }).webp({ quality: WEBP_QUALITY, alphaQuality: 100 }).toFile(join(outDir, file));
    written.add(file);
    console.log(`書き出し：public/${ILLUST_DIR}/${file}（${out.width}×${out.height}、${Math.round(out.size / 1024)}KB）`);
  }
  return { width: cropWidth, height: cropHeight };
}

const houseSizes = {};
for (const [housing, { source }] of Object.entries(HOUSE_SOURCES)) {
  houseSizes[housing] = await writeOpaqueCrop(source, null, `house-${housing}`, HOUSE_WIDTHS);
}

const propSizes = {};
for (const [prop, { source, index }] of Object.entries(PROP_SOURCES)) {
  let columns = null;
  if (index !== undefined) {
    const figures = await figuresOf(source);
    columns = figures[index];
    if (!columns) throw new Error(`${source} に左から${index + 1}番目の絵がありません（${figures.length}個）`);
  }
  propSizes[prop] = await writeOpaqueCrop(source, columns, prop, PROP_WIDTHS);
}

// 大切にしたいことの絵：1枚に並んだ5つを切り分ける。大きさは画面で使わない（枠の中に収めて出す）
const priorityFigures = await figuresOf(PRIORITY_ICON_SOURCE);
for (const [priority, index] of Object.entries(PRIORITY_ICON_INDEX)) {
  const columns = priorityFigures[index];
  if (!columns) throw new Error(`${PRIORITY_ICON_SOURCE} に左から${index + 1}番目の絵がありません（${priorityFigures.length}個）`);
  await writeOpaqueCrop(PRIORITY_ICON_SOURCE, columns, `priority-${priority}`, PRIORITY_ICON_WIDTHS);
}

const spriteLines = Object.entries(sizes).map(([id, { width, height }]) => `  "${id}": { width: ${width}, height: ${height} },`);
writeFileSync(
  join(root, "src/lib/illust/sprites.ts"),
  `// npm run illust（scripts/build-illust.mjs）が書くファイル。手で直さない。
// 切り出した人物の WebP の大きさ（px）。画面で家族を並べる位置の計算に使う
import type { Housing } from "../conditions/labels.ts";
import type { PropId, SpriteId } from "./assets.ts";

export const SPRITE_SIZES: Record<SpriteId, { width: number; height: number }> = {
${spriteLines.join("\n")}
};

// ふちを切り落とした家の大きさ（元の画像の px）。縦横の比を画面で使う
export const HOUSE_SIZES: Record<Housing, { width: number; height: number }> = {
${Object.entries(houseSizes).map(([housing, { width, height }]) => `  ${housing}: { width: ${width}, height: ${height} },`).join("\n")}
};

// ふちを切り落とした車・バス停などの小物の大きさ（元の画像の px）。縦横の比を画面で使う
export const PROP_SIZES: Record<PropId, { width: number; height: number }> = {
${Object.entries(propSizes).map(([prop, { width, height }]) => `  "${prop}": { width: ${width}, height: ${height} },`).join("\n")}
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
