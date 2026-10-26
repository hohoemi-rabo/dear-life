// ドット絵を描く画面。1ドットにパレットの色の番号（0は透明）を1つ持つ。
// 小さい部品は文字の並び（parseSprite）で描き、背景のような大きい絵は描く関数（fillRect など）と部品の貼り付けで作る
import { PALETTE, colorIndex, type ColorKey } from "./palette.ts";

export type Canvas = {
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8Array;
};

export function createCanvas(width: number, height: number): Canvas {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new RangeError(`絵の大きさは1以上の整数にしてください: ${width}×${height}`);
  }
  return { width, height, pixels: new Uint8Array(width * height) };
}

// 文字の並びから部品を作る。1文字が1ドットで、文字はパレットの key（透明は "."）。
// 行の長さがそろっていないとき・パレットにない文字があるときは止める
export function parseSprite(rows: readonly string[]): Canvas {
  if (rows.length === 0) throw new Error("部品の行がありません");
  const width = rows[0].length;
  const canvas = createCanvas(width, rows.length);
  rows.forEach((row, y) => {
    if (row.length !== width) {
      throw new Error(`部品の ${y + 1}行目の長さが ${row.length} で、1行目（${width}）とそろっていません: "${row}"`);
    }
    for (let x = 0; x < width; x++) canvas.pixels[y * width + x] = colorIndex(row[x]);
  });
  return canvas;
}

export function getPixel(canvas: Canvas, x: number, y: number): number {
  return canvas.pixels[y * canvas.width + x];
}

// 絵の外は黙って描かない（部品を端にはみ出して置けるようにするため）
export function setPixel(canvas: Canvas, x: number, y: number, color: ColorKey): void {
  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;
  canvas.pixels[y * canvas.width + x] = colorIndex(color);
}

export function fillRect(canvas: Canvas, x: number, y: number, width: number, height: number, color: ColorKey): void {
  for (let dy = 0; dy < height; dy++) for (let dx = 0; dx < width; dx++) setPixel(canvas, x + dx, y + dy, color);
}

// 4×4 の網点の順番。数が小さいドットから b に変わる
const BAYER_4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

// 2色を網点で混ぜて、中間の色に見せる（色数を増やさずにぼかすため）。ratio は b の割合（0〜1、既定は市松の 0.5）
export function ditherRect(canvas: Canvas, x: number, y: number, width: number, height: number, a: ColorKey, b: ColorKey, ratio = 0.5): void {
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      const px = x + dx;
      const py = y + dy;
      setPixel(canvas, px, py, BAYER_4[((py % 4) + 4) % 4][((px % 4) + 4) % 4] < ratio * 16 ? b : a);
    }
  }
}

export function fillCircle(canvas: Canvas, cx: number, cy: number, radius: number, color: ColorKey): void {
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2) setPixel(canvas, x, y, color);
    }
  }
}

// 折れ線の点 [x, y] をつないで、0〜width-1 の各列の高さにする。山の稜線を点で書くために使う
export function ridge(points: readonly (readonly [number, number])[], width: number): number[] {
  if (points.length < 2) throw new Error("稜線の点は2つ以上にしてください");
  return Array.from({ length: width }, (_, x) => {
    const right = points.findIndex(([px]) => px >= x);
    if (right <= 0) return points[right === 0 ? 0 : points.length - 1][1];
    const [x0, y0] = points[right - 1];
    const [x1, y1] = points[right];
    return Math.round(y0 + ((y1 - y0) * (x - x0)) / (x1 - x0));
  });
}

// 列ごとの高さ（top[x] の行から下）を塗る。山の稜線や丘に使う
export function fillBelow(canvas: Canvas, top: readonly number[], bottom: number, color: ColorKey): void {
  top.forEach((y, x) => {
    for (let row = Math.round(y); row < bottom; row++) setPixel(canvas, x, row, color);
  });
}

// 部品を貼る。部品の透明なドットは下の絵を残す
export function stamp(canvas: Canvas, sprite: Canvas, x: number, y: number, options: { flip?: boolean } = {}): void {
  for (let sy = 0; sy < sprite.height; sy++) {
    for (let sx = 0; sx < sprite.width; sx++) {
      const color = sprite.pixels[sy * sprite.width + (options.flip ? sprite.width - 1 - sx : sx)];
      const tx = x + sx;
      const ty = y + sy;
      if (color === 0 || tx < 0 || ty < 0 || tx >= canvas.width || ty >= canvas.height) continue;
      canvas.pixels[ty * canvas.width + tx] = color;
    }
  }
}

// 確認用に、絵を文字の並びに戻す（テストや差分の確認に使う）
export function toRows(canvas: Canvas): string[] {
  const keys = [".", ...PALETTE.map((color) => color.key)];
  return Array.from({ length: canvas.height }, (_, y) =>
    Array.from(canvas.pixels.subarray(y * canvas.width, (y + 1) * canvas.width), (index) => keys[index]).join(""),
  );
}
