// 季節の背景（160×90、地区共通）。奥から 空・雲 → アルプス → 手前の山 → 盆地の家並み → 田畑と道 → 木 → 舞うもの の順に重ねる。
// 4枚とも同じ地形・同じ並びで、季節ごとに色と木の種類だけを変える（場面の部品をどの季節でも同じ座標に置けるようにするため）。
// 道（DIRT_TOP〜DIRT_BOTTOM）と、その上の田畑の真ん中は家族・行事・施設の部品を置く場所なので、木で埋めない
import { createCanvas, ditherRect, fillBelow, fillCircle, fillRect, parseSprite, ridge, setPixel, stamp, type Canvas } from "../canvas.ts";
import type { ColorKey } from "../palette.ts";
import { sequence } from "./sequence.ts";

export const BACKGROUND_WIDTH = 160;
export const BACKGROUND_HEIGHT = 90;
export const DIRT_TOP = 76;
export const DIRT_BOTTOM = 86;

export type Season = "spring" | "summer" | "autumn" | "winter";

const CLOUD = parseSprite([
  "....wwww......",
  "..wwwwwwww.ww.",
  ".wwwwwwwwwwwww",
  "wwwwwwwwwwwwww",
  ".pppwwwwwppp..",
]);

// 夏の入道雲
const BIG_CLOUD = parseSprite([
  "........wwww..........",
  "......wwwwwwww........",
  ".....wwwwwwwwww.......",
  "...wwwwwwwwwwwwwww....",
  "..wwwwwwwwwwwwwwwwww..",
  ".wwwwwwwwwwwwwwwwwwww.",
  "wwwwwwwwwwwwwwwwwwwwww",
  "ppwwwwwwwwwwwwwwwwwwpp",
  ".ppppwwwwppppwwwwpppp.",
]);

// snowy は屋根の上の段に雪を載せる
function house(roof: ColorKey, snowy: boolean): Canvas {
  return parseSprite([
    "..RRR..",
    ".RRRRR.",
    "RRRRRRR",
    ".wwwww.",
    ".wkwkw.",
    ".wwwww.",
  ].map((row, y) => row.replaceAll("R", snowy && y < 2 ? "w" : roof)));
}

type Look = {
  skyBlueRows: number;
  clouds: "small" | "big";
  // アルプスの雪の下の縁（この行より上の峰に雪を残す）。null は雪なし
  snowLine: number | null;
  alps: ColorKey;
  hills: { base: ColorKey; dots: readonly ColorKey[] };
  roofs: readonly [ColorKey, ColorKey];
  snowyRoofs: boolean;
  field: { base: ColorKey; stripe: ColorKey };
  path: { base: ColorKey; edge: ColorKey };
  flowers: readonly ColorKey[];
  tree: (canvas: Canvas, cx: number, groundY: number) => void;
  falling: ColorKey | null;
};

function sky(canvas: Canvas, look: Look): void {
  // 上は濃い空、地平線に近いほど薄い空にする
  fillRect(canvas, 0, 0, BACKGROUND_WIDTH, 52, "p");
  fillRect(canvas, 0, 0, BACKGROUND_WIDTH, look.skyBlueRows, "s");
  for (let i = 0; i < 16; i++) ditherRect(canvas, 0, look.skyBlueRows + i, BACKGROUND_WIDTH, 1, "s", "p", (i + 1) / 17);
  if (look.clouds === "big") {
    stamp(canvas, BIG_CLOUD, 104, 2);
    stamp(canvas, CLOUD, 22, 8);
  } else {
    stamp(canvas, CLOUD, 14, 6);
    stamp(canvas, CLOUD, 96, 3, { flip: true });
    stamp(canvas, CLOUD, 136, 12);
  }
}

