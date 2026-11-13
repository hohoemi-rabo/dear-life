// 施設の一覧を種類ごとにまとめる（公共施設・学校・保育施設のカード）。並びは届いた順（screen_data の並び）を保つ
import type { EvacuationHazard, Facility, Population } from "../data/screen-data.ts";

export type FacilityGroup<T extends Facility> = { subkind: string; items: T[] };

const NO_SUBKIND = "そのほか";

export function groupBySubkind<T extends Facility>(facilities: readonly T[]): FacilityGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const facility of facilities) {
    const subkind = facility.subkind ?? NO_SUBKIND;
    const items = groups.get(subkind) ?? [];
    items.push(facility);
    groups.set(subkind, items);
  }
  return [...groups].map(([subkind, items]) => ({ subkind, items }));
}

// 子育て・学校のタブ（039 プラン 8）の種類の並び。届いた順だと「中学校 → 小学校」「その他 → 認定こども園」になるので、
// 親が見慣れた順にそろえる。ここにない種類は届いた順のまま真ん中に、「その他」は最後に置く
const CHILDCARE_SUBKIND_ORDER = [
  "小学校",
  "中学校",
  "高等学校",
  "認可公立保育所",
  "認可私立保育所",
  "認定こども園（保育所型）",
  "認定こども園（幼保連携型）",
  "認定こども園（幼稚園型）",
  "認定こども園（地方裁量型）",
  "幼稚園",
  "認可外保育所",
];
const LAST_SUBKINDS = ["その他", NO_SUBKIND];

function subkindRank(subkind: string): number {
  if (LAST_SUBKINDS.includes(subkind)) return CHILDCARE_SUBKIND_ORDER.length + 2;
  const index = CHILDCARE_SUBKIND_ORDER.indexOf(subkind);
  return index === -1 ? CHILDCARE_SUBKIND_ORDER.length + 1 : index;
}

export function childcareGroups<T extends Facility>(facilities: readonly T[]): FacilityGroup<T>[] {
  // sort は同じ順位なら元の並びを保つ
  return groupBySubkind(facilities).sort((a, b) => subkindRank(a.subkind) - subkindRank(b.subkind));
}

// 子育て・学校のタブの説明の文。種類が2つ以上なら「小学校1・中学校1・高等学校2の、4校があります。」、
// 1つか種類がなければ「3か所あります。」、0なら「地区の中にはありません。」
export function facilityCountSentence(facilities: readonly Facility[], unit: string): string {
  if (facilities.length === 0) return "地区の中にはありません。";
  const groups = childcareGroups(facilities);
  if (groups.length < 2) return `${facilities.length}${unit}あります。`;
  return `${groups.map((group) => `${group.subkind}${group.items.length}`).join("・")}の、${facilities.length}${unit}があります。`;
}

// 避難場所の災害の種類（市「指定緊急避難場所一覧」の災害種別。009 で画面に使う4つだけを持っている）
export const HAZARD_LABELS: Readonly<Record<EvacuationHazard, string>> = {
  flood: "洪水",
  landslide: "土砂災害",
  earthquake: "地震",
  large_fire: "大規模な火事",
};

export type AgeShare = { label: string; count: number; percent: number };

// 年齢3区分の人数と割合（小数1桁）。区分の人数がないもの（秘匿など）は出さない
export function ageShares(population: Population): AgeShare[] {
  const groups: [string, number | null][] = [
    ["14歳以下", population.age0to14],
    ["15〜64歳", population.age15to64],
    ["65歳以上", population.age65plus],
  ];
  return groups.flatMap(([label, count]) =>
    count === null || population.total === 0
      ? []
      : [{ label, count, percent: Math.round((count / population.total) * 1000) / 10 }],
  );
}

// 総数のうち、3区分のどれにも入らない人（国勢調査の年齢不詳。011）。割合は ageShares と同じく小数1桁。
// 区分の人数が欠けている（秘匿など）ときは年齢不詳と区別できないので出さない。差がなければ null
export function ageUnknown(population: Population): { count: number; percent: number } | null {
  const { total, age0to14, age15to64, age65plus } = population;
  if (age0to14 === null || age15to64 === null || age65plus === null || total === 0) return null;
  const count = total - age0to14 - age15to64 - age65plus;
  return count > 0 ? { count, percent: Math.round((count / total) * 1000) / 10 } : null;
}
