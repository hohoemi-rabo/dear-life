// えらぶ 05 のプレビューに、選んだ大切にしたいことの印を付ける（028 見本）。印は風景の中の、その分野の場所に置く。
// 位置は家族・家と同じく背景に対する割合（％）で持ち、画面の幅が変わっても背景と一緒に伸び縮みさせる
import { PRIORITIES, type Housing, type Priority } from "../conditions/labels.ts";
import type { ErabuBaseId } from "./assets.ts";
import { placeHouse } from "./house.ts";

// 印の真ん中の位置（背景に対する％）。住まいは背景ではなく、プレビューに建てた家に付ける。
// 見本で場所が分かるのは住まい・子育て・学校だけで、交通・防災・人口は Claude の案（2026-10-29。まさゆきさんが見て直す）
type Spot = { x: number; y: number };
const SPOTS: Record<ErabuBaseId, Record<Exclude<Priority, "housing">, Spot>> = {
  // 05 の背景（2026-11-07 差しかえ）：真ん中の時計の校舎・その奥の駅とバス停・右奥の広場の避難場所の標識・手前右の家並み。
  // 手前を走るリニアの高架には印をかけない
  "erabu-kamisato-priorities": {
    childcare: { x: 37, y: 31 },
    transport: { x: 52, y: 19 },
    disaster: { x: 92, y: 30 },
    population: { x: 83, y: 46 },
  },
  // 05 の背景：左奥の校舎・右の駅・右奥の公園の避難場所の標識・奥の町並み
  "erabu-chushin-priorities": {
    childcare: { x: 14, y: 16 },
    transport: { x: 75, y: 36 },
    disaster: { x: 89, y: 24 },
    population: { x: 57, y: 18 },
  },
  // 05 の背景がない地区（02〜04 と同じ背景で 05 を出す）。上郷は 05 の背景があるので今は使わない
  "erabu-kamisato-base": {
    childcare: { x: 72, y: 30 },
    transport: { x: 31, y: 40 },
    disaster: { x: 24, y: 22 },
    population: { x: 86, y: 46 },
  },
  // 05 には専用の背景を使うので今は使わない（上郷の erabu-kamisato-base と同じ）。左奥の校庭・奥の線路・右の公園・左の町並み
  "erabu-chushin-base": {
    childcare: { x: 19, y: 34 },
    transport: { x: 40, y: 22 },
    disaster: { x: 86, y: 60 },
    population: { x: 10, y: 54 },
  },
  // 05 の背景：左奥の時計の校舎・手前のバス停・右奥の避難場所の標識・奥のマンションと家並み
  "erabu-kanae-priorities": {
    childcare: { x: 20, y: 20 },
    transport: { x: 62, y: 56 },
    disaster: { x: 91, y: 22 },
    population: { x: 58, y: 20 },
  },
  // 05 には専用の背景を使うので今は使わない（上郷の erabu-kamisato-base と同じ）。左の店・交差点・右の店・奥の町並み
  "erabu-kanae-base": {
    childcare: { x: 20, y: 40 },
    transport: { x: 22, y: 66 },
    disaster: { x: 78, y: 36 },
    population: { x: 44, y: 24 },
  },
  // 05 の背景：真ん中の時計の校舎・手前のバス乗り場・右の避難場所の標識・右奥の家並み。印が絵の時計や札の文字を隠さないよう、それぞれの少し上に置く
  "erabu-igara-priorities": {
    childcare: { x: 36, y: 19 },
    transport: { x: 60, y: 37 },
    disaster: { x: 92, y: 28 },
    population: { x: 72, y: 17 },
  },
  // 05 には専用の背景を使うので今は使わない（上郷の erabu-kamisato-base と同じ）。左の家・バス停・奥の神社・右の家並み
  "erabu-igara-base": {
    childcare: { x: 18, y: 36 },
    transport: { x: 36, y: 50 },
    disaster: { x: 40, y: 12 },
    population: { x: 86, y: 40 },
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
