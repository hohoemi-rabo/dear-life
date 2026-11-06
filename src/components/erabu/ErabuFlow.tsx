"use client";

import Link from "next/link";
import type { ReactNode } from "react";
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
import { familyMembers, hiddenChildren } from "@/lib/illust/family";
import { KURASHI_PATH, MAP_PATH } from "@/lib/site";
import { ErabuProgress } from "./ErabuProgress";
import { ErabuReplyCard } from "./ErabuReplyCard";
import { BusStopMapLink, CAR_STAGES, QuestionBody } from "./QuestionBody";

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

  const side = SIDE_LAYOUT_QUESTIONS.includes(current);

  const questionSection = (
    <section aria-labelledby="erabu-question" className={`flex flex-col gap-4 ${side ? "lg:gap-3" : ""}`}>
      <div className={`flex flex-col items-center gap-1 text-center ${side ? "lg:items-start lg:text-left" : ""}`}>
        {/* PC の右の列（320px）では、いちばん長い「どんな暮らしを、大切にしたい？」が1行に収まる大きさにする */}
        <h1 id="erabu-question" className={`text-[1.375rem] font-extrabold max-[374px]:text-xl min-[400px]:text-2xl ${side ? "lg:text-xl" : ""}`}>
          {question.title}
        </h1>
        <p className="text-sm text-ink-muted">{question.lead}</p>
      </div>
      <QuestionBody question={current} conditions={conditions} onChange={setConditions} side={side} />
      {current === "district" && conditions.district !== null && (
        <DistrictStage name={DISTRICT_NAMES[conditions.district]} className={side ? "lg:hidden" : ""} />
      )}
    </section>
  );

  const reply = (
    <div aria-live="polite">
      {conditions.district !== null && (
        <ScreenDataBoundary fallback={<ReplySkeleton />}>
          <ErabuReplyCard question={current} conditions={conditions} />
        </ScreenDataBoundary>
      )}
    </div>
  );

  // もどる・次へはスマホでは画面の下に固定する。見本どおり、地区の質問は次へのボタンだけを真ん中に置く。
  // PC はプレビューが大きく、固定した帯が絵の下（家族の足もと）を隠すので、固定せずに中身の最後に置く（2026-10-31 まさゆきさん）。
  // 右の列に置くとき（side）は、PC では上に区切りの線を引き、「もどる」を左・「次へ」を右に置く。飛ばすボタンは出さず、
  // 選択肢の「まだ決めない」で選ぶ（ボタンと選択肢が同じ形に見えて分かりにくかったので。2026-11-06 まさゆきさん）
  const actions = (
    <BottomActionBar
      label="質問の移動"
      decorated={false}
      className={`lg:static ${previous ? "" : "justify-center"} ${side ? "max-lg:order-last lg:mx-0 lg:border-t lg:border-line lg:px-0 lg:pb-0 lg:pt-4" : ""}`}
    >
      {previous && (
        <button type="button" onClick={() => goTo(previous)} className={`${TEXT_ACTION} ${question.optional ? "px-0 text-[0.8125rem] min-[400px]:text-sm sm:px-2 sm:text-base" : "px-2"}`}>
          <span aria-hidden="true">←</span>
          もどる
        </button>
      )}
      <div className={`flex items-center ${question.optional ? "gap-1.5 sm:gap-2" : "gap-2"} ${previous ? "ml-auto" : ""} ${side ? "lg:contents" : ""}`}>
        {question.optional && (
          <SkipButton
            label={question.skipLabel ?? "飛ばす"}
            current={current}
            conditions={conditions}
            next={next}
            onSkip={goTo}
            className={side ? "lg:hidden" : ""}
          />
        )}
        {next ? (
          <button
            type="button"
            disabled={!canProceed(current, conditions)}
            onClick={() => goTo(next)}
            className={`${pillAction(question.optional)} ${side ? "lg:ml-auto lg:min-w-[8.5rem]" : ""}`}
          >
            {side ? <SideNextLabel label={question.nextLabel} /> : question.nextLabel}
            <span aria-hidden="true" className={question.optional ? "max-[374px]:hidden" : ""}>
              →
            </span>
          </button>
        ) : (
          <Link
            href={conditionsHref(KURASHI_PATH, conditions)}
            className={`${pillAction(question.optional)} ${side ? "lg:ml-auto lg:min-w-[8.5rem]" : ""}`}
          >
            {side ? <SideNextLabel label={question.nextLabel} /> : question.nextLabel}
            <span aria-hidden="true" className={question.optional ? "max-[374px]:hidden" : ""}>
              →
            </span>
          </Link>
        )}
      </div>
    </BottomActionBar>
  );

  const preview = <ErabuPreview question={current} conditions={conditions} onSelectDistrict={(district) => setConditions({ district })} />;

  if (side) {
    // PC（lg 以上）は、左に絵・右に細い列（質問・選択肢・次へ・返事）。ノートパソコンでも選ぶときに絵が見えるよう、
    // 絵は縦横比のまま画面の高さに収まる大きさにする（2026-11-06 まさゆきさん）。地図のカードは「まだ決めない」の下に置く。
    // スマホは今までどおり縦に並べる（左右の列を contents にして、order で 絵 → 質問 → 返事 → 地図 → もどる・次へ の順にする）
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4 lg:max-w-none">
        <div className="lg:mx-auto lg:w-full lg:max-w-[1200px]">
          <ErabuProgress current={current} conditions={conditions} onOpen={(id) => goTo(id)} />
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-center lg:gap-6">
          <div className={`contents lg:flex lg:min-w-0 lg:flex-1 lg:flex-col lg:gap-4 ${PREVIEW_FIT_HEIGHT}`}>
            {preview}
          </div>
          <div className="contents lg:flex lg:w-[320px] lg:shrink-0 lg:flex-col lg:gap-3">
            <div className="max-lg:order-2">{questionSection}</div>
            {actions}
            {current === "car" && (
              <div className="max-lg:order-4">
                <div className="lg:hidden">
                  <BusStopMapLink conditions={conditions} />
                </div>
                <BusStopTextLink conditions={conditions} />
              </div>
            )}
            {current === "priorities" && question.optional && (
              <SkipButton
                label={question.skipLabel ?? "飛ばす"}
                current={current}
                conditions={conditions}
                next={next}
                onSkip={goTo}
                variant="text"
                className="hidden lg:inline-flex"
              />
            )}
            <div className="max-lg:order-3">{reply}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 lg:max-w-[1200px]">
      <ErabuProgress current={current} conditions={conditions} onOpen={(id) => goTo(id)} />
      {preview}
      {questionSection}
      {reply}
      {actions}
    </div>
  );
}

