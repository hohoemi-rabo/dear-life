// えらぶの「わが家のプレビュー」に車を置く（028 見本の 04）。家族の右に、1台なら白、2台以上なら白と青を横に並べる（絵は2台まで）。
// 0台と未選択のときは何も置かない（バス停も立てない。2026-10-29 まさゆきさん）。
// 位置は家族・家と同じく背景に対する割合（％）で持ち、画面の幅が変わっても背景と一緒に伸び縮みさせる
import type { CarCount } from "../conditions/labels.ts";
import { ILLUST_PICTURES, type ErabuBaseId, type PropId } from "./assets.ts";
import { PROP_SIZES } from "./sprites.ts";

// 背景ごとの置き場所。家族より少し奥（足もとより上）に置いて遠近感を出す。
// 1台は single の真ん中に、2台は white・blue の真ん中に横に並べる（2026-10-29 まさゆきさん：車は横並び）。
// 高さはタイヤの下（footY）、幅は1台ぶん（どれも背景に対する％）
const PARKING: Record<ErabuBaseId, { single: number; white: number; blue: number; footY: number; width: number }> = {
  "erabu-kamisato-base": { single: 74, white: 69, blue: 88.5, footY: 89, width: 19 },
  "erabu-iida-overview": { single: 74, white: 70, blue: 88, footY: 91, width: 17 },
};

export type CarPlacement = {
  prop: Extract<PropId, "car-white" | "car-blue">;
  centerX: number;
  footY: number;
  width: number;
  height: number;
};

// 左から順に返す
export function placeCars(car: CarCount | null, background: ErabuBaseId): CarPlacement[] {
  if (car === null || car === 0) return [];
  const spot = PARKING[background];
  const picture = ILLUST_PICTURES[background];
  const place = (prop: CarPlacement["prop"], centerX: number, footY: number, width: number): CarPlacement => {
    const size = PROP_SIZES[prop];
    // 高さ（％）＝ 幅（％）× 車の縦横の比 × 背景の横縦の比
    return { prop, centerX, footY, width, height: width * (size.height / size.width) * (picture.width / picture.height) };
  };
  if (car === 1) return [place("car-white", spot.single, spot.footY, spot.width)];
  return [place("car-white", spot.white, spot.footY, spot.width), place("car-blue", spot.blue, spot.footY, spot.width)];
}