function mountains(canvas: Canvas, look: Look): void {
  // 遠くのアルプス。高い峰ほど深く雪を残し、雪の下の縁はぎざぎざにする
  const alps = ridge(
    [[0, 33], [12, 28], [22, 31], [36, 21], [46, 25], [58, 18], [70, 24], [80, 22], [94, 16], [106, 23], [118, 20], [132, 27], [146, 24], [159, 30]],
    BACKGROUND_WIDTH,
  );
  fillBelow(canvas, alps, 52, look.alps);
  if (look.snowLine !== null) {
    const snowLine = look.snowLine;
    alps.forEach((top, x) => {
      const depth = Math.max(0, snowLine - top) + ((x * 7) % 3) - 1;
      for (let y = top; y < top + depth; y++) setPixel(canvas, x, y, "w");
    });
  }
  // 手前の山（森）。上の縁に木の頭の凹凸をつけ、季節の色の点を散らす
  const hills = ridge([[0, 44], [20, 40], [44, 45], [70, 41], [96, 46], [124, 40], [159, 44]], BACKGROUND_WIDTH);
  fillBelow(canvas, hills.map((top, x) => top - (x % 4 === 1 ? 1 : 0)), 56, look.hills.base);
  const { dots } = look.hills;
  hills.forEach((top, x) => {
    for (let y = top + 2; y < 52; y += 3) {
      const step = (x * 5 + y * 3) % 6;
      if (step < dots.length) setPixel(canvas, x, y, dots[step]);
    }
  });
}

function town(canvas: Canvas, look: Look): void {
  fillRect(canvas, 0, 52, BACKGROUND_WIDTH, 8, look.field.base);
  ditherRect(canvas, 0, 51, BACKGROUND_WIDTH, 2, look.field.base, look.hills.base);
  const [first, second] = look.roofs.map((roof) => house(roof, look.snowyRoofs));
  const houses: [Canvas, number, number][] = [
    [second, 34, 50], [first, 42, 49], [second, 52, 51], [first, 64, 50], [second, 73, 49],
    [second, 86, 51], [first, 95, 50], [second, 104, 49], [first, 116, 51],
  ];
  for (const [sprite, x, y] of houses) stamp(canvas, sprite, x, y);
}

function ground(canvas: Canvas, look: Look): void {
  fillRect(canvas, 0, 60, BACKGROUND_WIDTH, 30, look.field.base);
  // 田畑の畝
  for (const y of [62, 65, 69]) ditherRect(canvas, 0, y, BACKGROUND_WIDTH, 1, look.field.stripe, look.field.base);
  // 道
  fillRect(canvas, 0, DIRT_TOP, BACKGROUND_WIDTH, DIRT_BOTTOM - DIRT_TOP, look.path.base);
  ditherRect(canvas, 0, DIRT_TOP - 1, BACKGROUND_WIDTH, 1, look.path.base, look.path.edge);
  ditherRect(canvas, 0, DIRT_BOTTOM, BACKGROUND_WIDTH, 1, look.path.base, look.path.edge);
  // 草の花（道の上は避ける）
  if (look.flowers.length === 0) return;
  const next = sequence(7);
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(next() * BACKGROUND_WIDTH);
    const y = 61 + Math.floor(next() * 29);
    if (y >= DIRT_TOP - 1 && y <= DIRT_BOTTOM) continue;
    setPixel(canvas, x, y, look.flowers[i % look.flowers.length]);
  }
}

function trunk(canvas: Canvas, cx: number, groundY: number): void {
  fillRect(canvas, cx - 2, groundY - 18, 4, 18, "n");
  setPixel(canvas, cx - 3, groundY - 1, "n");
  setPixel(canvas, cx + 2, groundY - 1, "n");
  fillRect(canvas, cx + 1, groundY - 16, 1, 16, "k");
}

const CANOPY: readonly (readonly [number, number, number])[] = [
  [0, -26, 10], [-10, -22, 8], [10, -22, 8], [-6, -32, 7], [7, -31, 7], [-15, -15, 5], [15, -15, 5],
];

// 葉や花の茂った木。塊を円の重なりで作り、右下に影、左上に光を入れる
function leafyTree(colors: { body: ColorKey; shade: ColorKey; light: ColorKey }) {
  return (canvas: Canvas, cx: number, groundY: number): void => {
    trunk(canvas, cx, groundY);
    for (const [dx, dy, radius] of CANOPY) fillCircle(canvas, cx + dx + 1, groundY + dy + 1, radius, colors.shade);
    for (const [dx, dy, radius] of CANOPY) fillCircle(canvas, cx + dx, groundY + dy, radius, colors.body);
    for (const [dx, dy, radius] of CANOPY) {
      for (let i = 0; i < 3; i++) setPixel(canvas, cx + dx - Math.floor(radius / 2) + i * 2, groundY + dy - Math.floor(radius / 2) - (i % 2), colors.light);
    }
  };
}

