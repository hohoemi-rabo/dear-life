// 「借りる」を選んだ人に出す家賃の参考値と、地区の借家の世帯数の出し方（034）。
// 家賃は住宅・土地統計調査の飯田市全体の平均で、地区の値でも今の募集家賃でもない。そのことを必ず添える
import type { HousingTenure, RentReference } from "../data/screen-data.ts";

export const RENT_TITLE = "飯田市の民営借家の家賃の平均";

// 家賃の参考値に必ず添える断り書き（要件 5章の相場の注意書きにならう）
export const RENT_NOTICE = "飯田市全体の平均で、地区ごとの値ではありません。今募集している物件の家賃でもありません。";

// 建て方ごとの家賃の名前。全体は RENT_TITLE で出すので入れない
export const RENT_BUILDING_LABELS = {
  detached: "一戸建",
  apartmentWooden: "共同住宅（木造）",
  apartmentNonWooden: "共同住宅（木造以外）",
} as const satisfies Partial<Record<keyof RentReference, string>>;

export type RentBreakdownRow = { label: string; rent: number };

// 推計できた建て方だけを、一戸建 → 共同住宅（木造）→ 共同住宅（木造以外）の順に並べる
export function rentBreakdown(rent: RentReference): RentBreakdownRow[] {
  return (Object.keys(RENT_BUILDING_LABELS) as (keyof typeof RENT_BUILDING_LABELS)[]).flatMap((key) => {
    const value = rent[key];
    return value === null ? [] : [{ label: RENT_BUILDING_LABELS[key], rent: value }];
  });
}

// 家賃は抽出の調査からの推計値なので、円の位まで出さず「約5.0万円」にする（1か月あたり）
export function formatRentManYen(yen: number): string {
  if (!Number.isFinite(yen) || yen <= 0) throw new RangeError(`家賃は0より大きい数で渡してください: ${yen}`);
  return `約${(yen / 10000).toFixed(1)}万円`;
}

// 住宅に住む一般世帯のうち、民営の借家に住む世帯の割合（整数の%）。点数ではなく、事実として出す
export function renterSharePercent(tenure: HousingTenure): number {
  if (tenure.householdsInHousing === 0) return 0;
  return Math.round((tenure.privateRented / tenure.householdsInHousing) * 100);
}
