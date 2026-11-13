// 地図（021）への行き来。条件と、くらしで見ていた季節（s）を URL に残したまま移る（F-02）。
// 「カルテに戻る」は地区くらべと共通の karteBackHref（@/lib/karte/links）
import type { Conditions } from "../conditions/model.ts";
import { seasonalHref } from "../kurashi/links.ts";
import { MAP_PATH } from "../site.ts";
import type { MapPointKind } from "./map-data.ts";

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

// カルテの「地図で場所を見る」で、最初にチェックを入れる種類（子育て・学校は 039、防災・交通は 040）。
// transit は交通の「行ける場所」「冬のおでかけ」のタブから：乗る場所のバス停と駅の両方（2026-11-13 まさゆきさん）
const FACILITY_LAYER_KINDS = {
  schools: ["schools"],
  childcare: ["childcare"],
  after_school_clubs: ["after_school_clubs"],
  bus_stops: ["bus_stops"],
  train_stations: ["train_stations"],
  evacuation_sites: ["evacuation_sites"],
  transit: ["bus_stops", "train_stations"],
} as const satisfies Record<string, readonly MapPointKind[]>;
export type FacilityLayer = keyof typeof FACILITY_LAYER_KINDS;

export function facilityMapHref(conditions: Conditions, seasonSlug: string | null, layer: FacilityLayer): string {
  return `${mapHref(conditions, seasonSlug)}&${MAP_LAYER_PARAM}=${layer}`;
}

// URL の layer から、最初に出す種類。知らない値なら null（ふだんの見え方で開く）
export function facilityLayerKinds(value: string | null): readonly MapPointKind[] | null {
  return value !== null && Object.hasOwn(FACILITY_LAYER_KINDS, value) ? FACILITY_LAYER_KINDS[value as FacilityLayer] : null;
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

// 飯田市の空き家バンクのページ（カルテの住まいの「物件情報を探す ↗」。040。2026-11-13 まさゆきさん）。データは取り込まず、リンクだけにする
export const IIDA_AKIYA_BANK = {
  name: "飯田市の空き家バンク",
  url: "https://www.city.iida.lg.jp/site/yuiturn/akiya.html",
} as const;

// Google マップで施設を探す URL（別のタブで開く。カルテの防災・公共施設の「地図で見る」。040）。送るのは市が公開している施設の名前と住所だけで、
// 選んだ地区や家族などの条件は送らない（F-02）。住所がなければ市の名前を添えて、ほかの町の同じ名前の施設に行かないようにする
const FALLBACK_AREA = "長野県飯田市";

export function googleMapsSearchHref(site: { name: string; address: string | null }): string {
  const query = `${site.name} ${site.address ?? FALLBACK_AREA}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
