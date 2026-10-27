import type { DataState } from "@/lib/data/screen-data";

type MissingState = Exclude<DataState<unknown>, { status: "available" }>;

// 「該当なし」と「データ未取得」の意味（F-09）。文言はここだけで管理し、データについてページでも同じ説明を出す。
// place は「この地区」「その地区」「4地区」のように、画面で何に当てはまらないのかを入れる
export function dataStateDescription(status: MissingState["status"], place: string): string {
  return status === "none"
    ? `出典のデータに、${place}に当てはまるものはありません。`
    : "出典の確認や取り込みが済んでいないため、まだ出せません。";
}

// 値がないときの表示。「該当なし」と「データ未取得」を区別する（F-09）。
// 1つの画面に何度も出るので、データについてページへのリンクは付けない（全画面の下からつながる）
export function DataStateMessage({ state }: { state: MissingState }) {
  return (
    <p className="text-sm">
      <span className="font-bold">{state.status === "none" ? "該当なし" : "データ未取得"}</span>
      <span className="text-ink-muted">：{dataStateDescription(state.status, "この地区")}</span>
    </p>
  );
}

// 表のマスのように狭いところで使う短い表示（地区くらべ）。意味は DataStateLegend で1回だけ説明する
export function DataStateLabel({ state }: { state: MissingState }) {
  return <span className="text-sm font-bold text-ink-muted">{state.status === "none" ? "該当なし" : "データ未取得"}</span>;
}

// 「該当なし」「データ未取得」の意味をまとめて出す（地区くらべ・地図の出典の欄、データについてページ）
export function DataStateLegend({ place }: { place: string }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
      <dt className="font-bold">該当なし</dt>
      <dd className="text-ink-muted">{dataStateDescription("none", place)}</dd>
      <dt className="font-bold">データ未取得</dt>
      <dd className="text-ink-muted">{dataStateDescription("unavailable", place)}</dd>
    </dl>
  );
}
