// 季節×条件 → 場面の分岐（要件 4章・6.1）。同じ条件なら必ず同じ場面になる（ランダムにしない）。
// 大切にしたいことは場面には使わない（季節ごとの場面は固定）
import type { Database } from "../supabase/database.types.ts";
import { HOUSING_LABELS } from "./labels.ts";
import { hasChildren, hasNoCar, type Conditions } from "./model.ts";

type Enums = Database["public"]["Enums"];

export type Season = Enums["season"];
export const SEASONS: readonly Season[] = ["春", "夏", "秋", "冬"];

// 場面の軸。何のデータを差し込み、どの絵を重ねるかは 017・018 がこれを見て決める
export type SceneAxis =
  | "spring-school" // 入園・入学（保育施設の例、主な学区）
  | "spring-public-facility" // 地区の公共施設
  | "summer-evacuation" // 大雨と避難
  | "autumn-events" // 地区の行事
  | "winter-transit" // バス（駅のある地区は電車も）で出かける。時刻表の本物の便を出す
  | "winter-car"; // 車で出かける（凍結・スタッドレス）

export type ScenePlan = {
  season: Season;
  axis: SceneAxis;
  // 秋：子ども向けの行事を優先して出す
  preferChildEvents: boolean;
  // 冬・買う・古め：古い家の寒さに触れる想定の一文を入れてよい
  oldHouseCold: boolean;
};

const SCENE_AXES: Readonly<Record<Season, (conditions: Conditions) => SceneAxis>> = {
  春: (conditions) => (hasChildren(conditions) ? "spring-school" : "spring-public-facility"),
  夏: () => "summer-evacuation",
  秋: () => "autumn-events",
  冬: (conditions) => (hasNoCar(conditions) ? "winter-transit" : "winter-car"),
};

export function planScene(season: Season, conditions: Conditions): ScenePlan {
  return {
    season,
    axis: SCENE_AXES[season](conditions),
    preferChildEvents: season === "秋" && hasChildren(conditions),
    oldHouseCold: season === "冬" && conditions.housing === "old",
  };
}

// ---- ひな形の選び方（scene_templates・scene_sentences。要件 6.3・9.5） ----

// ひな形と文が持つ条件の列。null は「どちらでも」
export type SceneCondition = {
  has_children: boolean | null;
  car: Enums["car_choice"] | null;
  housing: Enums["housing_choice"] | null;
};

// 選んだ条件を、ひな形の条件の列と同じ形にする。車の未選択は「車あり・未選択」に入る（要件 4章）
export function sceneConditionOf(conditions: Conditions): { [K in keyof SceneCondition]: NonNullable<SceneCondition[K]> } {
  return {
    has_children: hasChildren(conditions),
    car: hasNoCar(conditions) ? "車なし" : "車あり・未選択",
    housing: HOUSING_LABELS[conditions.housing],
  };
}

export function matchesSceneCondition(row: SceneCondition, conditions: Conditions): boolean {
  const own = sceneConditionOf(conditions);
  return (
    (row.has_children === null || row.has_children === own.has_children) &&
    (row.car === null || row.car === own.car) &&
    (row.housing === null || row.housing === own.housing)
  );
}

function specificity(row: SceneCondition): number {
  return [row.has_children, row.car, row.housing].filter((value) => value !== null).length;
}

// その季節の公開済みのひな形から、条件に合うものを1つ選ぶ。合うものが複数あれば、条件の列がいちばん多く埋まっているものを選ぶ。
// 埋まっている数が同じものが2つ以上合うのは、ひな形の作り方の誤り（どちらを出すか決められない）なのでエラーにする
export function selectSceneTemplate<T extends SceneCondition & { season: Season }>(
  templates: readonly T[],
  season: Season,
  conditions: Conditions,
): T | null {
  const candidates = templates
    .filter((template) => template.season === season && matchesSceneCondition(template, conditions))
    .sort((a, b) => specificity(b) - specificity(a));
  if (candidates.length === 0) return null;
  if (candidates.length > 1 && specificity(candidates[0]) === specificity(candidates[1])) {
    throw new Error(`${season}の場面で、条件に合うひな形が1つに決まりません。ひな形の条件を見直してください`);
  }
  return candidates[0];
}

// ひな形の文のうち、文ごとの追加の条件（例：冬・買う・古めの古い家の寒さ）に合うものだけを、並び順どおりに返す
export function selectSceneSentences<T extends SceneCondition & { position: number }>(
  sentences: readonly T[],
  conditions: Conditions,
): T[] {
  return sentences
    .filter((sentence) => matchesSceneCondition(sentence, conditions))
    .sort((a, b) => a.position - b.position);
}
