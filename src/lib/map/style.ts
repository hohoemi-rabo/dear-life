// 地図（021・032）の点の色・最初に見せる範囲・動かせる範囲。Google マップの本体は読み込まないので、テストからも使える
import type { DistrictId } from "../town-district/resolve.ts";
import type { MapPointKind } from "./map-data.ts";

// 地図の色は、種類を見分けるためだけに使う（良し悪しの意味は持たせない）。実データの側の基本色に、見分けのつく色を足している
export const POINT_STYLES: Readonly<Record<MapPointKind, { label: string; color: string }>> = {
  schools: { label: "学校", color: "#1F5C45" },
  childcare: { label: "保育園・幼稚園など", color: "#B0457A" },
  after_school_clubs: { label: "放課後児童クラブ", color: "#8A5A12" },
  bus_stops: { label: "バス停", color: "#2A73A8" },
  train_stations: { label: "駅", color: "#2B2A26" },
  evacuation_sites: { label: "避難場所", color: "#C2591A" },
};

// 小学校区の面の色。学校ごとに順に割り当てる（4地区の小学校は6校）
export const SCHOOL_DISTRICT_COLORS: readonly string[] = ["#2A73A8", "#B65A17", "#6B5BA8", "#1F5C45", "#B0457A", "#8A7A12"];

export function schoolDistrictColor(index: number): string {
  return SCHOOL_DISTRICT_COLORS[index % SCHOOL_DISTRICT_COLORS.length];
}

// 学区の面の塗りの濃さ（16進の不透明度。0x2E ≒ 18%）。地図の文字や建物が透けて見えるくらいにする
export const SCHOOL_DISTRICT_FILL_ALPHA = "2E";

// 緯度経度の四角（Google マップの LatLngBoundsLiteral と同じ形）
export type Bounds = { west: number; south: number; east: number; north: number };

// 地区ごとに最初に見せる範囲。地区の施設の点が入る範囲を、2026-10-27 の facilities から決めた。
// 出典が未公開で点がなくても地区の場所を見せられるように、データからではなくここに持つ
export const DISTRICT_BOUNDS: Readonly<Record<DistrictId, Bounds>> = {
  kamisato: { west: 137.8205, south: 35.5086, east: 137.8574, north: 35.54 },
  kanae: { west: 137.795, south: 35.4909, east: 137.8439, north: 35.5178 },
  igara: { west: 137.7795, south: 35.4779, east: 137.8129, north: 35.5097 },
  chushin: { west: 137.7908, south: 35.4955, east: 137.8415, north: 35.5377 },
};

// 地区を選んでいないときは4地区がまとめて入る範囲
export const ALL_DISTRICTS_BOUNDS: Bounds = { west: 137.7795, south: 35.4779, east: 137.8574, north: 35.54 };

// 地図を動かせる範囲（飯田市のまわり）。遠くへ行きすぎて、何もない地図にならないように
export const MAX_BOUNDS: Bounds = { west: 137.55, south: 35.3, east: 138.1, north: 35.75 };

// 平面の地図のズーム。地区を見るのに市より広くは要らない
export const MIN_ZOOM = 10;
export const MAX_ZOOM = 20;

// 立体で見るときの傾き（0 で真上、90 で真横）
export const TILTED_PITCH = 60;

export function districtBounds(district: DistrictId | null): Bounds {
  return district === null ? ALL_DISTRICTS_BOUNDS : DISTRICT_BOUNDS[district];
}
