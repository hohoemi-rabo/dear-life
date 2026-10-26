"use client";

import type { ReactNode } from "react";
import { DataSourceNote } from "@/components/data/DataSourceNote";
import { DataStateMessage } from "@/components/data/DataStateMessage";
import { useScreenData } from "@/components/data/ScreenDataBoundary";
import { Card } from "@/components/ui/Card";
import { CountBadge } from "@/components/ui/CountBadge";
import { Notice } from "@/components/ui/Notice";
import { HOUSING_LABELS } from "@/lib/conditions/labels";
import type { Conditions } from "@/lib/conditions/model";
import type { DataState, MarketStat } from "@/lib/data/screen-data";
import { erabuReply, type ErabuReply } from "@/lib/erabu/replies";
import type { QuestionId } from "@/lib/erabu/questions";
import { formatManYen, formatQuarterRange } from "@/lib/format";
import { NOTICES } from "@/lib/notices";

// 1坪＝3.3058㎡（要件 5章-4）
const SQUARE_METERS_PER_TSUBO = 3.3058;

// 選ぶたびの返事（F-10）。実データの側なので、ふつうのフォント・基本色の枠で、大きな数字と件数・出典を出す（要件 8.1）。
// ScreenDataBoundary の中で使う
export function ErabuReplyCard({ question, conditions }: { question: QuestionId; conditions: Conditions }) {
  const reply = erabuReply(question, conditions, useScreenData());
  if (!reply) return null;
  return (
    <Card as="section" aria-label="選んだ条件のデータ" className="flex flex-col gap-3 border-primary/30">
      <ReplyBody reply={reply} />
    </Card>
  );
}

function ReplyBody({ reply }: { reply: ErabuReply }) {
  switch (reply.kind) {
    case "district":
      return (
        <>
          <ReplyTitle>{reply.districtName}は、こんな地区</ReplyTitle>
          <p className="text-sm">
            <span className="font-bold">範囲：</span>
            {reply.area}
          </p>
          <MarketFigure
            label="土地の真ん中の値（1㎡あたり）"
            state={reply.land}
            extra={(stat) => `1坪あたり 約${formatManYen(stat.median * SQUARE_METERS_PER_TSUBO)}`}
          />
        </>
      );
    case "children":
      return (
        <>
          <ReplyTitle>{reply.districtName}の子育て・学校</ReplyTitle>
          <div className="grid grid-cols-2 gap-3">
            <CountFigure label="保育園・幼稚園等" unit="か所" state={reply.childcare} />
            <CountFigure label="小学校" unit="校" state={reply.elementarySchools} />
          </div>
          <SourceNotes states={[reply.childcare, reply.elementarySchools]} />
        </>
      );
    case "house":
      return (
        <>
          <ReplyTitle>
            {reply.districtName}で「{HOUSING_LABELS[reply.housing]}」なら
          </ReplyTitle>
          <MarketFigure
            label={reply.housing === "new" ? "築20年以内の中古戸建ての真ん中の値" : "築21年以上の中古戸建ての真ん中の値"}
            state={reply.house}
            alwaysFew={reply.alwaysFew}
          />
        </>
      );
    case "rent":
      return (
        <>
          <ReplyTitle>「{HOUSING_LABELS.rent}」なら</ReplyTitle>
          <p className="text-lg font-bold">家賃の情報はまだありません。</p>
        </>
      );
    case "busStops":
      return (
        <>
          <ReplyTitle>{reply.districtName}のバス停</ReplyTitle>
          <CountFigure label="バス停" unit="か所" state={reply.busStops} />
          <SourceNotes states={[reply.busStops]} />
        </>
      );
  }
}

function ReplyTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-base font-bold text-primary">{children}</h2>;
}

function BigNumber({ children }: { children: ReactNode }) {
  return <p className="text-4xl font-bold tabular-nums tracking-tight">{children}</p>;
}

// 相場の値。件数・件数ラベル・出典・対象期間・注意書きを必ず添える（要件 5章-6・7）
function MarketFigure({
  label,
  state,
  alwaysFew = false,
  extra,
}: {
  label: string;
  state: DataState<MarketStat>;
  alwaysFew?: boolean;
  extra?: (stat: MarketStat) => string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-bold text-ink-muted">{label}</p>
      {state.status === "available" ? (
        <>
          <BigNumber>{formatManYen(state.value.median)}</BigNumber>
          {extra && <p className="text-sm">{extra(state.value)}</p>}
          <CountBadge count={state.value.sampleCount} alwaysFew={alwaysFew} />
        </>
      ) : (
        <DataStateMessage state={state} />
      )}
      <Notice>{NOTICES.market}</Notice>
      {state.status !== "unavailable" && (
        <DataSourceNote
          source={state.source}
          period={state.status === "available" ? formatQuarterRange(state.value.periodFrom, state.value.periodTo) : undefined}
        />
      )}
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
