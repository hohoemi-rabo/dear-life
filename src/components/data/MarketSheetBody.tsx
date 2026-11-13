import { DataStateMessage } from "@/components/data/DataStateMessage";
import { TradeCount } from "@/components/ui/TradeCount";
import { Notice } from "@/components/ui/Notice";
import type { DataState, MarketStat } from "@/lib/data/screen-data";
import { formatManYen } from "@/lib/format";
import { NOTICES } from "@/lib/notices";

// 住まいの相場のシートの中身（えらぶ 03・くらしの「住まい」のピン。028）。必要なものだけ：中央値・「取引〇件・参考値」・注意書き
// （要件 5章-6・7）。借りるときの家賃は RentSheetBody（034）
export function MarketSheetBody({ state }: { state: DataState<MarketStat> }) {
  return (
    <div className="flex flex-col gap-3">
      {state.status === "available" ? (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-bold text-ink-muted">取引の中央値</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {/* 値段は値段用のフォント（027） */}
            <p className="price-figure text-4xl tracking-tight">{formatManYen(state.value.median)}</p>
            <TradeCount count={state.value.sampleCount} className="font-bold" />
          </div>
        </div>
      ) : (
        <DataStateMessage state={state} />
      )}
      <Notice>{NOTICES.market}</Notice>
    </div>
  );
}
