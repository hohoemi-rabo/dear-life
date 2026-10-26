// 背景に重ねる部品（施設・乗り物・行事・大雨）。人物と同じく墨の輪郭で囲み、背景から浮き出るようにする。
// 建物や乗り物は四角の組み合わせなので描く関数で、細かい飾りは文字の並びで描く
import { createCanvas, fillRect, parseSprite, setPixel, stamp, type Canvas } from "../canvas.ts";
import type { ColorKey } from "../palette.ts";
import { sequence } from "./sequence.ts";

// 墨の輪郭つきの四角
function box(canvas: Canvas, x: number, y: number, width: number, height: number, fill: ColorKey): void {
  fillRect(canvas, x, y, width, height, "k");
  fillRect(canvas, x + 1, y + 1, width - 2, height - 2, fill);
}

// 窓を横に並べる
function windows(canvas: Canvas, x: number, y: number, count: number, gap: number, glass: ColorKey = "s"): void {
  for (let i = 0; i < count; i++) {
    fillRect(canvas, x + i * gap, y, 3, 2, glass);
    setPixel(canvas, x + i * gap, y, "w");
  }
}

// 三角屋根（上の頂点から左右に1ドットずつ広げる）
function gableRoof(canvas: Canvas, cx: number, top: number, rows: number, fill: ColorKey): void {
  for (let i = 0; i < rows; i++) {
    fillRect(canvas, cx - i - 1, top + i, (i + 1) * 2, 1, fill);
    setPixel(canvas, cx - i - 1, top + i, "k");
    setPixel(canvas, cx + i, top + i, "k");
  }
  fillRect(canvas, cx - rows - 1, top + rows, rows * 2 + 2, 1, "k");
}

// 小学校：時計台のある2階建て
export function school(): Canvas {
  const canvas = createCanvas(40, 24);
  box(canvas, 0, 8, 40, 16, "w");
  fillRect(canvas, 1, 9, 38, 1, "a");
  windows(canvas, 3, 11, 7, 5);
  windows(canvas, 3, 16, 3, 5);
  windows(canvas, 25, 16, 3, 5);
  box(canvas, 17, 17, 6, 7, "n");
  fillRect(canvas, 19, 18, 2, 6, "s");
  box(canvas, 15, 0, 10, 10, "w");
  box(canvas, 17, 2, 6, 6, "y");
  setPixel(canvas, 19, 4, "k");
  setPixel(canvas, 20, 4, "k");
  setPixel(canvas, 20, 5, "k");
  return canvas;
}

// 保育園・幼稚園：橙の三角屋根の平屋
export function nursery(): Canvas {
  const canvas = createCanvas(28, 18);
  gableRoof(canvas, 14, 0, 7, "o");
  fillRect(canvas, 12, 2, 4, 1, "y");
  box(canvas, 2, 7, 24, 11, "w");
  windows(canvas, 4, 10, 2, 5, "y");
  windows(canvas, 18, 10, 2, 4, "s");
  box(canvas, 12, 11, 5, 7, "r");
  return canvas;
}

// 公民館などの公共施設：灰色の屋根の平屋と案内板
export function publicFacility(): Canvas {
  const canvas = createCanvas(34, 18);
  for (let i = 0; i < 5; i++) {
    fillRect(canvas, 4 - i, 2 + i, 26 + i * 2, 1, "a");
    setPixel(canvas, 4 - i, 2 + i, "k");
    setPixel(canvas, 29 + i, 2 + i, "k");
  }
  fillRect(canvas, 4, 1, 26, 1, "k");
  box(canvas, 1, 7, 32, 11, "f");
  windows(canvas, 4, 10, 3, 5);
  windows(canvas, 23, 10, 2, 5);
  box(canvas, 18, 11, 4, 7, "n");
  return canvas;
}

// 避難場所：丸い屋根の体育館と、緑の案内板
export function shelter(): Canvas {
  const canvas = createCanvas(40, 22);
  const roof = [12, 18, 22, 26, 28];
  roof.forEach((width, i) => {
    fillRect(canvas, 14 - width / 2, 4 + i, width, 1, "b");
    setPixel(canvas, 14 - width / 2, 4 + i, "k");
    setPixel(canvas, 14 + width / 2 - 1, 4 + i, "k");
  });
  fillRect(canvas, 8, 3, 12, 1, "k");
  box(canvas, 0, 9, 28, 13, "w");
  windows(canvas, 3, 12, 5, 5);
  box(canvas, 11, 15, 6, 7, "a");
  // 案内板（白い人の形を描いた緑の板）
  stamp(canvas, parseSprite([
    "kkkkkkkkkk",
    "kggggggggk",
    "kgggwggggk",
    "kggwwwgggk",
    "kgggwwgggk",
    "kggwggwggk",
    "kggggggggk",
    "kkkkkkkkkk",
    "....kk....",
    "....kk....",
    "....kk....",
    "....kk....",
    "....kk....",
  ]), 30, 9);
  return canvas;
}

