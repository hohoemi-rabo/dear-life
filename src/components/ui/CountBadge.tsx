import { countLabel, FEW_COUNT_LABEL, type CountLevel } from "@/lib/count-label";

const LEVEL_STYLES: Record<CountLevel, string> = {
  enough: "bg-primary-soft text-primary",
  moderate: "bg-kinari-deep text-ink",
  few: "bg-kind-local-soft text-kind-local",
};

// 件数と件数ラベル。相場などの値には必ず添える（要件 5章-6）。
// alwaysFew は件数によらず「件数少なめ・参考程度」にする（築20年以内は4地区とも12件以下なので、えらぶ画面では必ず付ける。要件 4章）
export function CountBadge({ count, alwaysFew = false }: { count: number; alwaysFew?: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 text-sm">
      <span className="font-bold tabular-nums">{count.toLocaleString("ja-JP")}件</span>
      <CountLabel count={count} alwaysFew={alwaysFew} />
    </span>
  );
}

// 件数ラベルの札だけ（件数は呼ぶ側がそばに出す。カルテの住まいのカードは「過去の取引 9件」と札を離して置く。028 見本）
export function CountLabel({ count, alwaysFew = false, className = "" }: { count: number; alwaysFew?: boolean; className?: string }) {
  const { level, text } = alwaysFew ? FEW_COUNT_LABEL : countLabel(count);
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${LEVEL_STYLES[level]} ${className}`}>{text}</span>;
}
