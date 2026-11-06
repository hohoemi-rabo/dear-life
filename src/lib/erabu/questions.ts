// えらぶ画面の質問の並びと進み方（016・要件 F-01）。1画面に1問。
// 地区を最初に聞く：返事（F-10・要件 4章）はどれも「その地区の」データなので、地区が決まってからでないと返せないため
import type { Conditions } from "../conditions/model.ts";

export type QuestionId = "district" | "family" | "housing" | "car" | "priorities";

export type Question = {
  id: QuestionId;
  // 上部の進み具合に出す短い名前
  stepLabel: string;
  title: string;
  lead: string;
  // 任意の質問は「飛ばす」を出す。飛ばすと、なし（大切にしたいこと）になる
  optional: boolean;
  // 次へ進むボタンの言葉（028 見本。最後の質問はくらしを見るへ進む）
  nextLabel: string;
  // 任意の質問の「飛ばす」の言葉（028 見本）
  skipLabel?: string;
};

export const QUESTIONS: readonly Question[] = [
  {
    id: "district",
    stepLabel: "地区",
    title: "どの地区で暮らす？",
    lead: "気になる場所から、はじめよう。",
    optional: false,
    nextLabel: "ここで暮らしてみる",
  },
  {
    id: "family",
    stepLabel: "家族",
    title: "何人で暮らす？",
    lead: "一緒に暮らす家族を、迎えよう。",
    optional: false,
    nextLabel: "家族で、次へ",
  },
  {
    id: "housing",
    stepLabel: "家",
    title: "どんな家で暮らす？",
    lead: "わが家の拠点を、えらぼう。",
    optional: false,
    nextLabel: "この家で暮らしてみる",
  },
  {
    id: "car",
    stepLabel: "車",
    title: "車は、何台で暮らす？",
    lead: "移動のかたちも、わが家に合わせて。",
    // 2026-11-06 に必須にした（まさゆきさん）。カルテが変わるのは車を持つか持たないかだけで、「まだ決めない」は
    // 1台と同じ車のある暮らしを見せていたので、迷う人にも 0台 か車ありかを選んでもらう
    optional: false,
    nextLabel: "大切にしたいことへ",
  },
  {
    id: "priorities",
    stepLabel: "大切なこと",
    title: "どんな暮らしを、大切にしたい？",
    lead: "気になることを、いくつでも。",
    optional: true,
    nextLabel: "わが家の一年を見にいく",
    skipLabel: "選ばずに進む",
  },
];

// 今の質問は URL パラメータに持つ（再読み込みやブラウザの「戻る」で同じ質問に戻れるように）。
// 条件のパラメータ（@/lib/conditions/url）と重ならない名前にする
export const QUESTION_PARAM = "q";

const QUESTION_IDS: readonly QuestionId[] = QUESTIONS.map((question) => question.id);

function indexOf(id: QuestionId): number {
  return QUESTION_IDS.indexOf(id);
}

// 地区を選ぶまでは地区より後ろの、車を選ぶまでは車より後ろの質問に進めない（どちらも必須の質問で、初期値がないため）
export function canOpenQuestion(id: QuestionId, conditions: Pick<Conditions, "district" | "car">): boolean {
  if (conditions.district === null) return indexOf(id) <= indexOf("district");
  return conditions.car !== null || indexOf(id) <= indexOf("car");
}

// URL の値から今の質問を決める。知らない値・まだ開けない質問は、まだ答えていない必須の質問に戻す
export function resolveQuestion(value: string | null, conditions: Pick<Conditions, "district" | "car">): QuestionId {
  const id = QUESTION_IDS.find((candidate) => candidate === value) ?? QUESTION_IDS[0];
  if (canOpenQuestion(id, conditions)) return id;
  return conditions.district === null ? "district" : "car";
}

export function questionOf(id: QuestionId): Question {
  return QUESTIONS[indexOf(id)];
}

export function nextQuestion(id: QuestionId): QuestionId | null {
  return QUESTION_IDS[indexOf(id) + 1] ?? null;
}

export function previousQuestion(id: QuestionId): QuestionId | null {
  return QUESTION_IDS[indexOf(id) - 1] ?? null;
}

// 今の質問が、ある質問と同じかそれより後ろか（プレビューの絵に、もう答えた家などを重ねるかを決める）
export function isAtOrAfter(current: QuestionId, target: QuestionId): boolean {
  return indexOf(current) >= indexOf(target);
}

// 次へ進めるか（必須の質問は答えてから）。家族・家は初期値があるので、いつでも進める（F-01）
export function canProceed(id: QuestionId, conditions: Pick<Conditions, "district" | "car">): boolean {
  if (id === "district") return conditions.district !== null;
  if (id === "car") return conditions.car !== null;
  return true;
}
