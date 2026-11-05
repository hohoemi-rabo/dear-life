// 行事の絵と、ホーム画面のアイコンで使う四角・屋根。墨の輪郭で囲む
import { createCanvas, fillRect, parseSprite, setPixel, stamp, type Canvas } from "../canvas.ts";
import type { ColorKey } from "../palette.ts";

// 墨の輪郭つきの四角
export function box(canvas: Canvas, x: number, y: number, width: number, height: number, fill: ColorKey): void {
  fillRect(canvas, x, y, width, height, "k");
  fillRect(canvas, x + 1, y + 1, width - 2, height - 2, fill);
}

// 三角屋根（上の頂点から左右に1ドットずつ広げる）
export function gableRoof(canvas: Canvas, cx: number, top: number, rows: number, fill: ColorKey): void {
  for (let i = 0; i < rows; i++) {
    fillRect(canvas, cx - i - 1, top + i, (i + 1) * 2, 1, fill);
    setPixel(canvas, cx - i - 1, top + i, "k");
    setPixel(canvas, cx + i, top + i, "k");
  }
  fillRect(canvas, cx - rows - 1, top + rows, rows * 2 + 2, 1, "k");
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

