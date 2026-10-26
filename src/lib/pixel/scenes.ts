// 場面の重ね方（要件 6.2）。背景（160×90）の上に、部品を左上の座標（ドット）で置く。前に書いたものほど奥になる
import { PIXEL_ASSETS, type PixelAssetId } from "./assets.ts";

export type SceneLayer = { asset: PixelAssetId; x: number; y: number };

export const SCENE_WIDTH = 160;
export const SCENE_HEIGHT = 90;

// 家族は道の上に、足元が道の下の縁より少し上に来るように置く
export const PROTOTYPE_SPRING_SCENE: readonly SceneLayer[] = [
  { asset: "bg-spring", x: 0, y: 0 },
  { asset: "family-a2-c1", x: 62, y: 63 },
];

// 部品が場面からはみ出していないか確かめる（はみ出すと整数倍の表示で端が切れる）
export function layerOutOfBounds(layer: SceneLayer): boolean {
  const { width, height } = PIXEL_ASSETS[layer.asset];
  return layer.x < 0 || layer.y < 0 || layer.x + width > SCENE_WIDTH || layer.y + height > SCENE_HEIGHT;
}
