import { countLabel, FEW_COUNT_LABEL, type CountLevel } from "@/lib/count-label";

const LEVEL_STYLES: Record<CountLevel, string> = {
  enough: "bg-primary-soft text-primary",
  moderate: "bg-kinari-deep text-ink",
  few: "bg-kind-local-soft text-kind-local",
};

// 色のついた列の上でも札が背景にとけないように付ける枠（地区くらべ。028 見本）
const LEVEL_OUTLINES: Record<CountLevel, string> = {
  enough: "border border-primary/30",
  moderate: "border border-kind-local/20",
  few: "border border-kind-local/40",
};

// 件数と件数ラベル。相場などの値には必ず添える（要件 5章-6）。
// alwaysFew は件数によらず「件数少なめ・参考程度」にする（築20年以内は4地区とも12件以下なので、えらぶ画面では必ず付ける。要件 4章）
export function CountBadge({
  count,
  alwaysFew = false,
  outlined = false,
  prefix = "",
  tight = false,
}: {
  count: number;
  alwaysFew?: boolean;
  outlined?: boolean;
  prefix?: string;
  // 狭い列でも件数と札を1行に収める（地区くらべのスマホの見本）
  tight?: boolean;
}) {
  return (
    <span className={`inline-flex flex-wrap items-baseline ${tight ? "gap-x-1 gap-y-0.5 text-xs" : "gap-x-2 text-sm"}`}>
      <span className="font-bold tabular-nums">
        {prefix}
        {count.toLocaleString("ja-JP")}件
      </span>
      <CountLabel count={count} alwaysFew={alwaysFew} outlined={outlined} tight={tight} />
    </span>
  );
}

// 件数ラベルの札だけ（件数は呼ぶ側がそばに出す。カルテの住まいのカードは「過去の取引 9件」と札を離して置く。028 見本）
export function CountLabel({
  count,
  alwaysFew = false,
  outlined = false,
  tight = false,
  className = "",
}: {
  count: number;
  alwaysFew?: boolean;
  outlined?: boolean;
  tight?: boolean;
  className?: string;
}) {
  const { level, text } = alwaysFew ? FEW_COUNT_LABEL : countLabel(count);
  return <span className={`rounded-full py-0.5 font-bold ${tight ? "px-1.5 text-[11px]" : "px-2 text-xs"} ${LEVEL_STYLES[level]} ${outlined ? LEVEL_OUTLINES[level] : ""} ${className}`}>{text}</span>;
}
