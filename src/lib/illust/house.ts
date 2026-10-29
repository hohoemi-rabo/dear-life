// えらぶの「わが家のプレビュー」に家を建てる（028）。家族の後ろ、少し右寄りに建てる（見本の 03）。
// 位置は家族と同じく背景に対する割合（％）で持ち、画面の幅が変わっても背景と一緒に伸び縮みさせる
import type { Housing } from "../conditions/labels.ts";
import { ILLUST_PICTURES, type ErabuBaseId } from "./assets.ts";
import { HOUSE_SIZES } from "./sprites.ts";

// 背景ごとの建てる場所。footY は家の土台の高さ、width はいちばん大きい家（古め）の幅（どちらも背景に対する割合）
const LOTS: Record<ErabuBaseId, { centerX: number; footY: number; width: number }> = {
  // 手前の広場の奥。家族（足もと 94%）より上に土台を置き、家族が家の前に立つように見せる
  "erabu-kamisato-base": { centerX: 60, footY: 82, width: 68 },
  // 上郷以外の地区の仮の背景。街並みを隠しすぎないよう少し小さめに
  "erabu-iida-overview": { centerX: 58, footY: 84, width: 52 },
};

export type HousePlacement = {
  centerX: number;
  footY: number;
  // 幅・高さ（背景に対する％）
  width: number;
  height: number;
};

// 家ごとの横幅は元の絵の幅の比で決める（どの家も同じ倍率で縮め、アパートは横に広く、古めの家は大きく見せる）
export function placeHouse(housing: Housing, background: ErabuBaseId): HousePlacement {
  const lot = LOTS[background];
  const picture = ILLUST_PICTURES[background];
  const widest = Math.max(...Object.values(HOUSE_SIZES).map(({ width }) => width));
  const size = HOUSE_SIZES[housing];
  const width = (size.width / widest) * lot.width;
  // 高さ（％）＝ 幅（％）× 家の縦横の比 × 背景の横縦の比
  const height = width * (size.height / size.width) * (picture.width / picture.height);
  return { centerX: lot.centerX, footY: lot.footY, width, height };
}
