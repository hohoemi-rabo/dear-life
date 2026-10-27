// 地図（021）への行き来。条件と、くらしで見ていた季節（s）を URL に残したまま移る（F-02）。
// 「カルテに戻る」は地区くらべと共通の karteBackHref（@/lib/karte/links）
import type { Conditions } from "../conditions/model.ts";
import { seasonalHref } from "../kurashi/links.ts";
import { MAP_PATH } from "../site.ts";

export function mapHref(conditions: Conditions, seasonSlug: string | null): string {
  return seasonalHref(MAP_PATH, conditions, seasonSlug);
}