function wheels(canvas: Canvas, xs: readonly number[], y: number): void {
  for (const x of xs) {
    fillRect(canvas, x, y, 4, 3, "k");
    fillRect(canvas, x + 1, y + 1, 2, 1, "a");
  }
}

// 雪を屋根に載せる（冬の乗り物に使う）
function snowOnTop(canvas: Canvas, x: number, y: number, width: number): void {
  fillRect(canvas, x, y, width, 1, "w");
  for (let i = 1; i < width - 1; i += 3) setPixel(canvas, x + i, y - 1, "w");
}

// 車（横から）。屋根に雪
export function car(): Canvas {
  const canvas = createCanvas(26, 14);
  box(canvas, 6, 2, 13, 6, "r");
  fillRect(canvas, 8, 4, 4, 3, "s");
  fillRect(canvas, 13, 4, 4, 3, "s");
  box(canvas, 1, 6, 24, 6, "r");
  fillRect(canvas, 22, 8, 2, 1, "y");
  fillRect(canvas, 2, 8, 1, 1, "o");
  snowOnTop(canvas, 6, 1, 13);
  wheels(canvas, [4, 18], 11);
  return canvas;
}

// 路線バス（横から）。特定の会社の色にはしない。屋根に雪
export function bus(): Canvas {
  const canvas = createCanvas(42, 20);
  box(canvas, 0, 2, 42, 15, "w");
  fillRect(canvas, 1, 12, 40, 2, "g");
  fillRect(canvas, 3, 4, 10, 2, "k");
  fillRect(canvas, 4, 4, 8, 1, "y");
  windows(canvas, 15, 5, 5, 5);
  fillRect(canvas, 3, 7, 4, 9, "s");
  fillRect(canvas, 3, 7, 4, 1, "k");
  snowOnTop(canvas, 1, 1, 40);
  wheels(canvas, [6, 32], 16);
  return canvas;
}

// 電車（横から）と線路。特定の車両の色にはしない。屋根に雪
export function train(): Canvas {
  const canvas = createCanvas(52, 22);
  // パンタグラフ
  stamp(canvas, parseSprite([
    "kkkkkk",
    ".k..k.",
    "..kk..",
  ]), 23, 0);
  box(canvas, 2, 3, 48, 14, "a");
  fillRect(canvas, 3, 12, 46, 2, "b");
  fillRect(canvas, 3, 14, 46, 1, "o");
  windows(canvas, 6, 6, 8, 5, "s");
  fillRect(canvas, 19, 6, 3, 9, "w");
  fillRect(canvas, 34, 6, 3, 9, "w");
  snowOnTop(canvas, 3, 3, 46);
  wheels(canvas, [6, 13, 35, 42], 17);
  // 線路
  fillRect(canvas, 0, 20, 52, 1, "a");
  for (let x = 1; x < 52; x += 4) fillRect(canvas, x, 21, 2, 1, "n");
  return canvas;
}

// 行事「祭り」：提灯を下げた舞台と人形
export function festival(): Canvas {
  const canvas = createCanvas(34, 24);
  fillRect(canvas, 0, 0, 34, 1, "k");
  fillRect(canvas, 0, 1, 34, 2, "n");
  fillRect(canvas, 0, 3, 34, 1, "k");
  box(canvas, 1, 3, 3, 21, "n");
  box(canvas, 30, 3, 3, 21, "n");
  // 幕
  fillRect(canvas, 4, 4, 26, 3, "r");
  for (let x = 4; x < 30; x += 2) setPixel(canvas, x, 7, "r");
  // 提灯
  for (const x of [7, 15, 23]) {
    stamp(canvas, parseSprite([".k.", "kyk", "kok", "kyk", ".k."]), x, 6);
  }
  // 舞台と人形
  box(canvas, 2, 17, 30, 7, "n");
  fillRect(canvas, 3, 18, 28, 1, "o");
  stamp(canvas, parseSprite([
    ".kkk.",
    "knnnk",
    "kfkfk",
    ".kfk.",
    "krrrk",
    "krwrk",
    ".kkk.",
  ]), 14, 11);
  return canvas;
}

