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
  // 任意の質問は「飛ばす」を出す。飛ばすと未選択（車）・なし（大切にしたいこと）になる
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
    title: "車は何台？",
    lead: "家族で持つ車の台数です。決めていなければ飛ばせます。",
    optional: true,
    nextLabel: "大切にしたいことへ",
    skipLabel: "まだ決めない",
  },
  {
    id: "priorities",
    stepLabel: "大切なこと",
    title: "大切にしたいことは？",
    lead: "いくつでも選べます。カルテで先に表示します。",
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

// 地区を選ぶまでは、地区より後ろの質問に進めない
export function canOpenQuestion(id: QuestionId, conditions: Pick<Conditions, "district">): boolean {
  return conditions.district !== null || indexOf(id) <= indexOf("district");
}

// URL の値から今の質問を決める。知らない値・まだ開けない質問は、開ける質問に戻す
export function resolveQuestion(value: string | null, conditions: Pick<Conditions, "district">): QuestionId {
  const id = QUESTION_IDS.find((candidate) => candidate === value) ?? QUESTION_IDS[0];
  return canOpenQuestion(id, conditions) ? id : "district";
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
export function canProceed(id: QuestionId, conditions: Pick<Conditions, "district">): boolean {
  return id !== "district" || conditions.district !== null;
}
