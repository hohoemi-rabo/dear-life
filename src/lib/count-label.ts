export type CountLevel = "enough" | "moderate" | "few";

export type CountLabel = {
  level: CountLevel;
  text: string;
};

export const FEW_COUNT_LABEL: CountLabel = { level: "few", text: "件数少なめ・参考程度" };

// 件数ラベル（要件 5章-6）。判定はここだけで行い、相場の件数（market_stats.sample_count）にもこれを当てる。
// 11〜29件の文言は「参考になる件数」（2026-10-24 にまさゆきさんと決めた）
export function countLabel(count: number): CountLabel {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError(`件数は0以上の整数で渡してください: ${count}`);
  }
  if (count >= 30) return { level: "enough", text: "件数じゅうぶん" };
  if (count <= 10) return FEW_COUNT_LABEL;
  return { level: "moderate", text: "参考になる件数" };
}
