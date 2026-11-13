// 相場の値に必ず添える件数（要件 5章-6）。どの値にも同じ書き方で「取引〇件・参考値」と出す。
// 件数で変わる札（件数じゅうぶん・参考程度など）は出さない（区切りの線に根拠がなく、何がじゅうぶんかが伝わらないため。2026-11-13 まさゆきさん。040）
export function TradeCount({ count, size = "md", className = "" }: { count: number; size?: "sm" | "md"; className?: string }) {
  return (
    <span className={`${size === "sm" ? "text-xs" : "text-sm"} ${className}`}>
      取引<span className="tabular-nums">{count.toLocaleString("ja-JP")}</span>件・参考値
    </span>
  );
}
