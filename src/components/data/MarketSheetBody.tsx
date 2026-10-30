import { DataStateMessage } from "@/components/data/DataStateMessage";
import { CountBadge } from "@/components/ui/CountBadge";
import { Notice } from "@/components/ui/Notice";
import type { DataState, MarketStat } from "@/lib/data/screen-data";
import { formatManYen } from "@/lib/format";
import { NOTICES } from "@/lib/notices";

// 住まいの相場のシートの中身（えらぶ 03・くらしの「住まい」のピン。028）。必要なものだけ：真ん中の値・件数と件数ラベル・注意書き
// （要件 5章-6・7）。借りるときの家賃はまだ集めていないので「データ未取得」（state に null を渡す）
export function MarketSheetBody({ state, alwaysFew = false }: { state: DataState<MarketStat> | null; alwaysFew?: boolean }) {
  if (state === null) return <DataStateMessage state={{ status: "unavailable" }} />;
  return (
    <div className="flex flex-col gap-3">
      {state.status === "available" ? (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-bold text-ink-muted">取引の真ん中の値</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {/* 値段は値段用のフォント（027） */}
            <p className="price-figure text-4xl tracking-tight">{formatManYen(state.value.median)}</p>
            <CountBadge count={state.value.sampleCount} alwaysFew={alwaysFew} />
          </div>
        </div>
      ) : (
        <DataStateMessage state={state} />
      )}
      <Notice>{NOTICES.market}</Notice>
    </div>
  );
}
