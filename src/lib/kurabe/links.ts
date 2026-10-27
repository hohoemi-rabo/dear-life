// 地区くらべ（020）への行き来。条件と、くらしで見ていた季節（s）を URL に残したまま移る（F-02）。
// 「カルテに戻る」は地図と共通の karteBackHref（@/lib/karte/links）
import type { Conditions } from "../conditions/model.ts";
import { seasonalHref } from "../kurashi/links.ts";
import { KURABE_PATH } from "../site.ts";

export function kurabeHref(conditions: Conditions, seasonSlug: string | null): string {
  return seasonalHref(KURABE_PATH, conditions, seasonSlug);
}