// 行事「運動会」：旗を渡したロープと、白いテント
export function sportsDay(): Canvas {
  const canvas = createCanvas(36, 22);
  fillRect(canvas, 0, 0, 2, 22, "n");
  fillRect(canvas, 34, 0, 2, 22, "n");
  const flags: ColorKey[] = ["r", "y", "b", "g", "o"];
  for (let i = 0; i < 8; i++) {
    const x = 3 + i * 4;
    const sag = i < 4 ? i : 7 - i;
    setPixel(canvas, x - 1, 1 + sag, "k");
    stamp(canvas, parseSprite(["FFF", ".F."].map((row) => row.replaceAll("F", flags[i % flags.length]))), x, 1 + sag);
  }
  // テント
  fillRect(canvas, 6, 10, 24, 1, "k");
  for (let i = 0; i < 3; i++) {
    for (let x = 6; x < 30; x++) setPixel(canvas, x, 11 + i, Math.floor((x - 6) / 4) % 2 === 0 ? "w" : "b");
  }
  fillRect(canvas, 6, 14, 24, 1, "k");
  fillRect(canvas, 7, 15, 1, 7, "k");
  fillRect(canvas, 28, 15, 1, 7, "k");
  // テントの下の机
  box(canvas, 11, 18, 14, 4, "f");
  return canvas;
}

// 行事「文化祭」：絵を掛けた展示板と、花を生けた机
export function cultureFestival(): Canvas {
  const canvas = createCanvas(34, 22);
  box(canvas, 0, 0, 22, 16, "w");
  box(canvas, 2, 2, 8, 6, "s");
  fillRect(canvas, 3, 5, 6, 2, "g");
  setPixel(canvas, 7, 3, "y");
  box(canvas, 12, 2, 8, 6, "y");
  fillRect(canvas, 14, 4, 3, 3, "r");
  box(canvas, 2, 9, 18, 5, "f");
  for (let x = 4; x < 18; x += 3) fillRect(canvas, x, 11, 2, 1, "k");
  fillRect(canvas, 3, 16, 1, 6, "k");
  fillRect(canvas, 18, 16, 1, 6, "k");
  // 机と花
  box(canvas, 22, 15, 12, 3, "n");
  fillRect(canvas, 23, 18, 1, 4, "k");
  fillRect(canvas, 32, 18, 1, 4, "k");
  stamp(canvas, parseSprite([
    ".c.y.",
    "crcyo",
    ".cgo.",
    "..g..",
    ".kbk.",
    ".kbk.",
  ]), 25, 9);
  return canvas;
}

// 行事「その他」：行事のお知らせを貼った地区の掲示板
export function noticeBoard(): Canvas {
  const canvas = createCanvas(28, 22);
  fillRect(canvas, 0, 0, 28, 2, "k");
  fillRect(canvas, 1, 1, 26, 1, "n");
  box(canvas, 1, 2, 26, 13, "n");
  fillRect(canvas, 2, 3, 24, 11, "f");
  const posters: [number, number, ColorKey][] = [[4, 4, "w"], [11, 5, "y"], [18, 4, "c"]];
  for (const [x, y, color] of posters) {
    box(canvas, x, y, 6, 8, color);
    fillRect(canvas, x + 1, y + 2, 4, 1, "k");
    fillRect(canvas, x + 1, y + 4, 3, 1, "a");
  }
  fillRect(canvas, 4, 15, 2, 7, "n");
  fillRect(canvas, 22, 15, 2, 7, "n");
  fillRect(canvas, 6, 15, 1, 7, "k");
  fillRect(canvas, 24, 15, 1, 7, "k");
  return canvas;
}

// 大雨（夏）：場面全体に重ねる。上に暗い雲、全体に斜めの雨筋、道に水たまり
export function heavyRain(width: number, height: number, puddleTop: number): Canvas {
  const canvas = createCanvas(width, height);
  for (let y = 0; y < 14; y++) {
    for (let x = 0; x < width; x++) {
      const edge = 10 + ((x * 7) % 5);
      if (y < edge) setPixel(canvas, x, y, (x + y) % 2 === 0 ? "a" : "m");
      else if (y === edge) setPixel(canvas, x, y, "a");
    }
  }
  const next = sequence(23);
  for (let i = 0; i < 160; i++) {
    const x = Math.floor(next() * (width + 10));
    const y = 12 + Math.floor(next() * (height - 14));
    for (let j = 0; j < 3; j++) setPixel(canvas, x - j, y + j, "s");
  }
  for (const x of [8, 40, 104, 132]) {
    fillRect(canvas, x, puddleTop + 6, 12, 1, "s");
    fillRect(canvas, x + 2, puddleTop + 5, 8, 1, "s");
    fillRect(canvas, x + 3, puddleTop + 6, 3, 1, "w");
  }
  return canvas;
}
