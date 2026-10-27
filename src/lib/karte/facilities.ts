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
