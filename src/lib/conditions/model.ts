// 選んだ条件（要件 F-01・F-02）。氏名・住所・年齢は持たない
import type { DistrictId } from "../town-district/resolve.ts";
import type { CarCount, Housing, Priority } from "./labels.ts";

export type Conditions = {
  // 住む地区は必須。まだ選んでいないあいだは null
  district: DistrictId | null;
  adults: number;
  children: number;
  housing: Housing;
  // 任意。未選択は null（場面とカルテでは「1台以上」と同じ扱い。要件 4章）
  car: CarCount | null;
  // 任意・複数。並びはカルテの既定の並び順にそろえて持つ（タップした順には左右されない）
  priorities: readonly Priority[];
};

// 家族の人数の範囲。画面の増減ボタンもこの範囲で止める。
// 絵に出せるのが大人2人・子ども2人までなので、選べる人数もそこまでにする（絵と条件がいつも一致するように。028 まさゆきさん決定）
export const ADULTS_RANGE = { min: 1, max: 2 } as const;
export const CHILDREN_RANGE = { min: 0, max: 2 } as const;

// 質問を飛ばしたときの初期値（F-01）：大人2人・子ども1人・買う・新しめ、車は未選択
export const DEFAULT_CONDITIONS: Conditions = {
  district: null,
  adults: 2,
  children: 1,
  housing: "new",
  car: null,
  priorities: [],
};

export function hasChildren(conditions: Pick<Conditions, "children">): boolean {
  return conditions.children > 0;
}

// 場面とカルテの分岐で使う車の区分。未選択は「1台以上」と同じ側に入れる（要件 4章）
export function hasNoCar(conditions: Pick<Conditions, "car">): boolean {
  return conditions.car === 0;
}
