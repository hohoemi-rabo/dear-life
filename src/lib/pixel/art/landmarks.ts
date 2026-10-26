// 地区の目印（2026-10-26 にまさゆきさんが決めた）。場面の奥、家並みのあたりに置く。
// 写真や作品をなぞらず、形の特徴だけを描く
import { createCanvas, fillCircle, fillRect, getPixel, parseSprite, ridge, setPixel, stamp, type Canvas } from "../canvas.ts";
import { colorIndex, type ColorKey } from "../palette.ts";

// 中心市街地：りんご並木。赤い実の付いた木を、歩道に沿って並べる
export function appleAvenue(): Canvas {
  const canvas = createCanvas(48, 20);
  fillRect(canvas, 0, 16, 48, 4, "a");
  fillRect(canvas, 0, 16, 48, 1, "k");
  for (let x = 1; x < 48; x += 4) setPixel(canvas, x, 18, "w");
  for (const cx of [6, 18, 30, 42]) {
    fillRect(canvas, cx - 1, 9, 2, 8, "n");
    setPixel(canvas, cx, 10, "k");
    fillCircle(canvas, cx, 6, 6, "k");
    fillCircle(canvas, cx, 6, 5, "g");
    fillCircle(canvas, cx + 1, 7, 3, "d");
    fillCircle(canvas, cx - 1, 5, 3, "g");
    for (const [dx, dy] of [[-3, 4], [2, 2], [-1, 8], [3, 7], [-4, 7]]) setPixel(canvas, cx + dx, dy, "r");
    setPixel(canvas, cx - 2, 3, "l");
  }
  return canvas;
}

// 鼎：公園。すべり台・ぶらんこ・ベンチ
export function park(): Canvas {
  const canvas = createCanvas(44, 20);
  // すべり台
  stamp(canvas, parseSprite([
    ".kkkk...........",
    ".kyyk...........",
    ".k..kk..........",
    ".k..krk.........",
    ".kkkk.rk........",
    ".k..k..rk.......",
    ".kkkk...rk......",
    ".k..k....rk.....",
    ".kkkk.....rk....",
    ".k..k......rk...",
    ".k..k.......rkk.",
    ".k..k........rrk",
  ]), 0, 8);
  // ぶらんこ
  fillRect(canvas, 18, 4, 18, 2, "b");
  fillRect(canvas, 18, 4, 18, 1, "k");
  fillRect(canvas, 18, 4, 1, 16, "k");
  fillRect(canvas, 35, 4, 1, 16, "k");
  for (const x of [22, 30]) {
    fillRect(canvas, x, 6, 1, 8, "a");
    fillRect(canvas, x + 3, 6, 1, 8, "a");
    fillRect(canvas, x - 1, 14, 6, 1, "o");
    fillRect(canvas, x - 1, 15, 6, 1, "k");
  }
  // ベンチ
  fillRect(canvas, 37, 14, 7, 1, "n");
  fillRect(canvas, 37, 16, 7, 1, "n");
  fillRect(canvas, 37, 17, 7, 1, "k");
  fillRect(canvas, 38, 18, 1, 2, "k");
  fillRect(canvas, 42, 18, 1, 2, "k");
  return canvas;
}

// 伊賀良：画架と風景画（伊賀良の出身の画家にちなむ。特定の作品や絵柄には似せない）
export function easel(): Canvas {
  const canvas = createCanvas(24, 26);
  // 脚
  for (let y = 0; y < 26; y++) {
    setPixel(canvas, 6 - Math.floor(y / 6), y, "n");
    setPixel(canvas, 17 + Math.floor(y / 6), y, "n");
  }
  fillRect(canvas, 11, 2, 2, 24, "n");
  // 絵
  fillRect(canvas, 2, 2, 20, 15, "k");
  fillRect(canvas, 3, 3, 18, 13, "s");
  const hills = ridge([[0, 9], [6, 6], [11, 8], [17, 5]], 18);
  hills.forEach((top, x) => fillRect(canvas, 3 + x, top, 1, 13 - top, "g"));
  fillRect(canvas, 3, 12, 18, 4, "l");
  stamp(canvas, parseSprite([".r.", "rrr", "www"]), 12, 10);
  setPixel(canvas, 6, 5, "w");
  setPixel(canvas, 7, 5, "w");
  // 受け台と絵筆
  fillRect(canvas, 1, 17, 22, 2, "n");
  fillRect(canvas, 1, 17, 22, 1, "k");
  fillRect(canvas, 15, 16, 5, 1, "y");
  setPixel(canvas, 20, 16, "r");
  return canvas;
}

// 上郷：家並みの手前に見える緑の山。丸みのある稜線を墨で縁どり、右側を影にして森の木の頭を点で描く
export function mountain(): Canvas {
  const width = 60;
  const height = 26;
  const canvas = createCanvas(width, height);
  const top = ridge(
    [[0, 25], [6, 18], [12, 12], [18, 8], [24, 5], [30, 4], [36, 5], [42, 8], [48, 13], [54, 19], [59, 25]],
    width,
  );
  top.forEach((y, x) => {
    for (let row = y; row < height; row++) {
      // 影との境目は網点でぼかす
      const shade = x > 36 || (x > 30 && (x + row) % 2 === 0);
      setPixel(canvas, x, row, shade ? "d" : "g");
      if (row > y + 2 && (x * 3 + row) % 5 === 0) setPixel(canvas, x, row, shade ? "g" : "l");
    }
    setPixel(canvas, x, y, "k");
  });
  return canvas;
}

// 冬の目印。上を向いた面（上が透明なドット）から2段に雪を載せ、葉の明るいところは雪に、りんごの実は葉にする
export function withSnow(sprite: Canvas): Canvas {
  const canvas = createCanvas(sprite.width, sprite.height);
  canvas.pixels.set(sprite.pixels);
  const swap: Record<number, ColorKey> = { [colorIndex("l")]: "w", [colorIndex("r")]: "g" };
  sprite.pixels.forEach((color, i) => {
    if (swap[color]) setPixel(canvas, i % sprite.width, Math.floor(i / sprite.width), swap[color]);
  });
  for (let x = 0; x < sprite.width; x++) {
    for (let y = 0; y < sprite.height; y++) {
      if (getPixel(sprite, x, y) === 0 || (y > 0 && getPixel(sprite, x, y - 1) !== 0)) continue;
      setPixel(canvas, x, y, "w");
      if (y + 1 < sprite.height && getPixel(sprite, x, y + 1) !== 0) setPixel(canvas, x, y + 1, "w");
    }
  }
  return canvas;
}
