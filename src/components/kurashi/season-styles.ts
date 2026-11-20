import type { Season } from "@/lib/conditions/scene";
import type { PropId } from "@/lib/illust/assets";

// 季節のアクセント色。ドット絵の側（季節の切り替え・場面の絵のまわり）だけで使い、実データの側には使わない（要件 8.1）。
// Tailwind が見つけられるよう、クラス名は省略せずに書く
export const SEASON_STYLES: Readonly<Record<Season, { selected: string; label: string }>> = {
  春: { selected: "border-spring bg-spring-soft text-spring-ink", label: "bg-spring" },
  夏: { selected: "border-summer bg-summer-soft text-summer-ink", label: "bg-summer" },
  秋: { selected: "border-autumn bg-autumn-soft text-autumn-ink", label: "bg-autumn" },
  冬: { selected: "border-winter bg-winter-soft text-winter-ink", label: "bg-winter" },
};

// 季節の切り替えのタブの印（2026-11-17 まさゆきさんが用意した生成AIの絵。それまではコードで描いたドット絵）
export const SEASON_ICONS = {
  春: "season-tab-spring",
  夏: "season-tab-summer",
  秋: "season-tab-autumn",
  冬: "season-tab-winter",
} as const satisfies Readonly<Record<Season, PropId>>;
