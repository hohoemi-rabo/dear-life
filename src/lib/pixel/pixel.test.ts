import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { DRAW } from "./art";
import { familyCanvas } from "./art/family";
import { PIXEL_ASSETS, pixelAssetSrc, type PixelAssetId } from "./assets";
import { createCanvas, ditherRect, parseSprite, ridge, stamp, toRows } from "./canvas";
import { composeScene } from "./compose";
import { PALETTE } from "./palette";
import { encodePng } from "./png";
import { PROTOTYPE_SPRING_SCENE, layerOutOfBounds } from "./scenes";

describe("パレット", () => {
  it("16色で、文字も色も重ならない", () => {
    expect(PALETTE).toHaveLength(16);
    expect(new Set(PALETTE.map((color) => color.key)).size).toBe(16);
    expect(new Set(PALETTE.map((color) => color.hex)).size).toBe(16);
    for (const color of PALETTE) expect(color.key).toMatch(/^[a-z]$/);
  });
});

describe("部品の元データ", () => {
  it("文字の並びを読み、そのまま戻せる", () => {
    const rows = [".kk.", "kwwk", ".kk."];
    expect(toRows(parseSprite(rows))).toEqual(rows);
  });

  it("行の長さがそろっていないときは止める", () => {
    expect(() => parseSprite(["kk", "k"])).toThrow("2行目");
  });

  it("パレットにない文字は止める", () => {
    expect(() => parseSprite(["kZ"])).toThrow('"Z"');
  });

  it("貼るときは透明なドットで下の絵を残し、はみ出した分は描かない", () => {
    const canvas = parseSprite(["ggg", "ggg"]);
    stamp(canvas, parseSprite(["k.", ".k"]), 2, 0);
    expect(toRows(canvas)).toEqual(["ggk", "ggg"]);
  });

  it("左右を反転して貼れる", () => {
    const canvas = createCanvas(3, 1);
    stamp(canvas, parseSprite(["kw."]), 0, 0, { flip: true });
    expect(toRows(canvas)).toEqual([".wk"]);
  });
});

describe("描く関数", () => {
  it("網点は割合に応じて混ぜる（0.5 は市松）", () => {
    const canvas = createCanvas(4, 2);
    ditherRect(canvas, 0, 0, 4, 2, "s", "p");
    expect(toRows(canvas)).toEqual(["psps", "spsp"]);
    ditherRect(canvas, 0, 0, 4, 2, "s", "p", 0);
    expect(toRows(canvas)).toEqual(["ssss", "ssss"]);
  });

  it("稜線は点のあいだを直線でつなぎ、外側は端の高さにする", () => {
    expect(ridge([[1, 10], [3, 14]], 5)).toEqual([10, 10, 12, 14, 14]);
  });
});

describe("PNG の書き出し", () => {
  function readPng(bytes: Uint8Array) {
    const view = new DataView(bytes.buffer, bytes.byteOffset);
    const chunks: Record<string, Uint8Array> = {};
    for (let offset = 8; offset < bytes.length; ) {
      const length = view.getUint32(offset);
      const type = new TextDecoder().decode(bytes.subarray(offset + 4, offset + 8));
      chunks[type] = bytes.subarray(offset + 8, offset + 8 + length);
      offset += 12 + length;
    }
    const header = new DataView(chunks.IHDR.buffer, chunks.IHDR.byteOffset);
    return { width: header.getUint32(0), height: header.getUint32(4), chunks, raw: inflateSync(chunks.IDAT) };
  }

  it("パレット形式で、0番を透明にして書く", () => {
    const png = readPng(encodePng(parseSprite(["k.", ".w"])));
    expect([png.width, png.height]).toEqual([2, 2]);
    expect(png.chunks.PLTE).toHaveLength(17 * 3);
    expect(Array.from(png.chunks.tRNS)).toEqual([0]);
    // 各行の先頭はフィルタなし（0）
    expect(Array.from(png.raw)).toEqual([0, 1, 0, 0, 0, 2]);
  });

  it("整数倍に拡大して書ける", () => {
    const png = readPng(encodePng(parseSprite(["kw"]), 2));
    expect([png.width, png.height]).toEqual([4, 2]);
    expect(Array.from(png.raw)).toEqual([0, 1, 1, 2, 2, 0, 1, 1, 2, 2]);
  });

  it("整数でない拡大は受け付けない", () => {
    expect(() => encodePng(createCanvas(1, 1), 1.5)).toThrow(RangeError);
  });
});

describe("絵の一覧", () => {
  it.each(Object.keys(PIXEL_ASSETS) as PixelAssetId[])("%s は一覧の大きさで描かれ、代替テキストがある", (id) => {
    const canvas = DRAW[id]();
    expect([canvas.width, canvas.height]).toEqual([PIXEL_ASSETS[id].width, PIXEL_ASSETS[id].height]);
    expect(PIXEL_ASSETS[id].alt.length).toBeGreaterThan(0);
    expect(pixelAssetSrc(id)).toBe(`/pixel/${id}.png`);
  });

  it("背景は 160×90 で、透明なドットがない", () => {
    const canvas = DRAW["bg-spring"]();
    expect([canvas.width, canvas.height]).toEqual([160, 90]);
    expect(canvas.pixels.includes(0)).toBe(false);
  });

  it("家族は大人1〜2人・子ども0〜3人で並べられ、足元がそろう", () => {
    for (const adults of [1, 2] as const) {
      for (let children = 0; children <= 3; children++) {
        const canvas = familyCanvas(adults, children);
        const bottom = toRows(canvas).at(-1)!;
        expect(bottom.replaceAll(".", "").length).toBeGreaterThan(0);
        expect(canvas.height).toBe(21);
      }
    }
    expect(() => familyCanvas(2, 4)).toThrow(RangeError);
  });
});

describe("場面", () => {
  it("試作の春の場面は、どの部品も場面からはみ出さない", () => {
    for (const layer of PROTOTYPE_SPRING_SCENE) expect(layerOutOfBounds(layer)).toBe(false);
  });

  it("重ねると家族が背景の上に出る", () => {
    const scene = composeScene(PROTOTYPE_SPRING_SCENE, DRAW);
    const family = PROTOTYPE_SPRING_SCENE[1];
    const sprite = DRAW[family.asset]();
    const [x, y] = [family.x + 4, family.y];
    expect(scene.pixels[y * 160 + x]).toBe(sprite.pixels[4]);
  });
});
