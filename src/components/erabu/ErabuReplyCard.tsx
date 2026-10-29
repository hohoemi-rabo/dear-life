"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { DataSourceNote } from "@/components/data/DataSourceNote";
import { DataStateMessage } from "@/components/data/DataStateMessage";
import { useScreenData } from "@/components/data/ScreenDataBoundary";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { PixelImage } from "@/components/pixel/PixelImage";
import { PixelStage } from "@/components/pixel/PixelStage";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { CountBadge } from "@/components/ui/CountBadge";
import { Notice } from "@/components/ui/Notice";
import type { Conditions } from "@/lib/conditions/model";
import type { DataState } from "@/lib/data/screen-data";
import { erabuReply, type ErabuReply } from "@/lib/erabu/replies";
import type { QuestionId } from "@/lib/erabu/questions";
import { formatManYen, formatQuarterRange } from "@/lib/format";
import { NOTICES } from "@/lib/notices";

// 選ぶたびの返事（F-10）。実データの側なので、ふつうのフォントで、大きな数字と件数・出典を出す（要件 8.1）。
// カードはデザインイメージに合わせて温かい色にする（027）。ScreenDataBoundary の中で使う
export function ErabuReplyCard({ question, conditions }: { question: QuestionId; conditions: Conditions }) {
  const reply = erabuReply(question, conditions, useScreenData());
  if (!reply) return null;
  if (reply.kind === "children") return <ChildrenReply reply={reply} />;
  if (reply.kind === "house" || reply.kind === "rent") return <MarketCheck reply={reply} />;
  return (
    <section
      aria-label="選んだ条件のデータ"
      className="flex flex-col gap-3 rounded-card border-2 border-warm bg-warm-soft p-4 shadow-card"
    >
      <ReplyBody reply={reply} />
    </section>
  );
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
        <MarketSheetBody reply={reply} />
      </BottomSheet>
    </>
  );
}

// シートの中身は必要なものだけ：真ん中の値・件数と件数ラベル・注意書き・出典（要件 5章-6・7）。
// 対象期間・確認日は出典の行を開いて見る（02 の子育て・学校のカードと同じ）
function MarketSheetBody({ reply }: { reply: MarketReply }) {
  if (reply.kind === "rent") return <DataStateMessage state={{ status: "unavailable" }} />;
  const state = reply.house;
  return (
    <div className="flex flex-col gap-3">
      {state.status === "available" ? (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-bold text-ink-muted">取引の真ん中の値</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <BigNumber price>{formatManYen(state.value.median)}</BigNumber>
            <CountBadge count={state.value.sampleCount} alwaysFew={reply.alwaysFew} />
          </div>
        </div>
      ) : (
        <DataStateMessage state={state} />
      )}
      <Notice>{NOTICES.market}</Notice>
      <CompactSources
        states={[state]}
        period={state.status === "available" ? formatQuarterRange(state.value.periodFrom, state.value.periodTo) : undefined}
      />
    </div>
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

// 子育て・学校の返事（028 見本）：薄いピンクの小さなカードに、数をひと言で。出典は1行で出し、対象時点・確認日は開いて見る
function ChildrenReply({ reply }: { reply: Extract<ErabuReply, { kind: "children" }> }) {
  const states = [reply.childcare, reply.elementarySchools];
  return (
    <section aria-label="選んだ条件のデータ" className="flex gap-3 rounded-card border border-blush bg-blush-soft p-3">
      <PixelStage className="h-14 w-16 shrink-0 self-center overflow-hidden rounded-button">
        <PixelImage asset="facility-school" scale={2} decorative />
      </PixelStage>
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
// period を渡すと、出典の対象期間の代わりにそれを出す（相場は集計の対象期間）
function CompactSources({ states, period }: { states: readonly DataState<unknown>[]; period?: string }) {
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
          <DataSourceNote key={source.id} source={source} period={period} />
        ))}
      </div>
    </details>
  );
}

function ReplyBody({ reply }: { reply: ErabuReply }) {
  switch (reply.kind) {
    case "children":
    case "house":
    case "rent":
      // ChildrenReply・MarketCheck で出す
      return null;
    case "busStops":
      return (
        <>
          <ReplyTitle icon="icon-transport">{reply.districtName}のバス停</ReplyTitle>
          <CountFigure label="バス停" unit="か所" state={reply.busStops} />
          <SourceNotes states={[reply.busStops]} />
        </>
      );
  }
}

function ReplyTitle({ icon, children }: { icon: ComponentProps<typeof PixelIcon>["icon"]; children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-base font-bold text-primary">
      <PixelIcon icon={icon} />
      {children}
    </h2>
  );
}

// 値段は値段用のフォント、件数はふつうのフォント（027）
function BigNumber({ children, price = false }: { children: ReactNode; price?: boolean }) {
  return <p className={`text-4xl tracking-tight ${price ? "price-figure" : "font-bold tabular-nums"}`}>{children}</p>;
}

function CountFigure({ label, unit, state }: { label: string; unit: string; state: DataState<number> }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-bold text-ink-muted">{label}</p>
      {state.status === "available" ? (
        <BigNumber>
          {state.value}
          <span className="ml-1 text-lg">{unit}</span>
        </BigNumber>
      ) : (
        <DataStateMessage state={state} />
      )}
    </div>
  );
}

// 数の出典。数を横に並べても出典は読みやすい幅で出せるよう、数の下にまとめる（同じ出典は1回だけ）
function SourceNotes({ states }: { states: readonly DataState<unknown>[] }) {
  const sources = states.flatMap((state) => (state.status === "unavailable" ? [] : [state.source]));
  const unique = sources.filter((source, index) => sources.findIndex(({ id }) => id === source.id) === index);
  if (unique.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {unique.map((source) => (
        <DataSourceNote key={source.id} source={source} />
      ))}
    </div>
  );
}
