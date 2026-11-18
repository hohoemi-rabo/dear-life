// マスコット（042）の動き：まさゆきさんが用意したアニメーション（assets/mascot/ の GIF）から、画面用の WebP を public/mascot/ に書き出す。
// 使い方：npm run mascot（GIF を差しかえたら流し直す）
//   - 背景を、絵のふちから続いているところだけ消す。背景の色は、全部のコマのふち（幅 BORDER px）に出てくる色そのものとする。
//     GIF は使う色が少なく（kamisato-sweep は全部で83色、背景は5色）、頭のてっぺんの明るいところは背景とほとんど同じ色なので、
//     「白っぽい色」のような幅のある決め方では頭まで消える（2026-11-15）
//   - 背景を消したあとに残った小さな点（GIF の細かい点のざらつき）は消す
//   - 全部のコマで同じ範囲を切り出す（コマごとに切ると、足の位置がずれて画面でゆれる）
//   - コマを横に1列に並べた1枚の WebP にする。画面はこれを順にずらして動かし、エプロンの色はこの1枚を一度だけ置きかえる（src/lib/mascot/recolor.ts）
//   - 大きさとコマ数を src/lib/mascot/sprites.ts に書く
//   - key（"magenta" か "green"）を付けた GIF は、背景をその色として色で消す（chromaKey。2026-11-15）。背景がクリーム色だと頭のてっぺんと
//     見分けられず欠けたので、これからの動きはマゼンタ（なければ緑）の背景で作ってもらう。床の影と、体に映った背景の色の照り返しも消す
//   - steadyScale を付けると、カメラが寄ったり引いたりして大きさが変わる動画を、頭の幅で同じ大きさにそろえる
//   - blink を付けると、止まった1枚の絵（PNG）から、まばたきの3コマを作る（043。一人のときだけ「わが家」に出るぽてり）
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
// 1コマの高さ（px）。画面では PC で50px前後に出すので、くっきり見えるよう約3倍にする。動きごとに frameHeight で変えられる
// （コマの多い動画は、重くならないよう 120px にする。高精細の画面で PC の大きさの約2倍）
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

// 白黒の形（1 が中身）を、一辺 2r+1 の四角で削る（erode）・太らせる（dilate）。縦と横に分けて回す
function morph(source, width, height, r, erode) {
  const pass = (input, horizontal) => {
    const output = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let value = erode ? 1 : 0;
        for (let d = -r; d <= r; d++) {
          const nx = horizontal ? x + d : x;
          const ny = horizontal ? y : y + d;
          const inside = nx >= 0 && ny >= 0 && nx < width && ny < height && input[ny * width + nx] === 1;
          if (erode ? !inside : inside) {
            value = erode ? 0 : 1;
            break;
          }
        }
        output[y * width + x] = value;
      }
    }
    return output;
  };
  return pass(pass(source, true), false);
}

function hueSaturationValue(r, g, b) {
  const max = Math.max(r, g, b);
  const chroma = max - Math.min(r, g, b);
  let hue = 0;
  if (chroma > 0) {
    if (max === r) hue = ((g - b) / chroma) % 6;
    else if (max === g) hue = (b - r) / chroma + 2;
    else hue = (r - g) / chroma + 4;
    hue = (hue * 60 + 360) % 360;
  }
  return [hue, max === 0 ? 0 : chroma / max, max / 255];
}

