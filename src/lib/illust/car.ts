// えらぶの「わが家のプレビュー」に車を置く（028 見本の 04）。家族の右に、1台なら白、2台以上なら白と青（絵は2台まで）。
// 0台と未選択のときは何も置かない（バス停も立てない。2026-10-29 まさゆきさん）。
// 位置は家族・家と同じく背景に対する割合（％）で持ち、画面の幅が変わっても背景と一緒に伸び縮みさせる
import type { CarCount } from "../conditions/labels.ts";
import { ILLUST_PICTURES, type ErabuBaseId, type PropId } from "./assets.ts";
import { PROP_SIZES } from "./sprites.ts";

// 背景ごとの置き場所。手前の白い車の真ん中・タイヤの下の高さ・幅（どれも背景に対する％）。
// 2台目の青い車は、白い車の右奥に少し小さく置く（見本のカードの並び）
const PARKING: Record<ErabuBaseId, { centerX: number; footY: number; width: number }> = {
  "erabu-kamisato-base": { centerX: 80, footY: 95, width: 23 },
  "erabu-iida-overview": { centerX: 81, footY: 96, width: 21 },
};
const SECOND_CAR = { offsetX: 7, raiseY: 7, scale: 0.84 };

export type CarPlacement = {
  prop: Extract<PropId, "car-white" | "car-blue">;
  centerX: number;
  footY: number;
  width: number;
  height: number;
};

// 奥から順に返す（後ろのものから描けば、手前の車が前に重なる）
export function placeCars(car: CarCount | null, background: ErabuBaseId): CarPlacement[] {
  if (car === null || car === 0) return [];
  const spot = PARKING[background];
  const picture = ILLUST_PICTURES[background];
  const place = (prop: CarPlacement["prop"], centerX: number, footY: number, width: number): CarPlacement => {
    const size = PROP_SIZES[prop];
    // 高さ（％）＝ 幅（％）× 車の縦横の比 × 背景の横縦の比
    return { prop, centerX, footY, width, height: width * (size.height / size.width) * (picture.width / picture.height) };
  };
  const front = place("car-white", spot.centerX, spot.footY, spot.width);
  if (car === 1) return [front];
  const back = place("car-blue", spot.centerX + SECOND_CAR.offsetX, spot.footY - SECOND_CAR.raiseY, spot.width * SECOND_CAR.scale);
  return [back, front];
}
