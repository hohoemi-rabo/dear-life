// 02 くらしを見るの季節（F-11）。今の季節は URL の s に持ち、カルテから戻ったときや共有したときも同じ季節で開く。
// 知らない値・値なしは春（最初は春を出す。ランダムにしない）
import type { SceneAxis, Season } from "../conditions/scene.ts";
import type { Season as PixelSeason } from "../pixel/assets.ts";

export const SEASON_PARAM = "s";

// URL の値はドット絵の季節の名前と同じにする
export const SEASON_SLUGS: Readonly<Record<Season, PixelSeason>> = {
  春: "spring",
  夏: "summer",
  秋: "autumn",
  冬: "winter",
};

const SEASON_BY_SLUG = new Map(Object.entries(SEASON_SLUGS).map(([season, slug]) => [slug as string, season as Season]));

export function parseSeason(value: string | null): Season {
  return (value !== null && SEASON_BY_SLUG.get(value)) || "春";
}

// 場面の見出し（「春｜入園・入学の季節」）とサムネイルの短い名前
export const SCENE_AXIS_LABELS: Readonly<Record<SceneAxis, { title: string; short: string }>> = {
  "spring-school": { title: "入園・入学の季節", short: "入園・入学" },
  "spring-public-facility": { title: "地区を見てまわる", short: "地区の公共施設" },
  "summer-evacuation": { title: "大雨と避難", short: "大雨と避難" },
  "autumn-events": { title: "地区の行事", short: "地区の行事" },
  "winter-transit": { title: "雪の日に、車を使わずに出かける", short: "バス・電車で移動" },
  "winter-car": { title: "雪・凍結と車の移動", short: "雪・凍結と移動" },
};