// 縄跳びの縄の輪の内側の背景（2026-11-15 鼎）。縄に囲まれて絵のふちから続いていないので、ふちからたどるだけでは消えない。
// そこで、細いもの（一辺 ROPE_RADIUS*2+1 の四角で削ると消える太さ）のうち縄の色（うすい茶色）のところ、とそのまわり2px を
// 通れることにして、ふちからたどり着ける背景の色の点を返す。頭の明るいところは背景とまったく同じ色のことがある（夏・秋）が、
// 頭のクリーム色に囲まれていて、縄の色ではないので通れず、残る。
// rope が "any" のときは細いものを色にかかわらず通れる（春の縄は動きでぼやけて色がほとんどない。春は背景が1色で、頭に背景の色がない）
const ROPE_RADIUS = 6;
const ROPE_HUE = [12, 45];
const ROPE_MIN_SATURATION = 0.2;
const ROPE_MAX_VALUE = 0.85;
function backgroundInsideRope(data, width, height, backgroundColors, rope) {
  const foreground = new Uint8Array(width * height);
  for (let k = 0; k < width * height; k++) foreground[k] = backgroundColors.has(colorKey(data, k * 4)) ? 0 : 1;
  const thick = morph(morph(foreground, width, height, ROPE_RADIUS, true), width, height, ROPE_RADIUS, false);
  const ropeLike = new Uint8Array(width * height);
  for (let k = 0; k < width * height; k++) {
    if (!foreground[k] || thick[k]) continue;
    if (rope === "any") {
      ropeLike[k] = 1;
      continue;
    }
    const [hue, saturation, value] = hueSaturationValue(data[k * 4], data[k * 4 + 1], data[k * 4 + 2]);
    if (hue >= ROPE_HUE[0] && hue <= ROPE_HUE[1] && saturation >= ROPE_MIN_SATURATION && value <= ROPE_MAX_VALUE) ropeLike[k] = 1;
  }
  const passable = rope === "any" ? ropeLike : morph(ropeLike, width, height, 2, false);
  const reached = new Uint8Array(width * height);
  const stack = [];
  for (let x = 0; x < width; x++) stack.push(x, (height - 1) * width + x);
  for (let y = 0; y < height; y++) stack.push(y * width, y * width + width - 1);
  while (stack.length > 0) {
    const k = stack.pop();
    if (reached[k] || (foreground[k] && (thick[k] || !passable[k]))) continue;
    reached[k] = 1;
    const x = k % width;
    const y = (k - x) / width;
    if (x > 0) stack.push(k - 1);
    if (x < width - 1) stack.push(k + 1);
    if (y > 0) stack.push(k - width);
    if (y < height - 1) stack.push(k + width);
  }
  const seeds = [];
  for (let k = 0; k < width * height; k++) if (reached[k] && !foreground[k]) seeds.push(k);
  return seeds;
}

// 背景のまわりのにじみ：背景（reached）から depth px までのうち、背景に近い色の点も背景にした新しい配列を返す
function withHalo(reached, data, width, height, backgroundRgb, depth) {
  const background = Uint8Array.from(reached);
  let front = [];
  for (let k = 0; k < width * height; k++) if (background[k]) front.push(k);
  for (let step = 0; step < depth && front.length > 0; step++) {
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
  return background;
}

// 1コマの背景を透明にする（data は RGBA）。ふちから塗りつぶしで背景の色をたどる。
// rope を渡すと、縄の輪の内側の背景もたどり始めの点にする（backgroundInsideRope）。
function removeBackground(data, width, height, backgroundColors, backgroundRgb, rope) {
  const reached = new Uint8Array(width * height);
  const stack = [];
  for (let x = 0; x < width; x++) stack.push(x, (height - 1) * width + x);
  for (let y = 0; y < height; y++) stack.push(y * width, y * width + width - 1);
  if (rope) for (const k of backgroundInsideRope(data, width, height, backgroundColors, rope)) stack.push(k);
  while (stack.length > 0) {
    const k = stack.pop();
    if (reached[k]) continue;
    const i = k * 4;
    if (!backgroundColors.has(colorKey(data, i))) continue;
    reached[k] = 1;
    const x = k % width;
    const y = (k - x) / width;
    if (x > 0) stack.push(k - 1);
    if (x < width - 1) stack.push(k + 1);
    if (y > 0) stack.push(k - width);
    if (y < height - 1) stack.push(k + width);
  }
  const background = withHalo(reached, data, width, height, backgroundRgb, HALO_DEPTH);
  for (let k = 0; k < width * height; k++) if (background[k]) data[k * 4 + 3] = 0;

  dropSmallBlobs(data, width, height, (k) => background[k] === 1);

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

// 残った塊のうち、いちばん大きい塊（キャラクター）に比べて小さいものを消す（背景のざらつき）
function dropSmallBlobs(data, width, height, isBackground) {
  const stack = [];
  const label = new Int32Array(width * height).fill(-1);
  const blobs = [];
  for (let start = 0; start < width * height; start++) {
    if (isBackground(start) || label[start] !== -1) continue;
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
        if (isBackground(n) || label[n] !== -1) continue;
        label[n] = start;
        stack.push(n);
      }
    }
    blobs.push(members);
  }
  const largest = Math.max(0, ...blobs.map((members) => members.length));
  for (const members of blobs) if (members.length < largest * MIN_BLOB_RATIO) for (const k of members) data[k * 4 + 3] = 0;

}

