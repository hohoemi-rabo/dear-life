// ホーム画面のアイコン（024）。空と草地の上に、赤い三角屋根の家と木を描く。
// 背景は端まで塗り、家と木は真ん中の円（直径の80%）に収める。Android は丸や角丸に切り抜く（maskable）ので、切れても絵が欠けないようにするため
import { createCanvas, fillRect, parseSprite, stamp, type Canvas } from "../canvas.ts";
import { box, gableRoof } from "./parts.ts";

// 家と木を描く範囲。size はこれ以上で、増えた分は空と草地を広げる（180px の iPhone 用は 36ドット×5倍で作るため）
export const ICON_ART_SIZE = 32;

const TREE = parseSprite([
  "...ddd...",
  ".ddgggdd.",
  ".dglgggd.",
  "dglggggdd",
  "dgggggddd",
  "dgggggddd",
  ".dgggddd.",
  "..ddddd..",
  "....nn...",
  "....nn...",
  "....nn...",
  "....nn...",
  "....nn...",
]);

export function appIcon(size: number = ICON_ART_SIZE): Canvas {
  if (size < ICON_ART_SIZE) throw new RangeError(`アイコンは ${ICON_ART_SIZE} ドット以上にしてください: ${size}`);
  const canvas = createCanvas(size, size);
  const o = Math.floor((size - ICON_ART_SIZE) / 2);
  const ground = o + 24;
  fillRect(canvas, 0, 0, size, ground, "p");
  fillRect(canvas, 0, ground, size, size - ground, "g");
  fillRect(canvas, 0, ground, size, 1, "l");

  // 家：三角屋根と白い壁、茶色の戸、窓2つ
  gableRoof(canvas, o + 12, o + 9, 6, "r");
  box(canvas, o + 6, o + 15, 12, ground - o - 15 + 1, "w");
  box(canvas, o + 10, o + 18, 4, ground - o - 18 + 1, "n");
  fillRect(canvas, o + 7, o + 17, 2, 2, "s");
  fillRect(canvas, o + 15, o + 17, 2, 2, "s");

  // 木：茶色の幹と、深緑のふちの葉
  stamp(canvas, TREE, o + 19, ground - TREE.height);
  return canvas;
}
