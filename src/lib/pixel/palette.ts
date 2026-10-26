// すべてのドット絵で共通に使う16色（要件 8.1）。絵の元データでは1文字で色を指す。
// 1色を何通りにも使い回す（肌色は土の道、灰色は道路や石垣にも使う）ことで16色に収めている。
// 色を足すと全部の絵の見た目が変わるので、足すときはまさゆきさんに見てもらう
export const PALETTE = [
  { key: "k", name: "墨（輪郭・影）", hex: "#2B2A26" },
  { key: "w", name: "白（雲・雪・壁）", hex: "#FFFDF8" },
  { key: "p", name: "薄い空", hex: "#D3EAF0" },
  { key: "s", name: "空", hex: "#8CC2DA" },
  { key: "b", name: "青（川・服）", hex: "#3C78A8" },
  { key: "m", name: "遠い山", hex: "#5E8A93" },
  { key: "d", name: "深緑（森・影）", hex: "#2F5E45" },
  { key: "g", name: "緑（草地）", hex: "#5E9A4E" },
  { key: "l", name: "若草", hex: "#A9CC6A" },
  { key: "c", name: "桜", hex: "#F2A9BA" },
  { key: "r", name: "赤（屋根・紅葉）", hex: "#C2526B" },
  { key: "o", name: "橙", hex: "#D9822B" },
  { key: "y", name: "黄", hex: "#F2D06B" },
  { key: "f", name: "肌・土の道", hex: "#F0C9A0" },
  { key: "n", name: "茶（木・髪）", hex: "#7A4E2D" },
  { key: "a", name: "灰（道路・石）", hex: "#A39E93" },
] as const;

export type ColorKey = (typeof PALETTE)[number]["key"];

// 元データで透明を表す文字
export const TRANSPARENT = ".";

// 色の文字 → 色の番号（1から。0は透明）
export const COLOR_INDEX: Readonly<Record<ColorKey, number>> = Object.fromEntries(
  PALETTE.map((color, index) => [color.key, index + 1]),
) as Record<ColorKey, number>;

export function colorIndex(key: string): number {
  if (key === TRANSPARENT) return 0;
  const index = (COLOR_INDEX as Record<string, number>)[key];
  if (index === undefined) throw new Error(`パレットにない色の文字です: "${key}"`);
  return index;
}
