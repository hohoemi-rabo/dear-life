// 春の背景（160×90、地区共通）。奥から 空・雲 → 雪の残るアルプス → 手前の山 → 盆地の家並み → 草地と道 → 桜 の順に重ねる。
// 道（DIRT_TOP〜DIRT_BOTTOM）の上は家族や行事の部品を置く場所なので、木や花で埋めない
import { createCanvas, ditherRect, fillBelow, fillCircle, fillRect, parseSprite, ridge, setPixel, stamp, type Canvas } from "../canvas.ts";

export const BACKGROUND_WIDTH = 160;
export const BACKGROUND_HEIGHT = 90;
export const DIRT_TOP = 76;
export const DIRT_BOTTOM = 86;

const CLOUD = parseSprite([
  "....wwww......",
  "..wwwwwwww.ww.",
  ".wwwwwwwwwwwww",
  "wwwwwwwwwwwwww",
  ".pppwwwwwppp..",
]);

const HOUSE_RED = parseSprite([
  "..rrr..",
  ".rrrrr.",
  "rrrrrrr",
  ".wwwww.",
  ".wkwkw.",
  ".wwwww.",
]);

const HOUSE_GRAY = parseSprite([
  "..aaa..",
  ".aaaaa.",
  "aaaaaaa",
  ".wwwww.",
  ".wwkww.",
]);

// 決まった並びを返す擬似乱数（花や花びらの位置に使う）。同じ種なら毎回同じ絵になる
function sequence(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

function sky(canvas: Canvas): void {
  // 上は濃い空、地平線に近いほど薄い空にする
  fillRect(canvas, 0, 0, BACKGROUND_WIDTH, 52, "p");
  fillRect(canvas, 0, 0, BACKGROUND_WIDTH, 14, "s");
  for (let i = 0; i < 16; i++) ditherRect(canvas, 0, 14 + i, BACKGROUND_WIDTH, 1, "s", "p", (i + 1) / 17);
  stamp(canvas, CLOUD, 14, 6);
  stamp(canvas, CLOUD, 96, 3, { flip: true });
  stamp(canvas, CLOUD, 136, 12);
}

function mountains(canvas: Canvas): void {
  // 遠くのアルプス。高い峰ほど深く雪を残し、雪の下の縁はぎざぎざにする
  const alps = ridge(
    [[0, 33], [12, 28], [22, 31], [36, 21], [46, 25], [58, 18], [70, 24], [80, 22], [94, 16], [106, 23], [118, 20], [132, 27], [146, 24], [159, 30]],
    BACKGROUND_WIDTH,
  );
  const SNOW_LINE = 23;
  fillBelow(canvas, alps, 52, "m");
  alps.forEach((top, x) => {
    const depth = Math.max(0, SNOW_LINE - top) + ((x * 7) % 3) - 1;
    for (let y = top; y < top + depth; y++) setPixel(canvas, x, y, "w");
  });
  // 手前の山（森）。上の縁に木の頭の凹凸をつける
  const hills = ridge([[0, 44], [20, 40], [44, 45], [70, 41], [96, 46], [124, 40], [159, 44]], BACKGROUND_WIDTH);
  fillBelow(canvas, hills.map((top, x) => top - (x % 4 === 1 ? 1 : 0)), 56, "d");
  hills.forEach((top, x) => {
    if (x % 6 === 2) setPixel(canvas, x, top + 2, "g");
  });
}

function town(canvas: Canvas): void {
  fillRect(canvas, 0, 52, BACKGROUND_WIDTH, 8, "g");
  ditherRect(canvas, 0, 51, BACKGROUND_WIDTH, 2, "g", "d");
  const houses: [Canvas, number, number][] = [
    [HOUSE_GRAY, 34, 50], [HOUSE_RED, 42, 49], [HOUSE_GRAY, 52, 51], [HOUSE_RED, 64, 50], [HOUSE_GRAY, 73, 49],
    [HOUSE_GRAY, 86, 51], [HOUSE_RED, 95, 50], [HOUSE_GRAY, 104, 49], [HOUSE_RED, 116, 51],
  ];
  for (const [house, x, y] of houses) stamp(canvas, house, x, y);
}

function ground(canvas: Canvas): void {
  fillRect(canvas, 0, 60, BACKGROUND_WIDTH, 30, "g");
  // 田畑の畝
  for (const y of [62, 65, 69]) ditherRect(canvas, 0, y, BACKGROUND_WIDTH, 1, "l", "g");
  // 道
  fillRect(canvas, 0, DIRT_TOP, BACKGROUND_WIDTH, DIRT_BOTTOM - DIRT_TOP, "f");
  ditherRect(canvas, 0, DIRT_TOP - 1, BACKGROUND_WIDTH, 1, "f", "l");
  ditherRect(canvas, 0, DIRT_BOTTOM, BACKGROUND_WIDTH, 1, "f", "g");
  // 草の花（道の上は避ける）
  const next = sequence(7);
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(next() * BACKGROUND_WIDTH);
    const y = 61 + Math.floor(next() * 29);
    if (y >= DIRT_TOP - 1 && y <= DIRT_BOTTOM) continue;
    setPixel(canvas, x, y, i % 3 === 0 ? "y" : i % 3 === 1 ? "w" : "c");
  }
}

// 桜の木。花の塊を円の重なりで作り、右下に影（赤との市松）、左上に光（白）を入れる
function cherryTree(canvas: Canvas, cx: number, groundY: number): void {
  fillRect(canvas, cx - 2, groundY - 18, 4, 18, "n");
  setPixel(canvas, cx - 3, groundY - 1, "n");
  setPixel(canvas, cx + 2, groundY - 1, "n");
  fillRect(canvas, cx + 1, groundY - 16, 1, 16, "k");
  const blossoms: [number, number, number][] = [
    [0, -26, 10], [-10, -22, 8], [10, -22, 8], [-6, -32, 7], [7, -31, 7], [-15, -15, 5], [15, -15, 5],
  ];
  for (const [dx, dy, radius] of blossoms) fillCircle(canvas, cx + dx + 1, groundY + dy + 1, radius, "r");
  for (const [dx, dy, radius] of blossoms) fillCircle(canvas, cx + dx, groundY + dy, radius, "c");
  for (const [dx, dy, radius] of blossoms) {
    for (let i = 0; i < 3; i++) setPixel(canvas, cx + dx - Math.floor(radius / 2) + i * 2, groundY + dy - Math.floor(radius / 2) - (i % 2), "w");
  }
}

function petals(canvas: Canvas): void {
  const next = sequence(11);
  for (let i = 0; i < 14; i++) {
    setPixel(canvas, 20 + Math.floor(next() * 120), 20 + Math.floor(next() * 50), "c");
  }
}

export function springBackground(): Canvas {
  const canvas = createCanvas(BACKGROUND_WIDTH, BACKGROUND_HEIGHT);
  sky(canvas);
  mountains(canvas);
  town(canvas);
  ground(canvas);
  cherryTree(canvas, 14, 80);
  cherryTree(canvas, 146, 78);
  petals(canvas);
  return canvas;
}
