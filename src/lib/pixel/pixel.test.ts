import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { DRAW } from "./art";
import { familyCanvas } from "./art/family";
import { appIcon } from "./art/icon";
import { withSnow } from "./art/landmarks";
import { EVENT_ART_ASSET, PIXEL_ASSETS, landmarkAssetId, familyAssetId, pixelAssetSrc, type PixelAssetId } from "./assets";
import { createCanvas, ditherRect, parseSprite, ridge, stamp, toRows } from "./canvas";
import { composeScene } from "./compose";
import { PALETTE } from "./palette";
import { encodePng } from "./png";
import { APP_ICONS, appIconPx } from "../pwa/icons";
import { SCENE_SLOTS, layerOutOfBounds, placeInSlot, type SceneSlot } from "./scenes";

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

  it.each(["bg-spring", "bg-summer", "bg-autumn", "bg-winter"] as const)("背景 %s は 160×90 で、透明なドットがない", (id) => {
    const canvas = DRAW[id]();
    expect([canvas.width, canvas.height]).toEqual([160, 90]);
    expect(canvas.pixels.includes(0)).toBe(false);
  });

  it("背景以外の部品は背景より小さく、周りが透明（大雨は場面全体に重ねる）", () => {
    for (const id of Object.keys(PIXEL_ASSETS) as PixelAssetId[]) {
      if (id.startsWith("bg-") || id === "overlay-rain") continue;
      const canvas = DRAW[id]();
      expect(canvas.width * canvas.height).toBeLessThan(160 * 90 / 4);
      expect(canvas.pixels.includes(0)).toBe(true);
    }
  });

  it("画面のアイコンはどれも 16×16 で、同じ大きさで並べられる", () => {
    const iconIds = (Object.keys(PIXEL_ASSETS) as PixelAssetId[]).filter((id) => id.startsWith("icon-"));
    expect(iconIds.length).toBeGreaterThan(0);
    for (const id of iconIds) expect([DRAW[id]().width, DRAW[id]().height]).toEqual([16, 16]);
  });

  it("家族の id は大人1〜2人・子ども0〜2人のすべてがある", () => {
    for (const adults of [1, 2] as const) {
      for (const children of [0, 1, 2] as const) expect(PIXEL_ASSETS[familyAssetId(adults, children)]).toBeDefined();
    }
  });

  it("4地区それぞれに、季節ごとの目印がある（冬は雪の積もった絵）", () => {
    for (const district of ["kamisato", "kanae", "igara", "chushin"] as const) {
      expect(landmarkAssetId(district, "spring")).toBe(`landmark-${district}`);
      expect(landmarkAssetId(district, "winter")).toBe(`landmark-${district}-winter`);
      for (const season of ["spring", "summer", "autumn", "winter"] as const) expect(PIXEL_ASSETS[landmarkAssetId(district, season)]).toBeDefined();
    }
  });

  it("雪を載せると、上を向いた面が白くなり、透明なところは変わらない", () => {
    const snowy = withSnow(parseSprite(["..g..", ".ggg.", "rgggk"]));
    expect(toRows(snowy)).toEqual(["..w..", ".www.", "wwgww"]);
  });

  it("行事の絵の種類（district_events.art）ごとに絵がある", () => {
    expect(Object.keys(EVENT_ART_ASSET)).toEqual(["祭り", "運動会", "文化祭", "その他"]);
    for (const id of Object.values(EVENT_ART_ASSET)) expect(PIXEL_ASSETS[id]).toBeDefined();
  });

  it("家族は大人1〜2人・子ども0〜4人で並べられ、足元がそろう", () => {
    for (const adults of [1, 2] as const) {
      for (let children = 0; children <= 4; children++) {
        const canvas = familyCanvas(adults, children);
        const bottom = toRows(canvas).at(-1)!;
        expect(bottom.replaceAll(".", "").length).toBeGreaterThan(0);
        expect(canvas.height).toBe(21);
      }
    }
    expect(() => familyCanvas(2, 5)).toThrow(RangeError);
  });
});

describe("場面", () => {
  // 置き場所ごとに置く部品
  const SLOT_ASSETS: Record<SceneSlot, (id: PixelAssetId) => boolean> = {
    full: (id) => id.startsWith("bg-") || id.startsWith("overlay-"),
    landmark: (id) => id.startsWith("landmark-"),
    fieldLeft: (id) => id.startsWith("event-") || id.startsWith("facility-"),
    fieldRight: (id) => id.startsWith("event-") || id.startsWith("facility-") || id === "vehicle-train",
    family: (id) => id.startsWith("family-"),
    roadRight: (id) => id === "vehicle-car" || id === "vehicle-bus",
  };

  it("どの部品も、置き場所に置いたとき場面からはみ出さない", () => {
    for (const slot of Object.keys(SCENE_SLOTS) as SceneSlot[]) {
      for (const id of (Object.keys(PIXEL_ASSETS) as PixelAssetId[]).filter(SLOT_ASSETS[slot])) {
        expect(layerOutOfBounds(placeInSlot(id, slot)), `${id} を ${slot} に置く`).toBe(false);
      }
    }
  });

  it("置き場所の下の真ん中に足元を合わせる", () => {
    expect(placeInSlot("family-a2-c1", "family")).toEqual({ asset: "family-a2-c1", x: 58, y: 64 });
    expect(placeInSlot("bg-winter", "full")).toEqual({ asset: "bg-winter", x: 0, y: 0 });
  });

  it("重ねると家族が背景の上に出る", () => {
    const family = placeInSlot("family-a2-c1", "family");
    const scene = composeScene([placeInSlot("bg-spring", "full"), family], DRAW);
    const sprite = DRAW[family.asset]();
    expect(scene.pixels[family.y * 160 + family.x + 4]).toBe(sprite.pixels[4]);
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
