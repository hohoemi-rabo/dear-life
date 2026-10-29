// npm run illust（scripts/build-illust.mjs）が書くファイル。手で直さない。
// 切り出した人物の WebP の大きさ（px）。画面で家族を並べる位置の計算に使う
import type { Housing } from "../conditions/labels.ts";
import type { PropId, SpriteId } from "./assets.ts";

export const SPRITE_SIZES: Record<SpriteId, { width: number; height: number }> = {
  "father-stand": { width: 138, height: 310 },
  "father-joy": { width: 149, height: 308 },
  "mother-stand": { width: 125, height: 290 },
  "mother-joy": { width: 187, height: 300 },
  "boy-stand": { width: 107, height: 226 },
  "boy-joy": { width: 151, height: 219 },
  "girl-stand": { width: 148, height: 210 },
  "girl-joy": { width: 140, height: 210 },
  "father-back": { width: 134, height: 309 },
  "mother-back": { width: 122, height: 287 },
  "boy-back": { width: 102, height: 221 },
  "girl-back": { width: 146, height: 209 },
};

// ふちを切り落とした家の大きさ（元の画像の px）。縦横の比を画面で使う
export const HOUSE_SIZES: Record<Housing, { width: number; height: number }> = {
  new: { width: 1401, height: 889 },
  old: { width: 1461, height: 982 },
  rent: { width: 1429, height: 810 },
};

// ふちを切り落とした車・バス停などの小物の大きさ（元の画像の px）。縦横の比を画面で使う
export const PROP_SIZES: Record<PropId, { width: number; height: number }> = {
  "car-white": { width: 561, height: 382 },
  "car-blue": { width: 556, height: 383 },
  "bus-stop": { width: 1095, height: 842 },
  "station-wide": { width: 825, height: 331 },
};
