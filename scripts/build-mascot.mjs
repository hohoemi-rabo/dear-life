// マスコット（042）の動き：まさゆきさんが用意したアニメーション（assets/mascot/ の GIF）から、画面用の WebP を public/mascot/ に書き出す。
// 使い方：npm run mascot（GIF を差しかえたら流し直す）
//   - 背景（白に近い、黄みの少ない色）を、絵のふちから続いているところだけ消す。体のクリーム色は黄みが強いので残る
//   - 背景を消したあとに残った小さな点（GIF の細かい点のざらつき）は消す
//   - 全部のコマで同じ範囲を切り出す（コマごとに切ると、足の位置がずれて画面でゆれる）
//   - コマを横に1列に並べた1枚の WebP にする。画面はこれを順にずらして動かし、エプロンの色はこの1枚を一度だけ置きかえる（src/lib/mascot/recolor.ts）
//   - 大きさとコマ数を src/lib/mascot/sprites.ts に書く
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { MASCOT_DIR, MASCOT_SOURCES } from "../src/lib/mascot/assets.ts";

const root = join(import.meta.dirname, "..");
const sourceDir = join(root, "assets/mascot");
const outDir = join(root, "public", MASCOT_DIR);
mkdirSync(outDir, { recursive: true });

// 背景の色：明るく、色みがほとんどない（元の GIF の背景は rgb(248〜252, 246〜249, 234〜245)。体のクリーム色は rgb(239, 211, 178) 前後）
const BG_MIN_CHANNEL = 225;
const BG_MAX_CHROMA = 26;
// 背景の色に近いふちの点は、近さに応じて透かす（ふちに白い線を残さない）
const EDGE_FADE_DISTANCE = 60;
// これより小さい塊は、背景のざらつきとして消す（落ち葉などの小物はこれより大きい）
const MIN_BLOB_PIXELS = 80;
// 1コマの高さ（px）。画面では PC で50px前後に出すので、くっきり見えるよう約3倍にする
const FRAME_HEIGHT = 160;
const WEBP_QUALITY = 80;

function isBackground(r, g, b) {
  return Math.min(r, g, b) >= BG_MIN_CHANNEL && Math.max(r, g, b) - Math.min(r, g, b) <= BG_MAX_CHROMA;
}

// 1コマの背景を透明にする（data は RGBA）。ふちから塗りつぶしで背景をたどる
function removeBackground(data, width, height) {
  const background = new Uint8Array(width * height);
  const stack = [];
  for (let x = 0; x < width; x++) stack.push(x, (height - 1) * width + x);
  for (let y = 0; y < height; y++) stack.push(y * width, y * width + width - 1);
  while (stack.length > 0) {
    const k = stack.pop();
    if (background[k]) continue;
    const i = k * 4;
    if (!isBackground(data[i], data[i + 1], data[i + 2])) continue;
    background[k] = 1;
    const x = k % width;
    const y = (k - x) / width;
    if (x > 0) stack.push(k - 1);
    if (x < width - 1) stack.push(k + 1);
    if (y > 0) stack.push(k - width);
    if (y < height - 1) stack.push(k + width);
  }
  for (let k = 0; k < width * height; k++) if (background[k]) data[k * 4 + 3] = 0;

  // 残った塊のうち小さいものを消す
  const label = new Int32Array(width * height).fill(-1);
  for (let start = 0; start < width * height; start++) {
    if (background[start] || label[start] !== -1) continue;
    const members = [];
    stack.push(start);
    label[start] = start;
    while (stack.length > 0) {
      const k = stack.pop();
      members.push(k);
      const x = k % width;
      const y = (k - x) / width;
      for (const [nx, ny] of [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ]) {
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const n = ny * width + nx;
        if (background[n] || label[n] !== -1) continue;
        label[n] = start;
        stack.push(n);
      }
    }
    if (members.length < MIN_BLOB_PIXELS) for (const k of members) data[k * 4 + 3] = 0;
  }

  // 背景と接するふちの点は、背景の色に近いほど透かす
  for (let k = 0; k < width * height; k++) {
    const i = k * 4;
    if (data[i + 3] === 0) continue;
    const x = k % width;
    const y = (k - x) / width;
    const touches =
      (x > 0 && data[i - 4 + 3] === 0) ||
      (x < width - 1 && data[i + 4 + 3] === 0) ||
      (y > 0 && data[i - width * 4 + 3] === 0) ||
      (y < height - 1 && data[i + width * 4 + 3] === 0);
    if (!touches) continue;
    const distance = Math.hypot(data[i] - 251, data[i + 1] - 248, data[i + 2] - 238);
    if (distance < EDGE_FADE_DISTANCE) data[i + 3] = Math.round((distance / EDGE_FADE_DISTANCE) * 255);
  }
}

