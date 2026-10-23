// 取引時期の四半期（例：2026年第1四半期）。新しい四半期が出たかの判定と、対象期間（要件 5章-1）の計算に使う
import type { JstDate } from "./time";

export type Quarter = { year: number; quarter: 1 | 2 | 3 | 4 };

// 通し番号にすると、足し引きと大小の比較が簡単になる
function toIndex(q: Quarter): number {
  return q.year * 4 + (q.quarter - 1);
}

function fromIndex(index: number): Quarter {
  return { year: Math.floor(index / 4), quarter: ((index % 4) + 1) as Quarter["quarter"] };
}

export function addQuarters(q: Quarter, count: number): Quarter {
  return fromIndex(toIndex(q) + count);
}

export function compareQuarters(a: Quarter, b: Quarter): number {
  return toIndex(a) - toIndex(b);
}

export function quarterOf(date: JstDate): Quarter {
  return { year: date.year, quarter: Math.ceil(date.month / 3) as Quarter["quarter"] };
}

// API の Period（例：2026年第1四半期）を読む。形が違えば null
export function parsePeriod(period: string): Quarter | null {
  const match = /^(\d{4})年第([1-4])四半期$/.exec(period.trim());
  if (!match) return null;
  return { year: Number(match[1]), quarter: Number(match[2]) as Quarter["quarter"] };
}

// market_stats.period_from などの形（例：2026Q1）
export function quarterCode(q: Quarter): string {
  return `${q.year}Q${q.quarter}`;
}

// 画面・data_sources.period_label の形（例：2026年第1四半期）
export function quarterLabel(q: Quarter): string {
  return `${q.year}年第${q.quarter}四半期`;
}
