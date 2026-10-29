"use client";

import type { ComponentProps, ReactNode } from "react";
import { DataSourceNote } from "@/components/data/DataSourceNote";
import { DataStateMessage } from "@/components/data/DataStateMessage";
import { useScreenData } from "@/components/data/ScreenDataBoundary";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { PixelImage } from "@/components/pixel/PixelImage";
import { PixelStage } from "@/components/pixel/PixelStage";
import { CountBadge } from "@/components/ui/CountBadge";
import { Notice } from "@/components/ui/Notice";
import { HOUSING_LABELS } from "@/lib/conditions/labels";
import type { Conditions } from "@/lib/conditions/model";
import type { DataState, MarketStat } from "@/lib/data/screen-data";
import { erabuReply, type ErabuReply } from "@/lib/erabu/replies";
import type { QuestionId } from "@/lib/erabu/questions";
import { formatManYen, formatQuarterRange } from "@/lib/format";
import { NOTICES } from "@/lib/notices";
import { familyArtFor } from "@/lib/pixel/assets";

// 選ぶたびの返事（F-10）。実データの側なので、ふつうのフォントで、大きな数字と件数・出典を出す（要件 8.1）。
// カードはデザインイメージに合わせて温かい色にする（027）。ScreenDataBoundary の中で使う
export function ErabuReplyCard({ question, conditions }: { question: QuestionId; conditions: Conditions }) {
  const reply = erabuReply(question, conditions, useScreenData());
  if (!reply) return null;
  if (reply.kind === "children") return <ChildrenReply reply={reply} />;
  return (
    <section
      aria-label="選んだ条件のデータ"
      className="flex flex-col gap-3 rounded-card border-2 border-warm bg-warm-soft p-4 shadow-card"
    >
      <ReplyBody reply={reply} conditions={conditions} />
    </section>
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

function ReplyBody({ reply, conditions }: { reply: ErabuReply; conditions: Conditions }) {
  // 家の返事には、選んだ家族の絵を添える（デザインイメージ）
  const family = <PixelImage asset={familyArtFor(conditions.adults, conditions.children)} scale={2} decorative />;
  switch (reply.kind) {
    case "children":
      // ChildrenReply で出す
      return null;
    case "house":
      return (
        <>
          <ReplyTitle icon="icon-house">
            {reply.districtName}で「{HOUSING_LABELS[reply.housing]}」なら
          </ReplyTitle>
          <MarketFigure
            label={reply.housing === "new" ? "築20年以内の中古戸建ての真ん中の値" : "築21年以上の中古戸建ての真ん中の値"}
            state={reply.house}
            alwaysFew={reply.alwaysFew}
            art={family}
          />
        </>
      );
    case "rent":
      return (
        <>
          <ReplyTitle icon="icon-house">「{HOUSING_LABELS.rent}」なら</ReplyTitle>
          <div className="flex items-end justify-between gap-3">
            <p className="text-lg font-bold">家賃の情報はまだありません。</p>
            {family}
          </div>
        </>
      );
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

// 相場の値。件数・件数ラベル・出典・対象期間・注意書きを必ず添える（要件 5章-6・7）
// 値段の右に件数と件数ラベルを並べる（デザインイメージ）。狭いときは下に回る
function MarketFigure({
  label,
  state,
  alwaysFew = false,
  art,
}: {
  label: string;
  state: DataState<MarketStat>;
  alwaysFew?: boolean;
  art?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-bold text-ink-muted">{label}</p>
      {state.status === "available" ? (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <BigNumber price>{formatManYen(state.value.median)}</BigNumber>
            <CountBadge count={state.value.sampleCount} alwaysFew={alwaysFew} />
          </div>
        </>
      ) : (
        <DataStateMessage state={state} />
      )}
      <div className="flex items-end justify-between gap-3 border-t border-warm pt-2">
        <div className="flex flex-col gap-2">
          <Notice>{NOTICES.market}</Notice>
          {state.status !== "unavailable" && (
            <DataSourceNote
              source={state.source}
              period={state.status === "available" ? formatQuarterRange(state.value.periodFrom, state.value.periodTo) : undefined}
            />
          )}
        </div>
        {art && <div className="shrink-0">{art}</div>}
      </div>
    </div>
  );
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
