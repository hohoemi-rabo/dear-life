// npm run mascot（scripts/build-mascot.mjs）が書くファイル。手で直さない。
// マスコットの動きの1枚の WebP（コマを横に1列に並べたもの）の、1コマの大きさ（px）・コマ数・1コマを出す長さ（ミリ秒）
import type { MascotMotionId } from "./assets.ts";

export const MASCOT_SPRITES: Record<MascotMotionId, { frameWidth: number; frameHeight: number; frames: number; frameMs: number }> = {
  "kamisato-sweep": {
    "frameWidth": 155,
    "frameHeight": 160,
    "frames": 29,
    "frameMs": 160
  }
};
