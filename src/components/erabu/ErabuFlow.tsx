"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ComponentProps } from "react";
import { ScreenDataBoundary } from "@/components/data/ScreenDataBoundary";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { BottomActionBar } from "@/components/ui/BottomActionBar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { CAR_LABELS, DISTRICT_NAMES, HOUSING_LABELS, KARTE_CARD_LABELS, familyLabel } from "@/lib/conditions/labels";
import type { Conditions } from "@/lib/conditions/model";
import { conditionsHref, writeConditions } from "@/lib/conditions/url";
import { useConditions } from "@/lib/conditions/useConditions";
import {
  canOpenQuestion,
  canProceed,
  nextQuestion,
  previousQuestion,
  QUESTION_PARAM,
  QUESTIONS,
  questionOf,
  resolveQuestion,
  type QuestionId,
} from "@/lib/erabu/questions";
import { KURASHI_PATH, TARGET_DISTRICTS_LABEL } from "@/lib/site";
import { ErabuReplyCard } from "./ErabuReplyCard";
import { QuestionBody } from "./QuestionBody";

// 01 えらぶ（F-01・F-10）。質問に1つずつ答え、選ぶたびに返事を出す。
// 条件も今の質問も URL パラメータに持つ（F-02）。useSearchParams を使うので <Suspense> の中で使う。
// 選び直しは router.replace（履歴を増やさない）、質問の移動は router.push（ブラウザの「戻る」で前の質問に戻れる）
export function ErabuFlow() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { conditions, setConditions } = useConditions();
  const current = resolveQuestion(searchParams.get(QUESTION_PARAM), conditions);
  const question = questionOf(current);
  const previous = previousQuestion(current);
  const next = nextQuestion(current);

  const goTo = (id: QuestionId, update: Partial<Conditions> = {}) => {
    const params = writeConditions({ ...conditions, ...update }, searchParams);
    params.set(QUESTION_PARAM, id);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <QuestionProgress current={current} conditions={conditions} onOpen={(id) => goTo(id)} />
      <ConditionChips current={current} conditions={conditions} />

      <section aria-labelledby="erabu-question" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 id="erabu-question" className="flex items-center gap-2 text-2xl font-extrabold">
            <PixelIcon icon="icon-sprout" />
            {question.title}
          </h1>
          <p className="text-sm text-ink-muted">{question.lead}</p>
          {current === "district" && <p className="text-sm font-bold">対象地区：{TARGET_DISTRICTS_LABEL}</p>}
        </div>
        <QuestionBody question={current} conditions={conditions} onChange={setConditions} />
      </section>

      <div aria-live="polite">
        {conditions.district !== null && (
          <ScreenDataBoundary fallback={<ReplySkeleton />}>
            <ErabuReplyCard question={current} conditions={conditions} />
          </ScreenDataBoundary>
        )}
      </div>

      {/* 戻る・次へは画面の下に固定する（デザインイメージ）。「飛ばす」は次へのそばに小さく置く */}
      <BottomActionBar label="質問の移動">
        {previous ? (
          <button type="button" onClick={() => goTo(previous)} className={TEXT_ACTION}>
            <span aria-hidden="true">←</span>
            戻る
          </button>
        ) : (
          <span />
        )}
        <div className="ml-auto flex items-center gap-2">
          {question.optional && <SkipButton current={current} conditions={conditions} next={next} onSkip={goTo} />}
          {next ? (
            <Button disabled={!canProceed(current, conditions)} onClick={() => goTo(next)} className="min-w-32">
              次へ
              <span aria-hidden="true">→</span>
            </Button>
          ) : (
            <ButtonLink href={conditionsHref(KURASHI_PATH, conditions)}>
              くらしを見る
              <span aria-hidden="true">→</span>
            </ButtonLink>
          )}
        </div>
      </BottomActionBar>
    </div>
  );
}

// 枠のない文字だけの操作（戻る・飛ばす）
const TEXT_ACTION = "inline-flex min-h-tap min-w-tap items-center justify-center gap-1 px-2 font-bold text-primary underline-offset-4 hover:underline";

