"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ScreenDataBoundary } from "@/components/data/ScreenDataBoundary";
import { DistrictMapLayer } from "@/components/illust/DistrictMapLayer";
import { FamilyLayer } from "@/components/illust/FamilyLayer";
import { PreviewFrame } from "@/components/illust/PreviewFrame";
import { BottomActionBar } from "@/components/ui/BottomActionBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { DISTRICT_NAMES, familyLabel } from "@/lib/conditions/labels";
import type { Conditions } from "@/lib/conditions/model";
import { conditionsHref, writeConditions } from "@/lib/conditions/url";
import { useConditions } from "@/lib/conditions/useConditions";
import {
  canProceed,
  nextQuestion,
  previousQuestion,
  QUESTION_PARAM,
  questionOf,
  resolveQuestion,
  type QuestionId,
} from "@/lib/erabu/questions";
import { erabuBaseFor } from "@/lib/illust/assets";
import { familyMembers } from "@/lib/illust/family";
import { KURASHI_PATH } from "@/lib/site";
import { ErabuProgress } from "./ErabuProgress";
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
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <ErabuProgress current={current} conditions={conditions} onOpen={(id) => goTo(id)} />
      <ErabuPreview question={current} conditions={conditions} onSelectDistrict={(district) => setConditions({ district })} />

      <section aria-labelledby="erabu-question" className="flex flex-col gap-4">
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 id="erabu-question" className="text-2xl font-extrabold">
            {question.title}
          </h1>
          <p className="text-sm text-ink-muted">{question.lead}</p>
        </div>
        <QuestionBody question={current} conditions={conditions} onChange={setConditions} />
        {current === "district" && conditions.district !== null && <DistrictStage name={DISTRICT_NAMES[conditions.district]} />}
      </section>

      <div aria-live="polite">
        {conditions.district !== null && (
          <ScreenDataBoundary fallback={<ReplySkeleton />}>
            <ErabuReplyCard question={current} conditions={conditions} />
          </ScreenDataBoundary>
        )}
      </div>

      {/* もどる・次へは画面の下に固定する。見本どおり、地区の質問は次へのボタンだけを真ん中に置く */}
      <BottomActionBar label="質問の移動" decorated={false} className={previous ? "" : "justify-center"}>
        {previous && (
          <button type="button" onClick={() => goTo(previous)} className={TEXT_ACTION}>
            <span aria-hidden="true">←</span>
            もどる
          </button>
        )}
        <div className={`flex items-center gap-2 ${previous ? "ml-auto" : ""}`}>
          {question.optional && (
            <SkipButton label={question.skipLabel ?? "飛ばす"} current={current} conditions={conditions} next={next} onSkip={goTo} />
          )}
          {next ? (
            <button type="button" disabled={!canProceed(current, conditions)} onClick={() => goTo(next)} className={PILL_ACTION}>
              {question.nextLabel}
              <span aria-hidden="true">→</span>
            </button>
          ) : (
            <Link href={conditionsHref(KURASHI_PATH, conditions)} className={PILL_ACTION}>
              {question.nextLabel}
              <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>
      </BottomActionBar>
    </div>
  );
}

// わが家のプレビュー（028 見本）。地区の質問では飯田市全体の絵に4地区の札、ほかの質問では地区の風景に家族を重ねる。
// 質問を移るたびに家族を描き直し、ぽんと出し直す（選ぶたびにできあがっていく感じを出す）
function ErabuPreview({
  question,
  conditions,
  onSelectDistrict,
}: {
  question: QuestionId;
  conditions: Conditions;
  onSelectDistrict: (district: NonNullable<Conditions["district"]>) => void;
}) {
  if (question === "district") {
    return (
      <PreviewFrame background="erabu-iida-overview" label="わが家のプレビュー：飯田市の4地区">
        <DistrictMapLayer selected={conditions.district} onSelect={onSelectDistrict} />
      </PreviewFrame>
    );
  }
  const background = erabuBaseFor(conditions.district);
  const place = conditions.district ? DISTRICT_NAMES[conditions.district] : "飯田";
  return (
    <PreviewFrame background={background} label={`わが家のプレビュー：${place}で暮らす、${familyLabel(conditions.adults, conditions.children)}の家族`}>
      <FamilyLayer key={question} members={familyMembers(conditions)} background={background} />
    </PreviewFrame>
  );
}

// 地区を選んだあとのひと言（028 見本）
function DistrictStage({ name }: { name: string }) {
  return (
    <p className="flex items-center justify-center gap-1.5 rounded-full bg-warm-soft px-4 py-2 text-sm font-bold">
      <svg aria-hidden="true" viewBox="0 0 24 32" className="h-4 w-3 shrink-0 text-primary">
        <path d="M12 1C6 1 1.5 5.5 1.5 11.3 1.5 19 12 31 12 31s10.5-12 10.5-19.7C22.5 5.5 18 1 12 1z" fill="currentColor" />
        <circle cx="12" cy="11.5" r="4.2" fill="white" />
      </svg>
      {name}を舞台に、暮らしをつくります。
    </p>
  );
}

// 次へ進む大きなボタン（見本の丸い深緑のボタン）
const PILL_ACTION =
  "inline-flex min-h-[3.25rem] items-center justify-center gap-3 rounded-full bg-primary px-8 text-base font-bold text-white shadow-card transition duration-150 hover:bg-primary-hover active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";

// 枠のない文字だけの操作（戻る・飛ばす）
const TEXT_ACTION = "inline-flex min-h-tap min-w-tap items-center justify-center gap-1 px-2 font-bold text-primary underline-offset-4 hover:underline";

// 任意の質問を飛ばす。車は未選択、大切にしたいことはなしにして次へ進む（最後の質問なら、くらしを見るへ）
function SkipButton({
  label,
  current,
  conditions,
  next,
  onSkip,
}: {
  label: string;
  current: QuestionId;
  conditions: Conditions;
  next: QuestionId | null;
  onSkip: (id: QuestionId, update: Partial<Conditions>) => void;
}) {
  const update: Partial<Conditions> = current === "car" ? { car: null } : { priorities: [] };
  if (next) {
    return (
      <button type="button" className={`${TEXT_ACTION} text-sm`} onClick={() => onSkip(next, update)}>
        {label}
      </button>
    );
  }
  return (
    <Link href={conditionsHref(KURASHI_PATH, { ...conditions, ...update })} className={`${TEXT_ACTION} text-sm`}>
      {label}
    </Link>
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
