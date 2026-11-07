import { describe, expect, it } from "vitest";
import { boundsCenter, metersPerPixel, nearestWithin, rangeForBounds, rangeToZoom, zoomToRange } from "./camera";
import { DISTRICT_BOUNDS, MAX_ZOOM, MIN_ZOOM } from "./style";

const IIDA_LAT = 35.51;

describe("平面と立体の見ている広さの換算（032）", () => {
  it("ズームが1増えると、1ピクセルの長さは半分になる", () => {
    expect(metersPerPixel(IIDA_LAT, 15) / metersPerPixel(IIDA_LAT, 16)).toBeCloseTo(2);
  });

  it("平面→立体→平面で、だいたい同じズームに戻る", () => {
    const range = zoomToRange(14.5, IIDA_LAT, 600);
    expect(rangeToZoom(range, IIDA_LAT, 600, MIN_ZOOM, MAX_ZOOM)).toBeCloseTo(14.5, 5);
  });

  it("立体から戻るズームは、平面の地図で使える範囲に収める", () => {
    expect(rangeToZoom(1, IIDA_LAT, 600, MIN_ZOOM, MAX_ZOOM)).toBe(MAX_ZOOM);
    expect(rangeToZoom(10_000_000, IIDA_LAT, 600, MIN_ZOOM, MAX_ZOOM)).toBe(MIN_ZOOM);
  });

  it("地区の範囲が入るカメラの距離は、地区の幅より長い", () => {
    const bounds = DISTRICT_BOUNDS.kamisato;
    const widthMeters = (bounds.east - bounds.west) * 111320 * Math.cos((IIDA_LAT * Math.PI) / 180);
    expect(rangeForBounds(bounds)).toBeGreaterThan(widthMeters);
    expect(boundsCenter(bounds)).toEqual({ lat: (35.5086 + 35.54) / 2, lng: (137.8205 + 137.8574) / 2 });
  });
});

describe("タップした所にいちばん近い点（032）", () => {
  const target = { lat: IIDA_LAT, lng: 137.82 };
  // ズーム16では1ピクセルが約1.9m
  const zoom = 16;
  const offsetMeters = (pixels: number) => (pixels * metersPerPixel(IIDA_LAT, zoom)) / 110574;

  it("指の幅（22px）以内でいちばん近い点を選ぶ", () => {
    const far = { lat: IIDA_LAT + offsetMeters(15), lng: 137.82, name: "15px" };
    const near = { lat: IIDA_LAT + offsetMeters(5), lng: 137.82, name: "5px" };
    expect(nearestWithin([far, near], target, zoom, 22)?.name).toBe("5px");
  });

  it("22px より遠い点しかなければ、何も選ばない", () => {
    const tooFar = { lat: IIDA_LAT + offsetMeters(40), lng: 137.82 };
    expect(nearestWithin([tooFar], target, zoom, 22)).toBeNull();
    expect(nearestWithin([], target, zoom, 22)).toBeNull();
  });
});
