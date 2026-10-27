// 表示の切り替えに添える、種類ごとの状態と4地区の件数（021）。件数は並べるだけで、多い少ないの判定はしない
import type { DataState, SourceInfo } from "../data/screen-data.ts";
import type { MapData, MapPointKind } from "./map-data.ts";

export type LayerSummary = { status: "unavailable" } | { status: "none" | "available"; count: number; source: SourceInfo };

// 種類ごとの出典は4地区で同じなので、どこかの地区が未取得なら、その種類は「データ未取得」
function summarize(states: readonly DataState<readonly unknown[]>[]): LayerSummary {
  let count = 0;
  let source: SourceInfo | null = null;
  for (const state of states) {
    if (state.status === "unavailable") return { status: "unavailable" };
    source = state.source;
    if (state.status === "available") count += state.value.length;
  }
  if (source === null) return { status: "unavailable" };
  return { status: count === 0 ? "none" : "available", count, source };
}

export function pointKindSummary(data: MapData, kind: MapPointKind): LayerSummary {
  return summarize(data.districtOrder.map((district) => data.districts[district].points[kind]));
}

export function schoolDistrictSummary(data: MapData): LayerSummary {
  return summarize(data.districtOrder.map((district) => data.districts[district].elementarySchoolDistricts));
}