// 右の列の「次へ」の文字。PC は列が細いので「次へ」だけにし、スマホは今までどおり質問ごとの言い方にする
function SideNextLabel({ label }: { label: string }) {
  return (
    <>
      <span className="lg:hidden">{label}</span>
      <span className="hidden lg:inline">次へ</span>
    </>
  );
}

// PC の右の列の、地図でバス停を見る文字だけのリンク（カードや絵は付けない。2026-11-06 まさゆきさん）。スマホはカード（BusStopMapLink）
function BusStopTextLink({ conditions }: { conditions: Conditions }) {
  return (
    <Link
      href={conditionsHref(MAP_PATH, conditions)}
      className={`${TEXT_LINK} hidden lg:inline-flex`}
    >
      バス停を地図で見る
      <span aria-hidden="true">›</span>
    </Link>
  );
}

// PC で絵を右の列の横に置く質問。車で試して OK をもらい、1問ずつ広げている（2026-11-06 まさゆきさん）
const SIDE_LAYOUT_QUESTIONS: readonly QuestionId[] = ["district", "family", "housing", "car", "priorities"];

// 右に列を置くときの絵の最大幅。絵（3:2）の高さが「画面の高さ − 絵より上（ヘッダー・進み具合・すき間、計165px）− 下の余白」に
// 収まる幅にする。画面が低すぎて絵が小さくなりすぎないよう、幅は 480px より小さくしない
const PREVIEW_FIT_HEIGHT = "lg:max-w-[max(480px,calc((100dvh-181px)*1.5))]";

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
        {conditions.district !== null && <StageTag>{DISTRICT_NAMES[conditions.district]}を舞台に、暮らしをつくります。</StageTag>}
      </PreviewFrame>
    );
  }
  const atPriorities = question === "priorities";
  const background = erabuBaseFor(conditions.district, atPriorities ? "priorities" : "base");
  const place = conditions.district ? DISTRICT_NAMES[conditions.district] : "飯田";
  const showHouse = isAtOrAfter(question, "housing");
  const showCar = isAtOrAfter(question, "car");
  const family = `${familyLabel(conditions)}の家族`;
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
      <FamilyLayer
        key={question}
        members={familyMembers(conditions)}
        hiddenChildren={hiddenChildren(conditions)}
        background={background}
        facing={atPriorities ? "back" : "front"}
      />
      {atPriorities && <PriorityMarkLayer priorities={conditions.priorities} housing={conditions.housing} background={background} />}
      {/* 車の台数のひと言（未選択なら「まだ未定」）。PC は右の列を詰めるため、絵の左下に小さく出す（2026-11-06 まさゆきさん）。
          スマホは選択肢の下に出しているので、ここは PC だけ。読み上げは絵の名前（label）の「車N台」で足りる */}
      {question === "car" && <StageTag>{conditions.car === null ? "車の台数はまだ未定です" : CAR_STAGES[conditions.car]}</StageTag>}
    </PreviewFrame>
  );
}

