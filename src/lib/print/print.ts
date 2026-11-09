// 印刷・PDF（023・F-07）の決めごと。何を印刷するかは使う人がチェックで選ぶ（2026-11-09 まさゆきさん）
import { japanDate } from "../data/screen-data.ts";
import { formatJaDate } from "../format.ts";

// 印刷物に入れる印刷日（日本時間の「2026年11月9日」）
export function printedOn(now: Date): string {
  return formatJaDate(japanDate(now));
}

// 選んだものを、選択肢の並び（画面の並び）にそろえる。選択肢にないものは捨てる
export function orderSelection<Id extends string>(options: readonly Id[], selected: Iterable<Id>): Id[] {
  const chosen = new Set(selected);
  return options.filter((id) => chosen.has(id));
}

// 「すべて選ぶ」と「すべて外す」の切りかえ。すべて選んでいるときだけ「外す」にする
export function toggleAll<Id extends string>(options: readonly Id[], selected: readonly Id[]): Id[] {
  return selected.length === options.length ? [] : [...options];
}

// 紙の中身が入る大きさ（A4 縦 210×297mm から、globals.css の @page の余白 12mm を上下左右に引いたもの）
export const PAGE_CONTENT_MM = { width: 186, height: 273 } as const;

const PX_PER_MM = 96 / 25.4;

// 画面で測った高さに、紙では少し増える分（紙だけで出す URL など）の余裕を見る
const FIT_SAFETY = 0.92;

// 1ページに収まる高さか。収まるまとまりは途中で分けず、入りきらなければ丸ごと次のページへ送る（023。2026-11-09 まさゆきさん）
export function fitsOnOnePage(heightPx: number): boolean {
  return heightPx <= PAGE_CONTENT_MM.height * PX_PER_MM * FIT_SAFETY;
}

export function pageContentWidthPx(): number {
  return PAGE_CONTENT_MM.width * PX_PER_MM;
}

// iPhone・iPad のホーム画面に追加したアプリで開いているか。navigator.standalone は iPhone・iPad の Safari だけが持つ目印で、
// Android や PC のブラウザにはないので、ほかの端末の印刷には影響しない（2026-11-09 まさゆきさん：Android の印刷は変えない）。
// このアプリの中では印刷の画面が出ない（2026-11-09 まさゆきさんの iPhone で確認。Safari で開けば印刷できる）
export function isIosHomeScreenApp(navigator: Navigator): boolean {
  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
