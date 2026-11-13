// 住まいの相場の出し方（要件 5章-4・5、4章の家の行）。値の丸めは formatManYen に任せ、ここでは計算と並べ方だけを決める
import type { Housing } from "../conditions/labels.ts";
import type { MarketCategory } from "../data/screen-data.ts";

// 「200㎡なら約○万円（土地のみ）」の広さ
export const EXAMPLE_LAND_AREA = 200;

export function landEstimateForExampleArea(medianPerSquareMeter: number): number {
  return medianPerSquareMeter * EXAMPLE_LAND_AREA;
}

export const MARKET_CATEGORY_LABELS: Readonly<Record<MarketCategory, string>> = {
  land: "土地（宅地）",
  house_built_within_20y: "中古戸建て（築20年以内）",
  house_built_over_20y: "中古戸建て（築21年以上）",
};

// 選んだ家に近い相場を先に出す。新しめ＝築20年以内、古め＝築21年以上、借りる＝売買は参考なので既定の並び
export function marketCategoryOrder(housing: Housing): readonly MarketCategory[] {
  switch (housing) {
    case "new":
      return ["house_built_within_20y", "land", "house_built_over_20y"];
    case "old":
      return ["house_built_over_20y", "land", "house_built_within_20y"];
    case "rent":
      return ["land", "house_built_within_20y", "house_built_over_20y"];
  }
}

// カルテの住まいの詳細で見比べる中古戸建ての2つ。並びは選んだ家によらず、左が築20年以内・右が築21年以上（040。2026-11-13 まさゆきさん）
export const HOUSE_CATEGORIES = ["house_built_within_20y", "house_built_over_20y"] as const;
export type HouseCategory = (typeof HOUSE_CATEGORIES)[number];

export const HOUSE_AGE_LABELS: Readonly<Record<HouseCategory, string>> = {
  house_built_within_20y: "築20年以内",
  house_built_over_20y: "築21年以上",
};

// 選んだ条件の中古戸建て。借りるときはどちらでもない（家賃のカードを選んだ条件として出す）
export function chosenHouseCategory(housing: Housing): HouseCategory | null {
  if (housing === "new") return "house_built_within_20y";
  if (housing === "old") return "house_built_over_20y";
  return null;
}
