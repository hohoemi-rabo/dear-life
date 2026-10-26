// 家の種類（えらぶ画面の「家」の選択肢。016）。特定の建物はなぞらず、新しめ・古め・借りるの違いが形でわかるようにする
import { createCanvas, fillRect, setPixel, type Canvas } from "../canvas.ts";
import { box, windows } from "./parts.ts";

// 買う・新しめ：片流れ屋根の2階建て。白い壁と大きな窓
export function newHouse(): Canvas {
  const canvas = createCanvas(32, 24);
  // 片流れの屋根（右が高い）
  for (let x = 1; x < 31; x++) {
    const top = 4 - Math.floor((x - 1) / 8);
    setPixel(canvas, x, top - 1, "k");
    fillRect(canvas, x, top, 1, 5 - top, "a");
  }
  fillRect(canvas, 0, 5, 32, 1, "k");
  box(canvas, 2, 5, 28, 19, "w");
  fillRect(canvas, 3, 13, 26, 1, "a");
  windows(canvas, 5, 8, 3, 8);
  fillRect(canvas, 5, 16, 9, 4, "s");
  setPixel(canvas, 5, 16, "w");
  fillRect(canvas, 9, 16, 1, 4, "w");
  box(canvas, 20, 15, 6, 9, "n");
  setPixel(canvas, 24, 19, "y");
  return canvas;
}

// 買う・古め：瓦の切妻屋根の平屋。木の柱と障子の窓
export function oldHouse(): Canvas {
  const canvas = createCanvas(32, 24);
  for (let i = 0; i < 9; i++) {
    const left = 15 - i - 2;
    const width = (i + 2) * 2 + 2;
    fillRect(canvas, left, 1 + i, width, 1, i % 2 === 0 ? "m" : "a");
    setPixel(canvas, left, 1 + i, "k");
    setPixel(canvas, left + width - 1, 1 + i, "k");
  }
  fillRect(canvas, 13, 0, 6, 1, "k");
  fillRect(canvas, 3, 10, 26, 1, "k");
  box(canvas, 4, 10, 24, 14, "f");
  for (const x of [4, 11, 20, 27]) fillRect(canvas, x, 11, 1, 13, "n");
  // 障子
  for (const x of [6, 22]) {
    fillRect(canvas, x, 13, 4, 5, "w");
    fillRect(canvas, x + 2, 13, 1, 5, "a");
    fillRect(canvas, x, 15, 4, 1, "a");
  }
  box(canvas, 13, 14, 6, 10, "n");
  fillRect(canvas, 15, 15, 2, 8, "y");
  return canvas;
}

// 借りる：3階建てのアパート。廊下と外の階段
export function apartment(): Canvas {
  const canvas = createCanvas(32, 24);
  fillRect(canvas, 0, 1, 26, 2, "k");
  box(canvas, 1, 2, 24, 22, "f");
  for (const y of [9, 16]) fillRect(canvas, 2, y, 22, 1, "a");
  for (const y of [4, 11, 18]) {
    windows(canvas, 3, y, 3, 8);
    for (const x of [7, 15, 23]) fillRect(canvas, x - 1, y, 1, 5, "n");
  }
  // 外の階段
  fillRect(canvas, 25, 3, 1, 21, "k");
  fillRect(canvas, 30, 3, 1, 21, "k");
  for (let y = 5; y < 24; y += 3) fillRect(canvas, 26, y, 4, 1, "a");
  return canvas;
}
