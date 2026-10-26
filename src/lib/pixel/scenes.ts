// 場面の重ね方（要件 6.2）。背景（160×90）の上に、部品を左上の座標（ドット）で置く。前に書いたものほど奥になる。
// 部品は決まった置き場所（SCENE_SLOTS）に、置き場所の「下の真ん中」へ足元を合わせて置く。幅の違う部品でも同じ場所に立つ
import { PIXEL_ASSETS, type PixelAssetId } from "./assets.ts";

export type SceneLayer = { asset: PixelAssetId; x: number; y: number };

export const SCENE_WIDTH = 160;
export const SCENE_HEIGHT = 90;

// 置き場所。背景の道は y=76〜86、その上の田畑は桜などの木（左右の端）のあいだを空けてある。
// 田畑の部品は家族の後ろに来るので、家族と少し重なっても見えるよう左右に寄せている
export const SCENE_SLOTS = {
  // 背景・大雨など、場面全体に重ねるもの
  full: { centerX: 80, bottom: 90 },
  // 田畑の左（行事など）
  fieldLeft: { centerX: 44, bottom: 75 },
  // 田畑の右（施設・電車など）
  fieldRight: { centerX: 114, bottom: 75 },
  // 道の上の家族
  family: { centerX: 76, bottom: 85 },
  // 道の上、家族の右（車・バス）
  roadRight: { centerX: 128, bottom: 86 },
} as const;

export type SceneSlot = keyof typeof SCENE_SLOTS;

export function placeInSlot(asset: PixelAssetId, slot: SceneSlot): SceneLayer {
  const { width, height } = PIXEL_ASSETS[asset];
  const { centerX, bottom } = SCENE_SLOTS[slot];
  return { asset, x: Math.round(centerX - width / 2), y: bottom - height };
}

// 部品が場面からはみ出していないか確かめる（はみ出すと整数倍の表示で端が切れる）
export function layerOutOfBounds(layer: SceneLayer): boolean {
  const { width, height } = PIXEL_ASSETS[layer.asset];
  return layer.x < 0 || layer.y < 0 || layer.x + width > SCENE_WIDTH || layer.y + height > SCENE_HEIGHT;
}
