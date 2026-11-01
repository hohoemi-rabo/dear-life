// 02 くらしを見る から移る先。条件と今の季節を URL に載せたまま移る（F-02）。
// 季節も渡すのは、カルテの「くらしに戻る」で同じ季節に戻れるようにするため（019）
import type { KarteCard } from "../conditions/labels.ts";
import type { Conditions } from "../conditions/model.ts";
import type { Season } from "../conditions/scene.ts";
import { writeConditions } from "../conditions/url.ts";
import { karteDetailPath } from "../karte/entries.ts";
import { KARTE_PATH } from "../site.ts";
import { SEASON_PARAM, SEASON_SLUGS } from "./season.ts";

// 条件と季節（URL の s の値。なければ付けない）を載せたリンク先。カルテ・地区くらべのあいだを行き来しても、
// くらしに戻ったときに見ていた季節で開けるように、どの画面でも s を持ち回る
export function seasonalHref(path: string, conditions: Conditions, seasonSlug: string | null, hash?: string): string {
  const params = writeConditions(conditions, new URLSearchParams(seasonSlug ? { [SEASON_PARAM]: seasonSlug } : {}));
  return `${path}?${params.toString()}${hash ? `#${hash}` : ""}`;
}

// card を渡すと、その項目の詳細のページ（図鑑の1ページ。028）へ移る（F-14）
export function karteHref(conditions: Conditions, season: Season, card?: KarteCard): string {
  return seasonalHref(card ? karteDetailPath(card) : KARTE_PATH, conditions, SEASON_SLUGS[season]);
}