// 任意の質問を飛ばす。車は未選択、大切にしたいことはなしにして次へ進む（最後の質問なら、くらしを見るへ）
function SkipButton({
  current,
  conditions,
  next,
  onSkip,
}: {
  current: QuestionId;
  conditions: Conditions;
  next: QuestionId | null;
  onSkip: (id: QuestionId, update: Partial<Conditions>) => void;
}) {
  const update: Partial<Conditions> = current === "car" ? { car: null } : { priorities: [] };
  if (next) {
    return (
      <button type="button" className={`${TEXT_ACTION} text-sm`} onClick={() => onSkip(next, update)}>
        飛ばす
      </button>
    );
  }
  return (
    <Link href={conditionsHref(KURASHI_PATH, { ...conditions, ...update })} className={`${TEXT_ACTION} text-sm`}>
      飛ばす
    </Link>
  );
}

// 上部の進み具合。答えた質問・今の質問には戻れる。地区を選ぶまでは後ろの質問を押せない。
// 「地区 → 家族 → …」と矢印でつなぎ、今の質問だけをチップにする（デザインイメージ）。矢印は CSS で出し、読み上げない
function QuestionProgress({
  current,
  conditions,
  onOpen,
}: {
  current: QuestionId;
  conditions: Conditions;
  onOpen: (id: QuestionId) => void;
}) {
  return (
    <ol aria-label="質問" className="flex items-center justify-center">
      {QUESTIONS.map(({ id, stepLabel }, index) => {
        const isCurrent = id === current;
        return (
          <li
            key={id}
            aria-current={isCurrent ? "step" : undefined}
            className={`flex items-center ${index > 0 ? "before:px-0.5 before:text-xs before:text-ink-muted before:content-['→']" : ""}`}
          >
            <button
              type="button"
              disabled={!canOpenQuestion(id, conditions)}
              onClick={() => onOpen(id)}
              className={[
                "min-h-tap min-w-tap whitespace-nowrap rounded-full px-2 text-sm",
                isCurrent ? "bg-primary font-bold text-white" : "text-ink-muted hover:text-primary disabled:hover:text-ink-muted",
                "disabled:cursor-not-allowed disabled:opacity-50",
              ].join(" ")}
            >
              {stepLabel}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

type Chip = { label: string; icon: ComponentProps<typeof PixelIcon>["icon"] };

// それまでに選んだ条件のチップ。今の質問より前の質問の答えだけを出す（まだ聞いていない初期値は出さない）
function conditionChips(question: QuestionId, conditions: Conditions): Chip[] {
  switch (question) {
    case "district":
      return conditions.district ? [{ label: DISTRICT_NAMES[conditions.district], icon: "icon-pin" }] : [];
    case "family":
      return [{ label: familyLabel(conditions.adults, conditions.children), icon: "icon-family" }];
    case "housing":
      return [{ label: HOUSING_LABELS[conditions.housing], icon: "icon-house" }];
    case "car":
      return conditions.car === null ? [] : [{ label: `車${CAR_LABELS[conditions.car]}`, icon: "icon-car" }];
    case "priorities":
      return conditions.priorities.map((priority) => ({ label: `${KARTE_CARD_LABELS[priority]}を大切に`, icon: "icon-sprout" }));
  }
}

function ConditionChips({ current, conditions }: { current: QuestionId; conditions: Conditions }) {
  const answered = QUESTIONS.slice(0, QUESTIONS.findIndex(({ id }) => id === current));
  const chips = answered.flatMap(({ id }) => conditionChips(id, conditions));
  if (chips.length === 0) return null;
  return (
    <ul aria-label="選んだ条件" className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <li key={chip.label} className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm">
          <PixelIcon icon={chip.icon} size="sm" />
          {chip.label}
        </li>
      ))}
    </ul>
  );
}

function ReplySkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
      <span className="sr-only">データを読み込んでいます</span>
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-4 w-full" />
    </div>
  );
}