// 色で背景を消す（key は "magenta" か "green"。data は RGBA）。背景・床の影・照り返しを、キャラクターに使っていない色で見分ける。
// - マゼンタ：キャラクターにマゼンタ寄りの色はない（ほおの赤みは色相が 50° 以上離れている）ので、色相が近く鮮やかな点は暗くても（床の影でも）背景にする。
//   照り返しは青みが増えるので、青を緑より大きくしない
// - 緑：エプロンの青緑と近い。背景は明るく鮮やかな緑、エプロンの暗いひだは同じ色相だが暗い（2026-11-15 の試しの動画で、背景は明るさ 0.65 以上、
//   ひだは 0.45 以下）。暗い緑のうち、エプロン（色相 135〜175°）から GREEN_FOLD_REACH px より離れたものは床の影として消す。
//   照り返しは、エプロン以外の点の緑を赤と青の平均の近くまで下げる
const KEY_HUE = { magenta: 300, green: 120 };
const KEY_HUE_REACH = { magenta: 40, green: 35 };
const KEY_SATURATION = [0.18, 0.32]; // これより鮮やかなら背景、これより淡ければキャラクター。あいだは半透明
const GREEN_MIN_VALUE = 0.5;
const GREEN_FOLD_REACH = 24;
function chromaKey(data, width, height, key) {
  const size = width * height;
  const apron = new Uint8Array(size);
  const darkGreen = new Uint8Array(size);
  const greenish = new Uint8Array(size);
  for (let k = 0; k < size; k++) {
    const i = k * 4;
    const [hue, saturation, value] = hueSaturationValue(data[i], data[i + 1], data[i + 2]);
    const distance = Math.min(Math.abs(hue - KEY_HUE[key]), 360 - Math.abs(hue - KEY_HUE[key]));
    let alpha = 1;
    if (distance <= KEY_HUE_REACH[key] && (key === "magenta" || value > GREEN_MIN_VALUE)) {
      alpha = saturation >= KEY_SATURATION[1] ? 0 : saturation <= KEY_SATURATION[0] ? 1 : (KEY_SATURATION[1] - saturation) / (KEY_SATURATION[1] - KEY_SATURATION[0]);
    }
    if (key === "magenta") {
      if (data[i + 2] > data[i + 1] && alpha > 0) data[i + 2] = data[i + 1];
    } else {
      if (hue >= 135 && hue <= 175 && saturation > 0.1) apron[k] = 1;
      if (hue >= 80 && hue <= 150 && saturation > 0.12) greenish[k] = 1;
      if (!apron[k] && hue >= 95 && hue < 150 && value <= 0.62 && saturation > 0.05) darkGreen[k] = 1;
      if (!apron[k] && !darkGreen[k]) data[i + 1] = Math.min(data[i + 1], Math.round((data[i] + data[i + 2]) / 2) + 6);
    }
    data[i + 3] = Math.round(alpha * data[i + 3]);
  }
  if (key === "green") {
    const nearApron = morph(apron, width, height, GREEN_FOLD_REACH, false);
    for (let k = 0; k < size; k++) {
      if (!darkGreen[k] || nearApron[k]) continue;
      // 床の影と、そのまわりの緑がかったにじみ
      const x = k % width;
      const y = (k - x) / width;
      for (let dy = -5; dy <= 5; dy++) {
        for (let dx = -5; dx <= 5; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const n = ny * width + nx;
          if (n === k || (greenish[n] && !apron[n])) data[n * 4 + 3] = 0;
        }
      }
    }
  }
  dropSmallBlobs(data, width, height, (k) => data[k * 4 + 3] === 0);
}

// 頭の幅（px）：明るく淡い（体のクリーム色の）点が1行にいくつあるかの、上 60% の中での最大
function headWidth(data, width, height) {
  let widest = 0;
  for (let y = 0; y < height * 0.6; y++) {
    let count = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 200) continue;
      const [, saturation, value] = hueSaturationValue(data[i], data[i + 1], data[i + 2]);
      if (value > 0.75 && saturation < 0.25) count++;
    }
    widest = Math.max(widest, count);
  }
  return widest;
}

