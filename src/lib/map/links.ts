// 地図（021）への行き来。条件と、くらしで見ていた季節（s）を URL に残したまま移る（F-02）。
// 「カルテに戻る」は地区くらべと共通の karteBackHref（@/lib/karte/links）
import type { Conditions } from "../conditions/model.ts";
import { seasonalHref } from "../kurashi/links.ts";
import { MAP_PATH } from "../site.ts";

export function mapHref(conditions: Conditions, seasonSlug: string | null): string {
  return seasonalHref(MAP_PATH, conditions, seasonSlug);
}

// 飯田市の公開型 GIS「いいだWebまっぷ」の案内ページ（2026-11-07 確認。021・032）。データは取り込まず、詳しく調べたい人へのリンクだけにする。
// 地図そのもの（iida.geocloud.jp）ではなく、利用規約の案内がある市のページへつなぐ
export const IIDA_WEB_MAP = {
  name: "いいだWebまっぷ（飯田市）",
  url: "https://www.city.iida.lg.jp/soshiki/168/iidawebmap.html",
} as const;