// 透明でない点を囲む範囲
function opaqueBounds(data, width, height) {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] === 0) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  return right < 0 ? null : { left, top, right, bottom };
}

const written = new Set();
const sizes = {};
for (const [id, spec] of Object.entries(MASCOT_SOURCES)) {
  const source = join(sourceDir, spec.source);
  const meta = await sharp(source, { animated: true }).metadata();
  const width = meta.width;
  const height = meta.pageHeight ?? meta.height;
  const pages = meta.pages ?? 1;
  const delay = meta.delay?.[0] ?? 100;

  const frames = [];
  for (let page = 0; page < pages; page += spec.frameStep) {
    const { data } = await sharp(source, { page }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    removeBackground(data, width, height);
    frames.push(data);
  }

  // 全部のコマを囲む範囲
  let union = null;
  for (const data of frames) {
    const b = opaqueBounds(data, width, height);
    if (b === null) continue;
    union =
      union === null
        ? b
        : {
            left: Math.min(union.left, b.left),
            top: Math.min(union.top, b.top),
            right: Math.max(union.right, b.right),
            bottom: Math.max(union.bottom, b.bottom),
          };
  }
  if (union === null) throw new Error(`${spec.source}：背景を消すと何も残りません`);
  const cropWidth = union.right - union.left + 1;
  const cropHeight = union.bottom - union.top + 1;
  const frameWidth = Math.round((cropWidth / cropHeight) * FRAME_HEIGHT);

  const strip = [];
  for (const data of frames) {
    strip.push(
      await sharp(data, { raw: { width, height, channels: 4 } })
        .extract({ left: union.left, top: union.top, width: cropWidth, height: cropHeight })
        .resize(frameWidth, FRAME_HEIGHT)
        .raw()
        .toBuffer(),
    );
  }
  // 横に1列に並べる（コマ k は x = k × frameWidth）
  const stripWidth = frameWidth * strip.length;
  const sheet = Buffer.alloc(stripWidth * FRAME_HEIGHT * 4);
  strip.forEach((frame, k) => {
    for (let y = 0; y < FRAME_HEIGHT; y++) {
      frame.copy(sheet, (y * stripWidth + k * frameWidth) * 4, y * frameWidth * 4, (y + 1) * frameWidth * 4);
    }
  });
  const file = `${id}.webp`;
  const info = await sharp(sheet, { raw: { width: stripWidth, height: FRAME_HEIGHT, channels: 4 } })
    .webp({ quality: WEBP_QUALITY, alphaQuality: 90 })
    .toFile(join(outDir, file));
  written.add(file);
  sizes[id] = { frameWidth, frameHeight: FRAME_HEIGHT, frames: strip.length, frameMs: delay * spec.frameStep };
  console.log(`書き出し：public/${MASCOT_DIR}/${file}（${strip.length}コマ・1コマ ${frameWidth}×${FRAME_HEIGHT}・${Math.round(info.size / 1024)}KB）`);
}

writeFileSync(
  join(root, "src/lib/mascot/sprites.ts"),
  `// npm run mascot（scripts/build-mascot.mjs）が書くファイル。手で直さない。
// マスコットの動きの1枚の WebP（コマを横に1列に並べたもの）の、1コマの大きさ（px）・コマ数・1コマを出す長さ（ミリ秒）
import type { MascotMotionId } from "./assets.ts";

export const MASCOT_SPRITES: Record<MascotMotionId, { frameWidth: number; frameHeight: number; frames: number; frameMs: number }> = ${JSON.stringify(sizes, null, 2)};
`,
);
console.log("書き出し：src/lib/mascot/sprites.ts");

for (const file of readdirSync(outDir)) {
  if (!written.has(file)) {
    rmSync(join(outDir, file));
    console.log(`削除：public/${MASCOT_DIR}/${file}（一覧にない）`);
  }
}