// 絵の左下の小さな札（選んだもののひと言）。PC で右の列に置く質問だけで使い、スマホは選択肢の下の帯で出す。
// 読み上げは絵の名前（label）と帯で足りるので隠す
function StageTag({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="absolute bottom-2 left-2 z-20 hidden rounded-full border border-line bg-surface/90 px-3 py-1 text-xs font-bold text-ink lg:block"
    >
      {children}
    </span>
  );
}

// 地区を選んだあとのひと言（028 見本）。PC で右の列に置くときは、絵の左下の札にする（StageTag）
function DistrictStage({ name, className = "" }: { name: string; className?: string }) {
  return (
    <p className={`flex items-center justify-center gap-1.5 rounded-full bg-warm-soft px-4 py-2 text-sm font-bold ${className}`}>
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

// PC の右の列の、文字だけの小さなリンク（バス停を地図で見る・選ばずに進む）
const TEXT_LINK = "min-h-tap items-center gap-1 self-start text-sm font-bold text-primary underline-offset-4 hover:underline";

// 枠のない文字だけの操作（戻る）
const TEXT_ACTION = "inline-flex shrink-0 whitespace-nowrap min-h-tap min-w-tap items-center justify-center gap-1 font-bold text-primary underline-offset-4 hover:underline";

// 任意の質問を飛ばす。車は未選択、大切にしたいことはなしにして次へ進む（最後の質問なら、くらしを見るへ）
function SkipButton({
  label,
  current,
  conditions,
  next,
  onSkip,
  variant = "pill",
  className = "",
}: {
  label: string;
  current: QuestionId;
  conditions: Conditions;
  next: QuestionId | null;
  onSkip: (id: QuestionId, update: Partial<Conditions>) => void;
  // text は PC の右の列の文字だけのリンク（大切なことの「選ばずに進む ›」。2026-11-06 まさゆきさん）
  variant?: "pill" | "text";
  className?: string;
}) {
  const update: Partial<Conditions> = current === "car" ? { car: null } : { priorities: [] };
  const look = `${variant === "text" ? TEXT_LINK : OUTLINE_ACTION} ${className}`;
  const content = (
    <>
      {label}
      {variant === "text" && <span aria-hidden="true">›</span>}
    </>
  );
  if (next) {
    return (
      <button type="button" className={look} onClick={() => onSkip(next, update)}>
        {content}
      </button>
    );
  }
  return (
    <Link href={conditionsHref(KURASHI_PATH, { ...conditions, ...update })} className={look}>
      {content}
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
