export type CountLevel = "enough" | "moderate" | "few";

export type CountLabel = {
  level: CountLevel;
  text: string;
};

// 件数ラベル（要件 5章-6）。11〜29件の文言は要件の案「参考になる件数」を使っている（まさゆきさんに提案中）
export function countLabel(count: number): CountLabel {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError(`件数は0以上の整数で渡してください: ${count}`);
  }
  if (count >= 30) return { level: "enough", text: "件数じゅうぶん" };
  if (count <= 10) return { level: "few", text: "件数少なめ・参考程度" };
  return { level: "moderate", text: "参考になる件数" };
}
