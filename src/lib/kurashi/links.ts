// 02 くらしを見る から移る先。条件と今の季節を URL に載せたまま移る（F-02）。
// 季節も渡すのは、カルテの「くらしに戻る」で同じ季節に戻れるようにするため（019）
import { karteCardAnchor, type KarteCard } from "../conditions/labels.ts";
import type { Conditions } from "../conditions/model.ts";
import type { Season } from "../conditions/scene.ts";
import { writeConditions } from "../conditions/url.ts";
import { KARTE_PATH } from "../site.ts";
import { SEASON_PARAM, SEASON_SLUGS } from "./season.ts";

export function karteHref(conditions: Conditions, season: Season, card?: KarteCard): string {
  const params = writeConditions(conditions, new URLSearchParams({ [SEASON_PARAM]: SEASON_SLUGS[season] }));
  return `${KARTE_PATH}?${params.toString()}${card ? `#${karteCardAnchor(card)}` : ""}`;
}
