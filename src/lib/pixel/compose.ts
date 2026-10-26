// 場面の部品を1枚の絵に重ねる。画面では CSS で重ねるので、これは確認用の画像とテストに使う
import { createCanvas, stamp, type Canvas } from "./canvas.ts";
import type { PixelAssetId } from "./assets.ts";
import { SCENE_HEIGHT, SCENE_WIDTH, type SceneLayer } from "./scenes.ts";

export function composeScene(layers: readonly SceneLayer[], draw: Record<PixelAssetId, () => Canvas>): Canvas {
  const canvas = createCanvas(SCENE_WIDTH, SCENE_HEIGHT);
  for (const layer of layers) stamp(canvas, draw[layer.asset](), layer.x, layer.y);
  return canvas;
}
