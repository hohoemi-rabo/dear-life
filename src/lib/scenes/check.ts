// ひな形の決まりごとのチェック（要件 6.3〜6.5）。ひな形のマイグレーションを書き出すとき（npm run scenes:sql）とテストで使う。
// データベースの制約（想定の文に数字・{} を入れない）より細かいところを見る
import { selectSceneSentences, selectSceneTemplate, SEASONS, type SceneCondition, type Season } from "../conditions/scene.ts";
import type { Conditions } from "../conditions/model.ts";
import type { CarCount, Housing } from "../conditions/labels.ts";
import type { SceneSentence } from "../data/screen-data.ts";
import { isPlaceholderKey, PLACEHOLDERS, placeholdersIn, SENTENCE_SOURCE_TOPICS } from "./placeholders.ts";

export type SceneTemplateDraft = SceneCondition & {
  season: Season;
  title: string;
  // まさゆきさんが確認した日。入っているものだけ公開する
  reviewed_on: string | null;
  sentences: readonly SceneSentence[];
};

// 想定の文に入れないもの：施設の種類の名前（施設名はたいていこれで終わる）
const FACILITY_WORDS = /保育園|保育所|幼稚園|こども園|学校|公民館|図書館|病院|診療所|駅|バス停|センター|公園|体育館|集会|会館|運動場/;
// どの文にも入れないもの：距離の書き方（家からの距離は持たない。6.3）と、地区・行事・便の評価（6.5）
const DISTANCE_WORDS = /近い|近く|遠い|遠く|歩いて|徒歩|[0-9０-９]+分で/;
const EVALUATION_WORDS = /便利|不便|暮らしやすい|住みやすい|おすすめ|お勧め|人気|快適|充実|豊富|安心|安全|義務|負担|大変|多い|少ない|にぎやか|静か/;

const SENTENCE_COUNT = { min: 3, max: 5 } as const;

export function checkSentence(sentence: SceneSentence): string[] {
  const problems: string[] = [];
  const bodies = [sentence.body, ...(sentence.fallback_body === null ? [] : [sentence.fallback_body])];
  const keys = bodies.flatMap(placeholdersIn);

  for (const key of keys) if (!isPlaceholderKey(key)) problems.push(`知らない差し込み部分 {${key}}`);
  for (const body of bodies) {
    if (DISTANCE_WORDS.test(body)) problems.push(`距離の書き方が入っている：${body}`);
    if (EVALUATION_WORDS.test(body)) problems.push(`評価の言葉が入っている：${body}`);
  }
  if (sentence.source_id !== null && !Object.hasOwn(SENTENCE_SOURCE_TOPICS, sentence.source_id)) {
    problems.push(`文の出典の話題が決まっていない：${sentence.source_id}`);
  }

  const topics = keys.filter(isPlaceholderKey).map((key) => PLACEHOLDERS[key].topic);
  switch (sentence.kind) {
    case "想定":
      if (/[0-9０-９]/.test(sentence.body)) problems.push("想定の文に数字が入っている");
      if (/[{}｛｝]/.test(sentence.body)) problems.push("想定の文に差し込み部分が入っている");
      if (FACILITY_WORDS.test(sentence.body)) problems.push(`想定の文に施設の名前が入っている：${sentence.body}`);
      if (sentence.fallback_body !== null || sentence.source_id !== null || sentence.karte_card !== null) {
        problems.push("想定の文に言いかえ・出典・カルテのリンクは付けない");
      }
      break;
    case "データ":
      if (!topics.some((topic) => topic !== null && topic !== "events") && sentence.source_id === null) {
        problems.push(`データの文なのに、データの差し込みも出典もない：${sentence.body}`);
      }
      break;
    case "地区の情報":
      if (!topics.includes("events")) problems.push(`地区の情報の文なのに、行事の差し込みがない：${sentence.body}`);
      break;
  }
  if (sentence.fallback_body !== null && placeholdersIn(sentence.body).length === 0) {
    problems.push("差し込みのない文に言いかえは要らない");
  }
  return problems;
}

const HAS_CHILDREN = [true, false] as const;
const CARS: readonly (CarCount | null)[] = [0, 1, 2, null];
const HOUSINGS: readonly Housing[] = ["new", "old", "rent"];

// 選べる条件の組み合わせすべて（場面に関係しない大切にしたいこと・人数の違いは除く）
export function sceneConditionCombinations(): Conditions[] {
  return HAS_CHILDREN.flatMap((withChildren) =>
    CARS.flatMap((car) =>
      HOUSINGS.map((housing) => ({
        district: "kanae" as const,
        adults: 2,
        children: withChildren ? 1 : 0,
        parent: "mother" as const,
        housing,
        car,
        priorities: [],
      })),
    ),
  );
}

const usesTrain = (sentence: SceneSentence) =>
  placeholdersIn(sentence.body).some((key) => isPlaceholderKey(key) && PLACEHOLDERS[key].topic === "trainOuting");

// ひな形一式のチェック：文ごとの決まり、季節×条件ごとにひな形が1つに決まること、文の数が3〜5になること（駅のある地区・ない地区の両方）
export function checkTemplates(templates: readonly SceneTemplateDraft[]): string[] {
  const problems: string[] = [];
  for (const template of templates) {
    const positions = template.sentences.map((sentence) => sentence.position);
    if (new Set(positions).size !== positions.length) problems.push(`${template.title}：文の並び順が重なっている`);
    for (const sentence of template.sentences) {
      for (const problem of checkSentence(sentence)) problems.push(`${template.title} ${sentence.position}文目：${problem}`);
    }
  }

  for (const season of SEASONS) {
    for (const conditions of sceneConditionCombinations()) {
      const label = `${season}（子ども${conditions.children}人・車${conditions.car ?? "未選択"}・${conditions.housing}）`;
      let template: SceneTemplateDraft | null;
      try {
        template = selectSceneTemplate(templates, season, conditions);
      } catch (error) {
        problems.push(`${label}：${(error as Error).message}`);
        continue;
      }
      if (template === null) {
        problems.push(`${label}：ひな形がない`);
        continue;
      }
      const sentences = selectSceneSentences(template.sentences, conditions);
      const counts = new Set([sentences.length, sentences.filter((sentence) => !usesTrain(sentence)).length]);
      for (const count of counts) {
        if (count < SENTENCE_COUNT.min || count > SENTENCE_COUNT.max) {
          problems.push(`${label}：文が${count}文になる（${SENTENCE_COUNT.min}〜${SENTENCE_COUNT.max}文にする）`);
        }
      }
    }
  }
  return problems;
}
