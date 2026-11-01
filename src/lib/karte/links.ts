// カルテから移る先（019）。条件と、くらしで見ていた季節（s）を URL に残したまま移る（F-02）
import type { KarteCard } from "../conditions/labels.ts";
import type { Conditions } from "../conditions/model.ts";
import { seasonalHref } from "../kurashi/links.ts";
import { SEASON_PARAM } from "../kurashi/season.ts";
import { KARTE_PATH, KURASHI_PATH } from "../site.ts";
import { karteDetailPath } from "./entries.ts";

type ReadableParams = { get(name: string): string | null };

// 「くらしに戻る」：くらしの場面から来たときの季節で開く。季節がなければくらしは春で開く
export function kurashiHref(conditions: Conditions, current: ReadableParams): string {
  return seasonalHref(KURASHI_PATH, conditions, current.get(SEASON_PARAM));
}

// 地区くらべ（020）・地図（021）から「カルテに戻る」。季節も持ち回り、カルテからくらしに戻ったときに同じ季節で開く
export function karteBackHref(conditions: Conditions, current: ReadableParams): string {
  return seasonalHref(KARTE_PATH, conditions, current.get(SEASON_PARAM));
}

// 一覧のカードから、その項目の詳細のページ（図鑑の1ページ。028）へ。条件と季節を持ったまま移る
export function karteDetailHref(conditions: Conditions, card: KarteCard, current: ReadableParams): string {
  return seasonalHref(karteDetailPath(card), conditions, current.get(SEASON_PARAM));
}
