// npm run mascot（scripts/build-mascot.mjs）が書くファイル。手で直さない。
// マスコットの動きの1枚の WebP（コマを横に1列に並べたもの）の、1コマの大きさ（px）・コマ数・1コマを出す長さ（ミリ秒）
import type { MascotMotionId } from "./assets.ts";

export const MASCOT_SPRITES: Record<MascotMotionId, { frameWidth: number; frameHeight: number; frames: number; frameMs: number }> = {
  "kamisato-sweep-spring": {
    "frameWidth": 155,
    "frameHeight": 160,
    "frames": 29,
    "frameMs": 160
  },
  "kamisato-sweep-summer": {
    "frameWidth": 155,
    "frameHeight": 160,
    "frames": 29,
    "frameMs": 160
  },
  "kamisato-sweep-autumn": {
    "frameWidth": 154,
    "frameHeight": 160,
    "frames": 29,
    "frameMs": 160
  },
  "kamisato-sweep-winter": {
    "frameWidth": 153,
    "frameHeight": 160,
    "frames": 29,
    "frameMs": 160
  },
  "kanae-jumprope-spring": {
    "frameWidth": 124,
    "frameHeight": 160,
    "frames": 16,
    "frameMs": 80
  },
  "kanae-jumprope-summer": {
    "frameWidth": 122,
    "frameHeight": 160,
    "frames": 12,
    "frameMs": 80
  },
  "kanae-jumprope-autumn": {
    "frameWidth": 118,
    "frameHeight": 160,
    "frames": 16,
    "frameMs": 80
  },
  "kanae-jumprope-winter": {
    "frameWidth": 124,
    "frameHeight": 160,
    "frames": 14,
    "frameMs": 80
  },
  "igara-drink-spring": {
    "frameWidth": 133,
    "frameHeight": 160,
    "frames": 24,
    "frameMs": 80
  },
  "igara-drink-summer": {
    "frameWidth": 129,
    "frameHeight": 160,
    "frames": 20,
    "frameMs": 80
  },
  "igara-drink-autumn": {
    "frameWidth": 112,
    "frameHeight": 160,
    "frames": 27,
    "frameMs": 80
  },
  "igara-drink-winter": {
    "frameWidth": 114,
    "frameHeight": 160,
    "frames": 28,
    "frameMs": 80
  },
  "chushin-spin-spring": {
    "frameWidth": 149,
    "frameHeight": 160,
    "frames": 13,
    "frameMs": 80
  },
  "chushin-spin-summer": {
    "frameWidth": 142,
    "frameHeight": 160,
    "frames": 15,
    "frameMs": 80
  },
  "chushin-spin-autumn": {
    "frameWidth": 131,
    "frameHeight": 160,
    "frames": 17,
    "frameMs": 80
  },
  "chushin-spin-winter": {
    "frameWidth": 157,
    "frameHeight": 160,
    "frames": 13,
    "frameMs": 80
  },
  "single-blink-spring": {
    "frameWidth": 153,
    "frameHeight": 240,
    "frames": 3,
    "frameMs": 100
  },
  "single-blink-summer": {
    "frameWidth": 151,
    "frameHeight": 240,
    "frames": 3,
    "frameMs": 100
  },
  "single-blink-autumn": {
    "frameWidth": 153,
    "frameHeight": 240,
    "frames": 3,
    "frameMs": 100
  },
  "single-blink-winter": {
    "frameWidth": 156,
    "frameHeight": 240,
    "frames": 3,
    "frameMs": 100
  }
};
