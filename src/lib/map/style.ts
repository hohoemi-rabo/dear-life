// 地図（021）の下地・点の色・最初に見せる範囲。MapLibre の本体は読み込まない（型だけ）ので、テストからも使える
import type { LngLatBoundsLike, StyleSpecification } from "maplibre-gl";
import type { DistrictId } from "../town-district/resolve.ts";
import type { MapPointKind } from "./map-data.ts";

// 地理院タイル（国土地理院）。ウェブでリアルタイムに読み込むなら、出典の明示だけで申請は要らない。
// 出典は「地理院タイル」などと書き、タイル一覧のページへリンクする（2026-10-27 にタイル一覧のページで確認）
export const GSI_TILE_LIST_URL = "https://maps.gsi.go.jp/development/ichiran.html";
const GSI_ATTRIBUTION = `<a href="${GSI_TILE_LIST_URL}" target="_blank" rel="noopener noreferrer">地理院タイル</a>`;
// 写真のズーム9〜13は全国ランドサットモザイク画像なので、タイル一覧の指定どおりの出所も書く
// （ズーム14以上の全国最新写真の一部に使われる GRUS 画像は、範囲が北緯20度付近だけなので飯田には関係ない）
const LANDSAT_ATTRIBUTION =
  "データソース：Landsat8画像（GSI,TSIC,GEO Grid/AIST）, Landsat8画像（courtesy of the U.S. Geological Survey）, 海底地形（GEBCO）";

const GSI = "https://cyberjapandata.gsi.go.jp/xyz";

export type BaseMap = "standard" | "photo";

export const BASE_MAP_LABELS: Readonly<Record<BaseMap, string>> = { standard: "地図", photo: "航空写真" };

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

// 地区ごとに最初に見せる範囲（[西, 南], [東, 北]）。地区の施設の点が入る範囲を、2026-10-27 の facilities から決めた。
// 出典が未公開で点がなくても地区の場所を見せられるように、データからではなくここに持つ
export const DISTRICT_BOUNDS: Readonly<Record<DistrictId, [[number, number], [number, number]]>> = {
  kamisato: [[137.8205, 35.5086], [137.8574, 35.54]],
  kanae: [[137.795, 35.4909], [137.8439, 35.5178]],
  igara: [[137.7795, 35.4779], [137.8129, 35.5097]],
  chushin: [[137.7908, 35.4955], [137.8415, 35.5377]],
};

// 地区を選んでいないときは4地区がまとめて入る範囲
export const ALL_DISTRICTS_BOUNDS: [[number, number], [number, number]] = [[137.7795, 35.4779], [137.8574, 35.54]];

// 地図を動かせる範囲（飯田市のまわり）。遠くへ行きすぎて、何もない地図にならないように
export const MAX_BOUNDS: LngLatBoundsLike = [[137.55, 35.3], [138.1, 35.75]];

// 標準地図はズーム5〜8だと GEBCO などの出所も要る。地区を見るには9より引く必要がないので、9より引けないようにする
export const MIN_ZOOM = 9;
export const MAX_ZOOM = 18;

// 立体で見るときの傾きと、標高の強調。飯田の段丘と山が分かるくらいに少し強める
export const TILTED_PITCH = 60;
export const TERRAIN_EXAGGERATION = 1.5;

export const SOURCE_IDS = { standard: "gsi-standard", photo: "gsi-photo", dem: "gsi-dem" } as const;
export const BASE_LAYER_IDS: Readonly<Record<BaseMap, string>> = { standard: "base-standard", photo: "base-photo" };
export const HILLSHADE_LAYER_ID = "hillshade";

// 下地だけのスタイル。施設の点・学区の面は、地図ができてから足す（データの読み込みと分けるため）
export function baseMapStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      [SOURCE_IDS.standard]: {
        type: "raster",
        tiles: [`${GSI}/std/{z}/{x}/{y}.png`],
        tileSize: 256,
        minzoom: 5,
        maxzoom: 18,
        attribution: GSI_ATTRIBUTION,
      },
      [SOURCE_IDS.photo]: {
        type: "raster",
        tiles: [`${GSI}/seamlessphoto/{z}/{x}/{y}.jpg`],
        tileSize: 256,
        minzoom: 2,
        maxzoom: 18,
        attribution: `${GSI_ATTRIBUTION}（写真） ${LANDSAT_ATTRIBUTION}`,
      },
      // 標高タイル（DEM10B の PNG）。高さ(m) = (R×2^16 + G×2^8 + B) × 0.01。
      // 2^23 以上は負の値・(128,0,0) は値なしだが、飯田には海も標高0m未満もないので、足し算だけの custom にする
      [SOURCE_IDS.dem]: {
        type: "raster-dem",
        tiles: [`${GSI}/dem_png/{z}/{x}/{y}.png`],
        tileSize: 256,
        minzoom: 1,
        maxzoom: 14,
        encoding: "custom",
        redFactor: 655.36,
        greenFactor: 2.56,
        blueFactor: 0.01,
        baseShift: 0,
        attribution: `${GSI_ATTRIBUTION}（標高）`,
      },
    },
    layers: [
      { id: BASE_LAYER_IDS.standard, type: "raster", source: SOURCE_IDS.standard },
      { id: BASE_LAYER_IDS.photo, type: "raster", source: SOURCE_IDS.photo, layout: { visibility: "none" } },
      // 立体のときだけ出す陰影。起伏が分かりやすくなる
      {
        id: HILLSHADE_LAYER_ID,
        type: "hillshade",
        source: SOURCE_IDS.dem,
        layout: { visibility: "none" },
        paint: { "hillshade-exaggeration": 0.3, "hillshade-shadow-color": "#473B24" },
      },
    ],
  };
}

export function districtBounds(district: DistrictId | null): [[number, number], [number, number]] {
  return district === null ? ALL_DISTRICTS_BOUNDS : DISTRICT_BOUNDS[district];
}
