import type { Season } from "@/lib/conditions/scene";
import type { PixelAssetId } from "@/lib/pixel/assets";

// 季節のアクセント色。ドット絵の側（季節の切り替え・場面の絵のまわり）だけで使い、実データの側には使わない（要件 8.1）。
// Tailwind が見つけられるよう、クラス名は省略せずに書く
export const SEASON_STYLES: Readonly<Record<Season, { selected: string; label: string }>> = {
  春: { selected: "border-spring bg-spring-soft text-spring", label: "bg-spring" },
  夏: { selected: "border-summer bg-summer-soft text-summer", label: "bg-summer" },
  秋: { selected: "border-autumn bg-autumn-soft text-autumn", label: "bg-autumn" },
  冬: { selected: "border-winter bg-winter-soft text-winter", label: "bg-winter" },
};

// 季節のアイコン（タブ・場面の見出し・サムネイル。027）
export const SEASON_ICONS = {
  春: "icon-spring",
  夏: "icon-summer",
  秋: "icon-autumn",
  冬: "icon-winter",
} as const satisfies Readonly<Record<Season, PixelAssetId>>;
