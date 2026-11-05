import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { DRAW } from "./art";
import { appIcon } from "./art/icon";
import { EVENT_ART_ASSET, PIXEL_ASSETS, pixelAssetSrc, type PixelAssetId } from "./assets";
import { createCanvas, parseSprite, stamp, toRows } from "./canvas";
import { PALETTE } from "./palette";
import { encodePng } from "./png";
import { APP_ICONS, appIconPx } from "../pwa/icons";

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

  it("画面のアイコンはどれも 16×16 で、同じ大きさで並べられる", () => {
    const iconIds = (Object.keys(PIXEL_ASSETS) as PixelAssetId[]).filter((id) => id.startsWith("icon-"));
    expect(iconIds.length).toBeGreaterThan(0);
    for (const id of iconIds) expect([DRAW[id]().width, DRAW[id]().height]).toEqual([16, 16]);
  });

  it("行事の絵の種類（district_events.art）ごとに絵がある", () => {
    expect(Object.keys(EVENT_ART_ASSET)).toEqual(["祭り", "運動会", "文化祭", "その他"]);
    for (const id of Object.values(EVENT_ART_ASSET)) expect(PIXEL_ASSETS[id]).toBeDefined();
  });

});

describe("ホーム画面のアイコン（024）", () => {
  it("一覧の px の大きさで、整数倍に書き出せる", () => {
    for (const icon of Object.values(APP_ICONS)) {
      const canvas = appIcon(icon.dots);
      expect([canvas.width, canvas.height]).toEqual([icon.dots, icon.dots]);
      expect(appIconPx(icon)).toBe(Number(icon.file.match(/\d+/)?.[0] ?? 180));
    }
  });

  it("端まで背景を塗り、空と草地以外（家と木）は真ん中の円（直径の80%）に収める（丸く切り抜かれても欠けない）", () => {
    const canvas = appIcon();
    const background = new Set(["p", "g", "l"]);
    const rows = toRows(canvas);
    const center = (canvas.width - 1) / 2;
    const radius = canvas.width * 0.4;
    rows.forEach((row, y) =>
      [...row].forEach((key, x) => {
        expect(key).not.toBe(".");
        if (!background.has(key)) expect(Math.hypot(x - center, y - center)).toBeLessThanOrEqual(radius + 0.5);
      }),
    );
  });

  it("iPhone 用は空と草地を広げるだけで、家と木は同じ", () => {
    const small = toRows(appIcon(32));
    const large = toRows(appIcon(36));
    expect(large.slice(2, 34).map((row) => row.slice(2, 34))).toEqual(small);
  });
});
