"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ScreenDataBoundary } from "@/components/data/ScreenDataBoundary";
import { CarLayer } from "@/components/illust/CarLayer";
import { DistrictMapLayer } from "@/components/illust/DistrictMapLayer";
import { FamilyLayer } from "@/components/illust/FamilyLayer";
import { HouseLayer } from "@/components/illust/HouseLayer";
import { PreviewFrame } from "@/components/illust/PreviewFrame";
import { PriorityMarkLayer } from "@/components/illust/PriorityMarkLayer";
import { BottomActionBar } from "@/components/ui/BottomActionBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { CAR_LABELS, DISTRICT_NAMES, familyLabel, HOUSING_LABELS, KARTE_CARD_LABELS, PRIORITIES } from "@/lib/conditions/labels";
import type { Conditions } from "@/lib/conditions/model";
import { conditionsHref, writeConditions } from "@/lib/conditions/url";
import { useConditions } from "@/lib/conditions/useConditions";
import {
  canProceed,
  isAtOrAfter,
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
          <h1 id="erabu-question" className="text-[1.375rem] font-extrabold max-[374px]:text-xl min-[400px]:text-2xl">
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
          <button type="button" onClick={() => goTo(previous)} className={`${TEXT_ACTION} ${question.optional ? "px-0 text-[0.8125rem] min-[400px]:text-sm sm:px-2 sm:text-base" : "px-2"}`}>
            <span aria-hidden="true">←</span>
            もどる
          </button>
        )}
        <div className={`flex items-center ${question.optional ? "gap-1.5 sm:gap-2" : "gap-2"} ${previous ? "ml-auto" : ""}`}>
          {question.optional && (
            <SkipButton label={question.skipLabel ?? "飛ばす"} current={current} conditions={conditions} next={next} onSkip={goTo} />
          )}
          {next ? (
            <button type="button" disabled={!canProceed(current, conditions)} onClick={() => goTo(next)} className={pillAction(question.optional)}>
              {question.nextLabel}
              <span aria-hidden="true" className={question.optional ? "max-[374px]:hidden" : ""}>
                →
              </span>
            </button>
          ) : (
            <Link href={conditionsHref(KURASHI_PATH, conditions)} className={pillAction(question.optional)}>
              {question.nextLabel}
              <span aria-hidden="true" className={question.optional ? "max-[374px]:hidden" : ""}>
                →
              </span>
            </Link>
          )}
        </div>
      </BottomActionBar>
    </div>
  );
}

// わが家のプレビュー（028 見本）。地区の質問では飯田市全体の絵に4地区の札、ほかの質問では地区の風景に家族を重ねる。
// 家の質問からは、家族の後ろに選んだ家を建てる（04・05 の見本でも家は残る）。車の質問からは、家族の右に車を置く。
// 大切なことの質問（05）は町を見わたす別の背景にし、家族は後ろ姿で、選んだ分野の場所に印を付ける（見本どおり）。
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
  const atPriorities = question === "priorities";
  const background = erabuBaseFor(conditions.district, atPriorities ? "priorities" : "base");
  const place = conditions.district ? DISTRICT_NAMES[conditions.district] : "飯田";
  const showHouse = isAtOrAfter(question, "housing");
  const showCar = isAtOrAfter(question, "car");
  const family = `${familyLabel(conditions.adults, conditions.children)}の家族`;
  const carNote = showCar && conditions.car !== null ? `（車${CAR_LABELS[conditions.car]}）` : "";
  const picked = PRIORITIES.filter((priority) => conditions.priorities.includes(priority)).map((priority) => KARTE_CARD_LABELS[priority]);
  const markNote = atPriorities && picked.length > 0 ? `。印：${picked.join("・")}` : "";
  const label = showHouse
    ? `わが家のプレビュー：${place}の「${HOUSING_LABELS[conditions.housing]}」の家で暮らす、${family}${carNote}${markNote}`
    : `わが家のプレビュー：${place}で暮らす、${family}`;
  return (
    <PreviewFrame background={background} label={label}>
      {showHouse && <HouseLayer housing={conditions.housing} background={background} />}
      {showCar && <CarLayer car={conditions.car} background={background} />}
      <FamilyLayer key={question} members={familyMembers(conditions)} background={background} facing={atPriorities ? "back" : "front"} />
      {atPriorities && <PriorityMarkLayer priorities={conditions.priorities} housing={conditions.housing} background={background} />}
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
  "inline-flex min-h-[3.25rem] items-center justify-center whitespace-nowrap rounded-full bg-primary font-bold text-white shadow-card transition duration-150 hover:bg-primary-hover active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";

// 任意の質問は「もどる・飛ばす・次へ」の3つが並ぶので、スマホ（360〜375px）の幅に収まるよう詰める（見本の 04・05）。
// 375px より狭い端末では、さらに文字を小さくして「→」を外す（05 の「わが家の一年を見にいく」が 360px に収まるように）
function pillAction(compact: boolean): string {
  return `${PILL_ACTION} ${
    compact ? "gap-1 px-3 text-[0.8125rem] max-[374px]:text-xs min-[400px]:gap-2 min-[400px]:px-4 min-[400px]:text-sm sm:px-6 sm:text-base" : "gap-2 px-6 text-base"
  }`;
}

// 任意の質問を飛ばす、枠つきの丸いボタン（見本の「まだ決めない」「選ばずに進む」）
const OUTLINE_ACTION =
  "inline-flex min-h-[3.25rem] shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-line bg-surface px-2 text-xs font-bold min-[400px]:px-3 min-[400px]:text-[0.8125rem] sm:px-4 sm:text-sm text-ink shadow-card transition duration-150 hover:border-primary/50 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

// 枠のない文字だけの操作（戻る）
const TEXT_ACTION = "inline-flex shrink-0 whitespace-nowrap min-h-tap min-w-tap items-center justify-center gap-1 font-bold text-primary underline-offset-4 hover:underline";

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
      <button type="button" className={OUTLINE_ACTION} onClick={() => onSkip(next, update)}>
        {label}
      </button>
    );
  }
  return (
    <Link href={conditionsHref(KURASHI_PATH, { ...conditions, ...update })} className={OUTLINE_ACTION}>
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
