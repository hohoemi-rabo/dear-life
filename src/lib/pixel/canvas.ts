// ドット絵を描く画面。1ドットにパレットの色の番号（0は透明）を1つ持つ。
// 小さい部品は文字の並び（parseSprite）で描き、四角は fillRect で描く
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

// 絵の外は黙って描かない（部品を端にはみ出して置けるようにするため）
export function setPixel(canvas: Canvas, x: number, y: number, color: ColorKey): void {
  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;
  canvas.pixels[y * canvas.width + x] = colorIndex(color);
}

export function fillRect(canvas: Canvas, x: number, y: number, width: number, height: number, color: ColorKey): void {
  for (let dy = 0; dy < height; dy++) for (let dx = 0; dx < width; dx++) setPixel(canvas, x + dx, y + dy, color);
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
