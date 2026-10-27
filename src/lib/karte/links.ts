// カルテから移る先（019）。条件と、くらしで見ていた季節（s）を URL に残したまま移る（F-02）
import type { Conditions } from "../conditions/model.ts";
import { seasonalHref } from "../kurashi/links.ts";
import { SEASON_PARAM } from "../kurashi/season.ts";
import { KARTE_PATH, KURASHI_PATH } from "../site.ts";

type ReadableParams = { get(name: string): string | null };

// 「くらしに戻る」：くらしの場面から来たときの季節で開く。季節がなければくらしは春で開く
export function kurashiHref(conditions: Conditions, current: ReadableParams): string {
  return seasonalHref(KURASHI_PATH, conditions, current.get(SEASON_PARAM));
}

// 地区くらべ（020）・地図（021）から「カルテに戻る」。季節も持ち回り、カルテからくらしに戻ったときに同じ季節で開く
export function karteBackHref(conditions: Conditions, current: ReadableParams): string {
  return seasonalHref(KARTE_PATH, conditions, current.get(SEASON_PARAM));
}
