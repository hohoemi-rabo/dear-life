// 地区くらべ（020）への行き来。条件と、くらしで見ていた季節（s）を URL に残したまま移る（F-02）。
// 「カルテに戻る」は地図と共通の karteBackHref（@/lib/karte/links）
import type { Conditions } from "../conditions/model.ts";
import { seasonalHref } from "../kurashi/links.ts";
import { KURABE_PATH } from "../site.ts";
import { COMPARE_TOPICS, type CompareTopic } from "./compare.ts";

// 今見ているタブは URL の t に持つ（くらしの季節 s と同じ。共有・再読み込みで同じタブが開く）。all はすべての項目の一覧。
// 知らない値・値なしは最初のタブ
export const COMPARE_VIEW_PARAM = "t";
export type CompareView = CompareTopic | "all";

export function parseCompareView(value: string | null): CompareView {
  if (value === "all") return "all";
  return COMPARE_TOPICS.find((topic) => topic === value) ?? COMPARE_TOPICS[0];
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
