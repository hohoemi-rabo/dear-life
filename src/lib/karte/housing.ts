// 住まいカードの相場の出し方（要件 5章-4・5、4章の家の行）。値の丸めは formatManYen に任せ、ここでは計算と並べ方だけを決める
import type { Housing } from "../conditions/labels.ts";
import type { MarketCategory } from "../data/screen-data.ts";

// 1坪＝3.3058㎡（要件 5章-4）
export const SQUARE_METERS_PER_TSUBO = 3.3058;
// 「200㎡（約60坪）なら約○万円」の広さ
export const EXAMPLE_LAND_AREA = 200;

export function landEstimates(medianPerSquareMeter: number): { perTsubo: number; forExampleArea: number } {
  return {
    perTsubo: medianPerSquareMeter * SQUARE_METERS_PER_TSUBO,
    forExampleArea: medianPerSquareMeter * EXAMPLE_LAND_AREA,
  };
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

export const NO_RENT_DATA = "家賃の情報はまだありません。";
