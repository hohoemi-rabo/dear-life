// ドット絵を PNG（パレット形式・透明あり）に書き出す。依存を増やさないよう Node の zlib だけで作る。
// scripts/build-pixel.mjs と テストからだけ使い、画面からは読み込まない
import { crc32, deflateSync } from "node:zlib";
import type { Canvas } from "./canvas.ts";
import { PALETTE } from "./palette.ts";

const SIGNATURE = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  const typeAndData = out.subarray(4, 8 + data.length);
  typeAndData.set(new TextEncoder().encode(type), 0);
  typeAndData.set(data, 4);
  view.setUint32(8 + data.length, crc32(typeAndData));
  return out;
}

function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

// 色の番号0を透明、1〜16をパレットの色にした8ビットのパレット形式で書く
export function encodePng(canvas: Canvas, scale = 1): Uint8Array {
  if (!Number.isInteger(scale) || scale < 1) throw new RangeError(`拡大は1以上の整数にしてください: ${scale}`);
  const width = canvas.width * scale;
  const height = canvas.height * scale;

  const header = new Uint8Array(13);
  const headerView = new DataView(header.buffer);
  headerView.setUint32(0, width);
  headerView.setUint32(4, height);
  header.set([8, 3, 0, 0, 0], 8); // 8ビット・パレット形式・圧縮・フィルタ・インターレースなし

  const colors = [[0, 0, 0] as const, ...PALETTE.map((color) => hexToRgb(color.hex))];
  const plte = Uint8Array.from(colors.flat());
  const trns = Uint8Array.of(0); // 0番だけ透明。残りは省略すると不透明になる

  // 各行の先頭にフィルタの種類（0=なし）を置く
  const raw = new Uint8Array((width + 1) * height);
  for (let y = 0; y < height; y++) {
    const sourceRow = Math.floor(y / scale) * canvas.width;
    for (let x = 0; x < width; x++) raw[y * (width + 1) + 1 + x] = canvas.pixels[sourceRow + Math.floor(x / scale)];
  }

  const parts = [SIGNATURE, chunk("IHDR", header), chunk("PLTE", plte), chunk("tRNS", trns), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", new Uint8Array())];
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
