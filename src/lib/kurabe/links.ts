// 地区くらべ（020）への行き来。条件と、くらしで見ていた季節（s）を URL に残したまま移る（F-02）
import type { Conditions } from "../conditions/model.ts";
import { seasonalHref } from "../kurashi/links.ts";
import { SEASON_PARAM } from "../kurashi/season.ts";
import { KARTE_PATH, KURABE_PATH } from "../site.ts";

type ReadableParams = { get(name: string): string | null };

export function kurabeHref(conditions: Conditions, seasonSlug: string | null): string {
  return seasonalHref(KURABE_PATH, conditions, seasonSlug);
}

// 地区くらべから「カルテに戻る」
export function karteFromKurabeHref(conditions: Conditions, current: ReadableParams): string {
  return seasonalHref(KARTE_PATH, conditions, current.get(SEASON_PARAM));
}
