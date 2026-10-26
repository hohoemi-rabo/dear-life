import { countLabel, FEW_COUNT_LABEL, type CountLevel } from "@/lib/count-label";

const LEVEL_STYLES: Record<CountLevel, string> = {
  enough: "bg-primary-soft text-primary",
  moderate: "bg-kinari-deep text-ink",
  few: "bg-kind-local-soft text-kind-local",
};

// 件数と件数ラベル。相場などの値には必ず添える（要件 5章-6）。
// alwaysFew は件数によらず「件数少なめ・参考程度」にする（築20年以内は4地区とも12件以下なので、えらぶ画面では必ず付ける。要件 4章）
export function CountBadge({ count, alwaysFew = false }: { count: number; alwaysFew?: boolean }) {
  const { level, text } = alwaysFew ? FEW_COUNT_LABEL : countLabel(count);
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 text-sm">
      <span className="font-bold tabular-nums">{count.toLocaleString("ja-JP")}件</span>
      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${LEVEL_STYLES[level]}`}>{text}</span>
    </span>
  );
}
