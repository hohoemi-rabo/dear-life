"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ScreenDataBoundary } from "@/components/data/ScreenDataBoundary";
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
          <h1 id="erabu-question" className="text-2xl font-bold">
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

      <nav aria-label="質問の移動" className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          {previous ? (
            <Button variant="secondary" onClick={() => goTo(previous)}>
              <span aria-hidden="true">←</span>
              戻る
            </Button>
          ) : (
            <span />
          )}
          {next ? (
            <Button disabled={!canProceed(current, conditions)} onClick={() => goTo(next)}>
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
        {question.optional && (
          <div className="flex justify-end">
            <SkipButton current={current} conditions={conditions} next={next} onSkip={goTo} />
          </div>
        )}
      </nav>
    </div>
  );
}

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
  const className =
    "inline-flex min-h-tap items-center px-2 text-base font-bold text-primary underline underline-offset-4 hover:no-underline";
  if (next) {
    return (
      <button type="button" className={className} onClick={() => onSkip(next, update)}>
        飛ばす
      </button>
    );
  }
  return (
    <Link href={conditionsHref(KURASHI_PATH, { ...conditions, ...update })} className={className}>
      飛ばす
    </Link>
  );
}

// 上部の進み具合。答えた質問・今の質問には戻れる。地区を選ぶまでは後ろの質問を押せない
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
    <ol aria-label="質問" className="grid grid-cols-5 rounded-full bg-kinari-deep p-1">
      {QUESTIONS.map(({ id, stepLabel }) => {
        const isCurrent = id === current;
        return (
          <li key={id} aria-current={isCurrent ? "step" : undefined}>
            <button
              type="button"
              disabled={!canOpenQuestion(id, conditions)}
              onClick={() => onOpen(id)}
              className={[
                "min-h-tap w-full whitespace-nowrap rounded-full px-0.5 text-xs font-bold sm:text-sm",
                isCurrent ? "bg-primary text-white" : "text-ink-muted hover:text-primary disabled:hover:text-ink-muted",
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

// それまでに選んだ条件のチップ。今の質問より前の質問の答えだけを出す（まだ聞いていない初期値は出さない）
function conditionChips(question: QuestionId, conditions: Conditions): string[] {
  switch (question) {
    case "district":
      return conditions.district ? [DISTRICT_NAMES[conditions.district]] : [];
    case "family":
      return [familyLabel(conditions.adults, conditions.children)];
    case "housing":
      return [HOUSING_LABELS[conditions.housing]];
    case "car":
      return conditions.car === null ? [] : [`車${CAR_LABELS[conditions.car]}`];
    case "priorities":
      return conditions.priorities.map((priority) => `${KARTE_CARD_LABELS[priority]}を大切に`);
  }
}

function ConditionChips({ current, conditions }: { current: QuestionId; conditions: Conditions }) {
  const answered = QUESTIONS.slice(0, QUESTIONS.findIndex(({ id }) => id === current));
  const chips = answered.flatMap(({ id }) => conditionChips(id, conditions));
  if (chips.length === 0) return null;
  return (
    <ul aria-label="選んだ条件" className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <li key={chip} className="rounded-full border border-line bg-surface px-3 py-1 text-sm">
          {chip}
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
