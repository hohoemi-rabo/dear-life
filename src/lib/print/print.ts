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