// 葉の落ちた冬の木。枝に雪を載せる
function bareTree(canvas: Canvas, cx: number, groundY: number): void {
  trunk(canvas, cx, groundY);
  fillRect(canvas, cx - 1, groundY - 34, 2, 16, "n");
  const branches: [number, number, number, number][] = [
    // 枝の付け根の高さ・向き（-1 左、1 右）・長さ・上がり方
    [20, -1, 12, 1], [24, 1, 12, 1], [28, -1, 9, 2], [31, 1, 8, 2], [16, 1, 7, 0], [14, -1, 7, 0],
  ];
  for (const [height, direction, length, rise] of branches) {
    for (let i = 1; i <= length; i++) {
      const x = cx + direction * i;
      const y = groundY - height - Math.floor((i * rise) / 3);
      setPixel(canvas, x, y, "n");
      if (i % 3 !== 0) setPixel(canvas, x, y - 1, "w");
      if (i === length) setPixel(canvas, x + direction, y - 1, "n");
    }
  }
  fillRect(canvas, cx - 1, groundY - 35, 2, 1, "w");
}

function falling(canvas: Canvas, color: ColorKey, count: number): void {
  const next = sequence(11);
  for (let i = 0; i < count; i++) setPixel(canvas, 20 + Math.floor(next() * 120), 2 + Math.floor(next() * 68), color);
}

const LOOKS: Record<Season, Look> = {
  spring: {
    skyBlueRows: 14,
    clouds: "small",
    snowLine: 23,
    alps: "m",
    hills: { base: "d", dots: ["g"] },
    roofs: ["r", "a"],
    snowyRoofs: false,
    field: { base: "g", stripe: "l" },
    path: { base: "f", edge: "l" },
    flowers: ["y", "w", "c"],
    tree: leafyTree({ body: "c", shade: "r", light: "w" }),
    falling: "c",
  },
  summer: {
    skyBlueRows: 22,
    clouds: "big",
    snowLine: null,
    alps: "m",
    hills: { base: "d", dots: ["g", "g"] },
    roofs: ["r", "a"],
    snowyRoofs: false,
    field: { base: "l", stripe: "g" },
    path: { base: "f", edge: "g" },
    flowers: ["y", "w"],
    tree: leafyTree({ body: "g", shade: "d", light: "l" }),
    falling: null,
  },
  autumn: {
    skyBlueRows: 18,
    clouds: "small",
    snowLine: 19,
    alps: "m",
    hills: { base: "d", dots: ["o", "r", "y"] },
    roofs: ["r", "a"],
    snowyRoofs: false,
    field: { base: "y", stripe: "o" },
    path: { base: "f", edge: "y" },
    flowers: ["r", "o"],
    tree: leafyTree({ body: "o", shade: "r", light: "y" }),
    falling: "o",
  },
  winter: {
    skyBlueRows: 20,
    clouds: "small",
    snowLine: 31,
    alps: "m",
    hills: { base: "d", dots: ["w", "w", "w"] },
    roofs: ["r", "a"],
    snowyRoofs: true,
    field: { base: "w", stripe: "p" },
    path: { base: "a", edge: "w" },
    flowers: [],
    tree: bareTree,
    falling: "w",
  },
};

export function seasonBackground(season: Season): Canvas {
  const look = LOOKS[season];
  const canvas = createCanvas(BACKGROUND_WIDTH, BACKGROUND_HEIGHT);
  sky(canvas, look);
  mountains(canvas, look);
  town(canvas, look);
  ground(canvas, look);
  look.tree(canvas, 14, 80);
  look.tree(canvas, 146, 78);
  if (look.falling) falling(canvas, look.falling, season === "winter" ? 40 : 14);
  return canvas;
}
