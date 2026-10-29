// えらぶ 05 のプレビューに、選んだ大切にしたいことの印を付ける（028 見本）。印は風景の中の、その分野の場所に置く。
// 位置は家族・家と同じく背景に対する割合（％）で持ち、画面の幅が変わっても背景と一緒に伸び縮みさせる
import { PRIORITIES, type Housing, type Priority } from "../conditions/labels.ts";
import type { ErabuBaseId } from "./assets.ts";
import { placeHouse } from "./house.ts";

// 印の真ん中の位置（背景に対する％）。住まいは背景ではなく、プレビューに建てた家に付ける。
// 見本で場所が分かるのは住まい・子育て・学校だけで、交通・防災・人口は Claude の案（2026-10-29。まさゆきさんが見て直す）
type Spot = { x: number; y: number };
const SPOTS: Record<ErabuBaseId, Record<Exclude<Priority, "housing">, Spot>> = {
  // 05 の背景：校庭のある学校・駅・広場の避難場所の標識・山すその家並み
  "erabu-kamisato-priorities": {
    childcare: { x: 44, y: 24 },
    transport: { x: 73, y: 37 },
    disaster: { x: 92, y: 30 },
    population: { x: 60, y: 21 },
  },
  // 05 の背景がない地区（02〜04 と同じ背景で 05 を出す）。上郷は 05 の背景があるので今は使わない
  "erabu-kamisato-base": {
    childcare: { x: 72, y: 30 },
    transport: { x: 31, y: 40 },
    disaster: { x: 24, y: 22 },
    population: { x: 86, y: 46 },
  },
  // 上郷以外の地区の仮の背景（飯田市全体の絵）。街並みの上に散らすだけ
  "erabu-iida-overview": {
    childcare: { x: 30, y: 40 },
    transport: { x: 89, y: 44 },
    disaster: { x: 74, y: 24 },
    population: { x: 18, y: 28 },
  },
};

// 家の印は、家の絵の上のほう（屋根のあたり）に付ける。家の高さに対する、土台からの割合
const HOUSE_MARK_HEIGHT = 0.68;

export type PriorityMark = { priority: Priority } & Spot;

// 選んだ順ではなく、カルテの並び（PRIORITIES）で返す。並びが変わっても印が入れ替わって見えないように
export function placePriorityMarks(priorities: readonly Priority[], housing: Housing, background: ErabuBaseId): PriorityMark[] {
  return PRIORITIES.filter((priority) => priorities.includes(priority)).map((priority) => {
    if (priority !== "housing") return { priority, ...SPOTS[background][priority] };
    const house = placeHouse(housing, background);
    return { priority, x: house.centerX, y: house.footY - house.height * HOUSE_MARK_HEIGHT };
  });
}
