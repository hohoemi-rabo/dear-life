// 地図（021）への行き来。条件と、くらしで見ていた季節（s）を URL に残したまま移る（F-02）。
// 「カルテに戻る」は地区くらべと共通の karteBackHref（@/lib/karte/links）
import type { Conditions } from "../conditions/model.ts";
import { seasonalHref } from "../kurashi/links.ts";
import { MAP_PATH } from "../site.ts";

export function mapHref(conditions: Conditions, seasonSlug: string | null): string {
  return seasonalHref(MAP_PATH, conditions, seasonSlug);
}

// 地図を開いたときに見せるもの（039）。school_districts は小学校区の塗り分けと学校だけを出す（カルテの学区のタブから）。
// schools・childcare・after_school_clubs はその種類の施設だけを出す（カルテの子育て・学校のほかのタブから）。
// 開いたあとに種類を切りかえても URL には書き戻さない（最初の見え方だけを決める）
export const MAP_LAYER_PARAM = "layer";
export const SCHOOL_DISTRICT_LAYER = "school_districts";

export function schoolDistrictMapHref(conditions: Conditions, seasonSlug: string | null): string {
  return `${mapHref(conditions, seasonSlug)}&${MAP_LAYER_PARAM}=${SCHOOL_DISTRICT_LAYER}`;
}

// カルテの子育て・学校の「地図で場所を見る」（039）。その種類の施設だけを出して開く
export const FACILITY_LAYERS = ["schools", "childcare", "after_school_clubs"] as const;
export type FacilityLayer = (typeof FACILITY_LAYERS)[number];

export function facilityMapHref(conditions: Conditions, seasonSlug: string | null, layer: FacilityLayer): string {
  return `${mapHref(conditions, seasonSlug)}&${MAP_LAYER_PARAM}=${layer}`;
}

export function isFacilityLayer(value: string | null): value is FacilityLayer {
  return (FACILITY_LAYERS as readonly (string | null)[]).includes(value);
}

// 飯田市の公開型 GIS「いいだWebまっぷ」の案内ページ（2026-11-07 確認。021・032）。データは取り込まず、詳しく調べたい人へのリンクだけにする。
// 地図そのもの（iida.geocloud.jp）ではなく、利用規約の案内がある市のページへつなぐ
export const IIDA_WEB_MAP = {
  name: "いいだWebまっぷ（飯田市）",
  url: "https://www.city.iida.lg.jp/soshiki/168/iidawebmap.html",
} as const;

// 飯田市の「防災ハザードマップで危険箇所を確認しましょう」のページ（2026-03-19 更新。いいだWebまっぷのハザードマップと
// 地区別の PDF の案内がある）。カルテの防災の帯から開く（040）。データは取り込まず、リンクだけにする
export const IIDA_HAZARD_MAP = {
  name: "飯田市のハザードマップ",
  url: "https://www.city.iida.lg.jp/soshiki/35/hazardmap.html",
} as const;
