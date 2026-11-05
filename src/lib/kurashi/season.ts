// 02 くらしを見るの季節（F-11）。今の季節は URL の s に持ち、カルテから戻ったときや共有したときも同じ季節で開く。
// 知らない値・値なしは春（最初は春を出す。ランダムにしない）
import type { Season } from "../conditions/scene.ts";

export const SEASON_PARAM = "s";

export const SEASON_SLUGS: Readonly<Record<Season, "spring" | "summer" | "autumn" | "winter">> = {
  春: "spring",
  夏: "summer",
  秋: "autumn",
  冬: "winter",
};

const SEASON_BY_SLUG = new Map(Object.entries(SEASON_SLUGS).map(([season, slug]) => [slug as string, season as Season]));

export function parseSeason(value: string | null): Season {
  return (value !== null && SEASON_BY_SLUG.get(value)) || "春";
}