// カメラの寄り引きをならす：頭の幅をコマの順に直線で当てはめ、最初のコマの大きさにそろうよう、絵の真ん中を中心に縮める・広げる
async function steadyScale(frames, width, height) {
  const widths = frames.map((data) => headWidth(data, width, height));
  const n = widths.length;
  const meanX = (n - 1) / 2;
  const meanY = widths.reduce((sum, w) => sum + w, 0) / n;
  const slope = n < 2 ? 0 : widths.reduce((sum, w, i) => sum + (i - meanX) * (w - meanY), 0) / widths.reduce((sum, _, i) => sum + (i - meanX) ** 2, 0);
  const fitted = (i) => meanY + slope * (i - meanX);
  const result = [];
  for (const [i, data] of frames.entries()) {
    const scale = fitted(0) / fitted(i);
    const scaledWidth = Math.round(width * scale);
    const scaledHeight = Math.round(height * scale);
    const resized = await sharp(data, { raw: { width, height, channels: 4 } }).resize(scaledWidth, scaledHeight).raw().toBuffer();
    const left = Math.round((width - scaledWidth) / 2);
    const top = Math.round((height - scaledHeight) / 2);
    const canvas = await sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: resized, raw: { width: scaledWidth, height: scaledHeight, channels: 4 }, left, top }])
      .raw()
      .toBuffer();
    result.push(canvas);
  }
  console.log(`  大きさをそろえた：頭の幅 ${Math.round(fitted(0))}px → ${Math.round(fitted(n - 1))}px`);
  return result;
}

