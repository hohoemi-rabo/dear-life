// npm run illust（scripts/build-illust.mjs）が書くファイル。手で直さない。
// 切り出した人物の WebP の大きさ（px）。画面で家族を並べる位置の計算に使う
import type { SpriteId } from "./assets.ts";

export const SPRITE_SIZES: Record<SpriteId, { width: number; height: number }> = {
  "father-stand": { width: 138, height: 310 },
  "father-joy": { width: 149, height: 308 },
  "mother-stand": { width: 125, height: 290 },
  "mother-joy": { width: 187, height: 300 },
  "boy-stand": { width: 107, height: 226 },
  "boy-joy": { width: 151, height: 219 },
  "girl-stand": { width: 148, height: 210 },
  "girl-joy": { width: 140, height: 210 },
};
