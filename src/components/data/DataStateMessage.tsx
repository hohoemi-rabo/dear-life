import type { DataState } from "@/lib/data/screen-data";

type MissingState = Exclude<DataState<unknown>, { status: "available" }>;

// 値がないときの表示。「該当なし」と「データ未取得」を区別する（F-09）。
// 022 で、データについてページへの案内などを足すときもここを直す
export function DataStateMessage({ state }: { state: MissingState }) {
  if (state.status === "none") {
    return (
      <p className="text-sm">
        <span className="font-bold">該当なし</span>
        <span className="text-ink-muted">：出典のデータに、この地区に当てはまるものはありません。</span>
      </p>
    );
  }
  return (
    <p className="text-sm">
      <span className="font-bold">データ未取得</span>
      <span className="text-ink-muted">：このデータは準備中です。</span>
    </p>
  );
}

// 表のマスのように狭いところで使う短い表示（地区くらべ）。意味は表の下で1回だけ説明する
export function DataStateLabel({ state }: { state: MissingState }) {
  return <span className="text-sm font-bold text-ink-muted">{state.status === "none" ? "該当なし" : "データ未取得"}</span>;
}
