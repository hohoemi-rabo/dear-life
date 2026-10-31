// 絵に出せない5人目からの子どもの札「＋N人」（2026-10-31 まさゆきさん）。人数が変わるたびにぽんと出し直す。
// 飾りなので読み上げない（人数は絵の枠の名前や条件の表記で読み上げる）
export function ExtraChildrenBadge({ count, className = "" }: { count: number; className?: string }) {
  if (count <= 0) return null;
  // 人数ごとに作り直して、出る動きをもう一度かける
  return <Badge key={count} count={count} className={className} />;
}

function Badge({ count, className }: { count: number; className: string }) {
  return (
    <span
      aria-hidden="true"
      data-testid="extra-children"
      className={`whitespace-nowrap rounded-full border-2 border-primary bg-surface px-2 py-0.5 text-sm font-bold leading-tight text-ink shadow-card motion-safe:animate-pop-in ${className}`}
    >
      ＋{count}人
    </span>
  );
}
