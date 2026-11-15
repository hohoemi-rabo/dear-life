// マスコット（042）の動き：まさゆきさんが用意したアニメーション（assets/mascot/ の GIF）から、画面用の WebP を public/mascot/ に書き出す。
// 使い方：npm run mascot（GIF を差しかえたら流し直す）
//   - 背景を、絵のふちから続いているところだけ消す。背景の色は、全部のコマのふち（幅 BORDER px）に出てくる色そのものとする。
//     GIF は使う色が少なく（kamisato-sweep は全部で83色、背景は5色）、頭のてっぺんの明るいところは背景とほとんど同じ色なので、
//     「白っぽい色」のような幅のある決め方では頭まで消える（2026-11-15）
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

// 背景の色を集める、絵のふちの幅（px）。キャラクターがふちに触れないことを前提にする（触れていたら止める）
const BORDER = 12;
// 背景の色に近いふちの点は、近さに応じて透かす（ふちに白い線を残さない）
const EDGE_FADE_DISTANCE = 60;
// 背景のまわりに残る、背景の5色に入らない「背景に近い色」の点（GIF の色の切りかえのにじみ）は、
// 背景から HALO_DEPTH px までだけ追加で消す。奥まで消すと、背景とほとんど同じ色の頭のてっぺんまで消える
const HALO_DEPTH = 14;
const HALO_DISTANCE = 40;
// いちばん大きい塊（キャラクター）に比べてこれより小さい塊は、背景のざらつきとして消す（ほうきは体につながっている）
const MIN_BLOB_RATIO = 0.03;
// 1コマの高さ（px）。画面では PC で50px前後に出すので、くっきり見えるよう約3倍にする
const FRAME_HEIGHT = 160;
const WEBP_QUALITY = 80;

const colorKey = (data, i) => (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];

// 全部のコマのふちに出てくる色（背景の色）。nearDistance を渡すと、全部のコマに出てくる色のうち、
// ふちの色との差がそれ以下の色も背景の色に入れる（秋の GIF は背景の内側に、ふちとほんの少しちがう色の四角がある）
function borderColors(frames, width, height, nearDistance) {
  const colors = new Set();
  for (const data of frames) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (x >= BORDER && y >= BORDER && x < width - BORDER && y < height - BORDER) continue;
        colors.add(colorKey(data, (y * width + x) * 4));
      }
    }
  }
  if (nearDistance > 0) {
    const border = [...colors].map((key) => [(key >> 16) & 255, (key >> 8) & 255, key & 255]);
    const seen = new Set();
    for (const data of frames) {
      for (let i = 0; i < data.length; i += 4) {
        const key = colorKey(data, i);
        if (seen.has(key)) continue;
        seen.add(key);
        if (border.some(([r, g, b]) => Math.hypot(data[i] - r, data[i + 1] - g, data[i + 2] - b) <= nearDistance)) colors.add(key);
      }
    }
  }
  return colors;
}

// 1コマの背景を透明にする（data は RGBA）。ふちから塗りつぶしで背景の色をたどる
function removeBackground(data, width, height, backgroundColors, backgroundRgb) {
  const background = new Uint8Array(width * height);
  const stack = [];
  for (let x = 0; x < width; x++) stack.push(x, (height - 1) * width + x);
  for (let y = 0; y < height; y++) stack.push(y * width, y * width + width - 1);
  while (stack.length > 0) {
    const k = stack.pop();
    if (background[k]) continue;
    const i = k * 4;
    if (!backgroundColors.has(colorKey(data, i))) continue;
    background[k] = 1;
    const x = k % width;
    const y = (k - x) / width;
    if (x > 0) stack.push(k - 1);
    if (x < width - 1) stack.push(k + 1);
    if (y > 0) stack.push(k - width);
    if (y < height - 1) stack.push(k + width);
  }
  // 背景のまわりのにじみ：背景から近いところだけ、背景に近い色を消す
  let front = [];
  for (let k = 0; k < width * height; k++) if (background[k]) front.push(k);
  for (let depth = 0; depth < HALO_DEPTH && front.length > 0; depth++) {
    const next = [];
    for (const k of front) {
      const x = k % width;
      const y = (k - x) / width;
      for (const n of [x > 0 ? k - 1 : -1, x < width - 1 ? k + 1 : -1, y > 0 ? k - width : -1, y < height - 1 ? k + width : -1]) {
        if (n < 0 || background[n]) continue;
        const i = n * 4;
        if (Math.hypot(data[i] - backgroundRgb[0], data[i + 1] - backgroundRgb[1], data[i + 2] - backgroundRgb[2]) >= HALO_DISTANCE) continue;
        background[n] = 1;
        next.push(n);
      }
    }
    front = next;
  }
  for (let k = 0; k < width * height; k++) if (background[k]) data[k * 4 + 3] = 0;

  // 残った塊のうち小さいものを消す
  const label = new Int32Array(width * height).fill(-1);
  const blobs = [];
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
    blobs.push(members);
  }
  const largest = Math.max(0, ...blobs.map((members) => members.length));
  for (const members of blobs) if (members.length < largest * MIN_BLOB_RATIO) for (const k of members) data[k * 4 + 3] = 0;

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
    const distance = Math.hypot(data[i] - backgroundRgb[0], data[i + 1] - backgroundRgb[1], data[i + 2] - backgroundRgb[2]);
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
    frames.push(data);
  }
  const backgroundColors = borderColors(frames, width, height, 0);
  if (backgroundColors.size > 12) {
    throw new Error(`${spec.source}：ふちの色が ${backgroundColors.size} 色あります。背景が一色でないか、キャラクターが絵のふちに触れています`);
  }
  if (spec.nearBackground) for (const key of borderColors(frames, width, height, spec.nearBackground)) backgroundColors.add(key);
  // ふちを透かすときの基準の色（背景の色の平均）
  const backgroundRgb = [16, 8, 0].map((shift) => [...backgroundColors].reduce((sum, key) => sum + ((key >> shift) & 255), 0) / backgroundColors.size);
  for (const data of frames) removeBackground(data, width, height, backgroundColors, backgroundRgb);

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
