// 地区くらべ（020）への行き来。条件と、くらしで見ていた季節（s）を URL に残したまま移る（F-02）。
// 「カルテに戻る」は地図と共通の karteBackHref（@/lib/karte/links）
import type { Conditions } from "../conditions/model.ts";
import { seasonalHref } from "../kurashi/links.ts";
import { DISTRICTS } from "../conditions/labels.ts";
import { KURABE_PATH } from "../site.ts";
import type { DistrictId } from "../town-district/resolve.ts";
import { COMPARE_TOPICS, type CompareTopic } from "./compare.ts";

// 今見ているタブは URL の t に持つ（くらしの季節 s と同じ。共有・再読み込みで同じタブが開く）。all はすべての項目の一覧。
// 知らない値・値なしは最初のタブ
export const COMPARE_VIEW_PARAM = "t";
export type CompareView = CompareTopic | "all";

export function parseCompareView(value: string | null): CompareView {
  if (value === "all") return "all";
  return COMPARE_TOPICS.find((topic) => topic === value) ?? COMPARE_TOPICS[0];
}

// スマホの比較相手は URL の v に持つ。all は4地区の一覧。
// 知らない値・値なし・選んだ地区と同じ値は、地区の並びで最初の別の地区。地区を選んでいなければ2地区にできないので一覧
export const COMPARE_TARGET_PARAM = "v";
export type CompareTarget = DistrictId | "all";

export function parseCompareTarget(value: string | null, selected: DistrictId | null): CompareTarget {
  if (selected === null || value === "all") return "all";
  const others = DISTRICTS.filter(({ id }) => id !== selected);
  return others.find(({ id }) => id === value)?.id ?? others[0].id;
}

// 条件と季節はそのままに、タブだけを変えた URL
export function compareViewHref(current: Iterable<[string, string]>, view: CompareView): string {
  const params = new URLSearchParams([...current]);
  params.set(COMPARE_VIEW_PARAM, view);
  return `${KURABE_PATH}?${params.toString()}`;
}

export function kurabeHref(conditions: Conditions, seasonSlug: string | null): string {
  return seasonalHref(KURABE_PATH, conditions, seasonSlug);
}