// 背景が白っぽい一色の GIF（上郷・鼎の縄跳びのはじめの GIF）の背景を消す
function removeOneColorBackground(frames, width, height, spec) {
  const backgroundColors = borderColors(frames, width, height, 0);
  if (backgroundColors.size > 12) {
    throw new Error(`${spec.source}：ふちの色が ${backgroundColors.size} 色あります。背景が一色でないか、キャラクターが絵のふちに触れています`);
  }
  if (spec.nearBackground) for (const key of borderColors(frames, width, height, spec.nearBackground)) backgroundColors.add(key);
  // ふちを透かすときの基準の色（背景の色の平均）
  const backgroundRgb = [16, 8, 0].map((shift) => [...backgroundColors].reduce((sum, key) => sum + ((key >> shift) & 255), 0) / backgroundColors.size);
  for (const data of frames) removeBackground(data, width, height, backgroundColors, backgroundRgb, spec.rope);
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

// まばたき（043）：止まった1枚の絵（1254×1254・マゼンタの背景）から、開いた目・半分閉じた目・閉じた目の3コマを作る。
// 目の位置は4季節の絵で同じ（2026-11-18 に測った。暗い茶色の点を囲む範囲）。目のまわりを肌の色でなめらかに埋めてから、
// 半分の目は元の目を下側に縦につぶして描き、閉じた目は下向きの弧（‿）を描く。左目は頭のふちに近いので、背景の点は埋めない・肌の色に使わない
const BLINK_SOURCE_SIZE = 1254;
const BLINK_EYES = [
  { x0: 452, x1: 481, y0: 358, y1: 387 },
  { x0: 645, x1: 680, y0: 413, y1: 447 },
].map(({ x0, x1, y0, y1 }) => ({ cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, rx: (x1 - x0) / 2 + 3, ry: (y1 - y0) / 2 + 3 }));
// 閉じた目の線の色（口の茶色に近い色）と太さ（px）
const BLINK_LINE_RGB = [58, 34, 20];
const BLINK_LINE_WIDTH = 5.5;
// 半分閉じた目の、縦の縮め方
const BLINK_HALF_SCALE = 0.45;

function blinkFrames(source, width, height) {
  if (width !== BLINK_SOURCE_SIZE || height !== BLINK_SOURCE_SIZE) {
    throw new Error(`まばたきの元の絵は ${BLINK_SOURCE_SIZE}×${BLINK_SOURCE_SIZE} の前提です（${width}×${height}）。目の位置を測り直してください`);
  }
  const rgbAt = (x, y) => {
    const i = (Math.round(y) * width + Math.round(x)) * 4;
    return [source[i], source[i + 1], source[i + 2]];
  };
  const isBackground = ([r, g, b]) => r > 180 && b > 180 && g < 150;
  const inside = (eye, x, y, scale = 1) => ((x - eye.cx) / (eye.rx * scale)) ** 2 + ((y - eye.cy) / (eye.ry * scale)) ** 2 <= 1;
  // 目をふさいだところの肌の色：目のまわりの輪の左右・上下の点を、距離で混ぜる（背景の点は使わない）
  const RING = 1.45;
  const skin = (eye, x, y) => {
    const hx = eye.rx * RING * Math.sqrt(Math.max(0, 1 - ((y - eye.cy) / (eye.ry * RING)) ** 2));
    const vy = eye.ry * RING * Math.sqrt(Math.max(0, 1 - ((x - eye.cx) / (eye.rx * RING)) ** 2));
    const pairs = [
      [rgbAt(eye.cx - hx, y), rgbAt(eye.cx + hx, y), hx ? (x - (eye.cx - hx)) / (2 * hx) : 0.5],
      [rgbAt(x, eye.cy - vy), rgbAt(x, eye.cy + vy), vy ? (y - (eye.cy - vy)) / (2 * vy) : 0.5],
    ];
    const parts = [];
    for (const [a, b, t] of pairs) {
      if (!isBackground(a) && !isBackground(b)) parts.push(a.map((v, c) => v * (1 - t) + b[c] * t));
      else if (!isBackground(a)) parts.push(a);
      else if (!isBackground(b)) parts.push(b);
    }
    if (parts.length === 0) throw new Error("まばたき：目のまわりに肌の色がありません。目の位置を測り直してください");
    return [0, 1, 2].map((c) => parts.reduce((sum, part) => sum + part[c], 0) / parts.length);
  };

  const draw = (mode) => {
    const data = Buffer.from(source);
    if (mode === "open") return data;
    for (const eye of BLINK_EYES) {
      for (let y = Math.floor(eye.cy - eye.ry * 1.4); y <= eye.cy + eye.ry * 1.4; y++) {
        for (let x = Math.floor(eye.cx - eye.rx * 1.4); x <= eye.cx + eye.rx * 1.4; x++) {
          if (!inside(eye, x, y, 1.3) || isBackground(rgbAt(x, y))) continue;
          let color = skin(eye, x, y);
          if (mode === "half") {
            // 元の目を、下のほうを軸に縦につぶす（上まぶたが下りてきたように）
            const pivot = eye.cy + eye.ry * 0.25;
            const sy = pivot + (y - pivot) / BLINK_HALF_SCALE;
            if (y > eye.cy - eye.ry * 0.2 && inside(eye, x, sy)) color = rgbAt(x, sy);
          } else {
            const u = (x - eye.cx) / (eye.rx * 0.95);
            if (Math.abs(u) <= 1) {
              const arcY = eye.cy + eye.ry * 0.15 + eye.ry * 0.35 * (1 - u * u);
              const alpha = Math.max(0, Math.min(1, BLINK_LINE_WIDTH - Math.abs(y - arcY)));
              color = color.map((v, c) => v * (1 - alpha) + BLINK_LINE_RGB[c] * alpha);
            }
          }
          const i = (y * width + x) * 4;
          data[i] = Math.round(color[0]);
          data[i + 1] = Math.round(color[1]);
          data[i + 2] = Math.round(color[2]);
        }
      }
    }
    return data;
  };
  return [draw("open"), draw("half"), draw("closed")];
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

  let frames = [];
  for (let page = 0; page < pages; page += spec.frameStep) {
    const { data } = await sharp(source, { page }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    frames.push(data);
  }
  if (spec.blink) frames = blinkFrames(frames[0], width, height);
  if (spec.key) {
    for (const data of frames) chromaKey(data, width, height, spec.key);
  } else {
    removeOneColorBackground(frames, width, height, spec);
  }
  if (spec.steadyScale) frames = await steadyScale(frames, width, height);


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
  const frameHeight = spec.frameHeight ?? FRAME_HEIGHT;
  const frameWidth = Math.round((cropWidth / cropHeight) * frameHeight);

  const strip = [];
  for (const data of frames) {
    strip.push(
      await sharp(data, { raw: { width, height, channels: 4 } })
        .extract({ left: union.left, top: union.top, width: cropWidth, height: cropHeight })
        .resize(frameWidth, frameHeight)
        .raw()
        .toBuffer(),
    );
  }
  // 横に1列に並べる（コマ k は x = k × frameWidth）
  const stripWidth = frameWidth * strip.length;
  const sheet = Buffer.alloc(stripWidth * frameHeight * 4);
  strip.forEach((frame, k) => {
    for (let y = 0; y < frameHeight; y++) {
      frame.copy(sheet, (y * stripWidth + k * frameWidth) * 4, y * frameWidth * 4, (y + 1) * frameWidth * 4);
    }
  });
  const file = `${id}.webp`;
  const info = await sharp(sheet, { raw: { width: stripWidth, height: frameHeight, channels: 4 } })
    .webp({ quality: WEBP_QUALITY, alphaQuality: 90 })
    .toFile(join(outDir, file));
  written.add(file);
  sizes[id] = { frameWidth, frameHeight, frames: strip.length, frameMs: delay * spec.frameStep };
  console.log(`書き出し：public/${MASCOT_DIR}/${file}（${strip.length}コマ・1コマ ${frameWidth}×${frameHeight}・${Math.round(info.size / 1024)}KB）`);
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
