"use client";

import { useState } from "react";
import { DataSourceNote } from "@/components/data/DataSourceNote";
import { MarketSheetBody } from "@/components/data/MarketSheetBody";
import { useScreenData } from "@/components/data/ScreenDataBoundary";
import { BottomSheet } from "@/components/ui/BottomSheet";
import type { Conditions } from "@/lib/conditions/model";
import type { DataState } from "@/lib/data/screen-data";
import { erabuReply, type ErabuReply } from "@/lib/erabu/replies";
import { PROP_WIDTHS, propSrc, propSrcSet } from "@/lib/illust/assets";
import type { QuestionId } from "@/lib/erabu/questions";

// 選ぶたびの返事（F-10）。実データの側なので、ふつうのフォントで、大きな数字と件数・出典を出す（要件 8.1）。
// カードはデザインイメージに合わせて温かい色にする（027）。ScreenDataBoundary の中で使う
export function ErabuReplyCard({ question, conditions }: { question: QuestionId; conditions: Conditions }) {
  const reply = erabuReply(question, conditions, useScreenData());
  if (!reply) return null;
  if (reply.kind === "children") return <ChildrenReply reply={reply} />;
  return <MarketCheck reply={reply} />;
}

type MarketReply = Extract<ErabuReply, { kind: "house" | "rent" }>;

// 家の返事（028 見本）：「住まいの参考相場を確認」のカードだけを出し、押すと下からシートで相場を見せる。
// えらぶは先へ進むのが主なので、画面には数字を出さず、見たい人だけが開く（2026-10-29 まさゆきさん）
function MarketCheck({ reply }: { reply: MarketReply }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-card border border-warm/60 bg-warm-soft px-4 py-3 text-left transition duration-150 hover:border-warm active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <MarketIcon />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-bold">住まいの参考相場を確認</span>
          <span className="text-xs text-ink-muted">{reply.kind === "house" ? "過去の取引価格・件数を表示" : "家賃の情報を表示"}</span>
        </span>
        <span aria-hidden="true" className="text-2xl text-ink-muted">
          ›
        </span>
      </button>
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={reply.kind === "house" ? `${reply.districtName}の中古戸建て（${reply.housing === "new" ? "築20年以内" : "築21年以上"}）` : "借りるときの家賃"}
      >
        {/* 出典・対象期間・確認日はここでは出さない（2026-10-29 まさゆきさん。えらぶは先へ進むのが主なので）。
            同じ相場はカルテの住まいのカードと「データについて」で、出典・対象期間・確認日と一緒に見られる */}
        <MarketSheetBody state={reply.kind === "house" ? reply.house : null} alwaysFew={reply.kind === "house" && reply.alwaysFew} />
      </BottomSheet>
    </>
  );
}

// 「住まいの参考相場を確認」の印（見本：書類と虫めがね）。飾り
function MarketIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 40 40" className="size-10 shrink-0" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 5h17l6 6v12" className="stroke-ink" />
      <path d="M8 5v30h14" className="stroke-ink" />
      <path d="M25 5v6h6" className="stroke-ink" />
      <path d="M13 14h10M13 19h12M13 24h6" className="stroke-warm" />
      <circle cx="28.5" cy="28.5" r="5.5" className="stroke-ink" />
      <path d="m32.5 32.5 4 4" className="stroke-ink" />
    </svg>
  );
}

// 子育て・学校の返事（028 見本）：薄いピンクの小さなカードに、校舎の絵（2026-10-31 まさゆきさんの絵）と数をひと言で。出典は1行で出し、対象時点・確認日は開いて見る
function ChildrenReply({ reply }: { reply: Extract<ErabuReply, { kind: "children" }> }) {
  const states = [reply.childcare, reply.elementarySchools];
  return (
    <section aria-label="選んだ条件のデータ" className="flex gap-3 rounded-card border border-blush bg-blush-soft p-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- 書き出した WebP を srcset で選ばせる（えらぶの選択肢の絵と同じ理由） */}
      <img
        src={propSrc("reply-school", PROP_WIDTHS[0])}
        srcSet={propSrcSet("reply-school")}
        sizes="(min-width: 640px) 96px, 80px"
        alt=""
        draggable={false}
        decoding="async"
        className="w-20 shrink-0 select-none self-center sm:w-24"
      />
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="font-bold">{reply.districtName}の子育て・学校</h2>
        <p className="flex flex-wrap items-baseline gap-x-1.5 text-xs">
          <InlineCount label="保育園・幼稚園等" unit="か所" state={reply.childcare} />
          <span aria-hidden="true" className="text-ink-muted">
            /
          </span>
          <InlineCount label="小学校" unit="校" state={reply.elementarySchools} />
        </p>
        <CompactSources states={states} />
      </div>
    </section>
  );
}

function InlineCount({ label, unit, state }: { label: string; unit: string; state: DataState<number> }) {
  return (
    <span>
      {label}{" "}
      {state.status === "available" ? (
        <>
          <span className="text-base font-bold tabular-nums">{state.value}</span>
          {unit}
        </>
      ) : (
        <span className="font-bold">{state.status === "none" ? "該当なし" : "データ未取得"}</span>
      )}
    </span>
  );
}

// 出典を1行で出し（見本）、対象時点・確認日は開いて見る（要件：すべての情報に出典・対象時点・確認日）
function CompactSources({ states }: { states: readonly DataState<unknown>[] }) {
  const sources = states.flatMap((state) => (state.status === "unavailable" ? [] : [state.source]));
  const unique = sources.filter((source, index) => sources.findIndex(({ id }) => id === source.id) === index);
  if (unique.length === 0) return null;
  const publishers = [...new Set(unique.map(({ publisher }) => publisher))].join("・");
  return (
    <details className="group text-xs text-ink-muted">
      <summary className="flex min-h-tap cursor-pointer list-none items-center gap-1 [&::-webkit-details-marker]:hidden">
        出典：{publishers}「{unique.map(({ name }) => name).join("」「")}」
        <span className="whitespace-nowrap font-bold text-primary underline-offset-2 group-open:hidden">対象時点・確認日 ›</span>
      </summary>
      <div className="flex flex-col gap-2 pb-1">
        {unique.map((source) => (
          <DataSourceNote key={source.id} source={source} />
        ))}
      </div>
    </details>
  );
}
