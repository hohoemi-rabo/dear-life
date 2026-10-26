// 絵の id ごとの描き方。PNG の書き出し（scripts/build-pixel.mjs）とテストだけが使う
import type { Canvas } from "../canvas.ts";
import type { PixelAssetId } from "../assets.ts";
import { familyCanvas } from "./family.ts";
import { springBackground } from "./spring.ts";

export const DRAW: Record<PixelAssetId, () => Canvas> = {
  "bg-spring": springBackground,
  "family-a2-c1": () => familyCanvas(2, 1),
};
