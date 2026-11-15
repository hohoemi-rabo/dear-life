import { describe, expect, it } from "vitest";
import { APRON_COLOR_IDS, apronSwatch, isApronColorId, recolorApron } from "./recolor";

// 1点ずつの RGBA
function pixel(r: number, g: number, b: number, a = 255) {
  return new Uint8ClampedArray([r, g, b, a]);
}

describe("recolorApron（042）", () => {
  it("エプロンの青緑の点は、明るさを残して選んだ色にする", () => {
    const light = pixel(105, 131, 122);
    const dark = pixel(60, 78, 72);
    recolorApron(light, "red");
    recolorApron(dark, "red");
    // 赤くなる
    expect(light[0]).toBeGreaterThan(light[1] + 40);
    expect(dark[0]).toBeGreaterThan(dark[1] + 20);
    // 影は影のまま（明るいところより暗い）
    expect(dark[0] + dark[1] + dark[2]).toBeLessThan(light[0] + light[1] + light[2]);
  });

  it("体のクリーム色・目のこげ茶・ほうきの茶色・透明な点は変えない", () => {
    for (const color of [pixel(239, 211, 178), pixel(70, 45, 30), pixel(170, 120, 60), pixel(95, 119, 110, 0)]) {
      const before = [...color];
      recolorApron(color, "purple");
      expect([...color]).toEqual(before);
    }
  });

  it("青緑（元の色）を選んだときは何もしない", () => {
    const apron = pixel(95, 119, 110);
    recolorApron(apron, "teal");
    expect([...apron]).toEqual([95, 119, 110, 255]);
  });

  it("パレットの丸の色は、元の色が見本のエプロンの色で、6色とも別の色", () => {
    expect(apronSwatch("teal")).toBe("rgb(95 119 110)");
    expect(new Set(APRON_COLOR_IDS.map(apronSwatch)).size).toBe(APRON_COLOR_IDS.length);
  });

  it("端末に残った値が色の名前でなければ使わない", () => {
    expect(isApronColorId("red")).toBe(true);
    expect(isApronColorId("green")).toBe(false);
    expect(isApronColorId(null)).toBe(false);
  });
});
