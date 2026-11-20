// 読み込み中の骨組み表示。Suspense の fallback に使う。動きを減らす設定の端末では点滅させない
export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={["rounded-button bg-kinari-deep motion-safe:animate-pulse", className].filter(Boolean).join(" ")} />
  );
}

// 画面全体の骨組み（見出し・大きな数字のカード・一覧）。画面ごとに形を合わせたいときは Skeleton を並べて作る。
// fillScreen：ページ全体の読み込み中（URL の条件を読む前）に使う。骨組みを画面の高さまで伸ばし、下の帯（フッター）を最初から画面の外に置く。
// 短いままだとフッターが画面の中に見え、中身が出た瞬間に押し出されて画面が大きく動く（2026-11-20 カルテで CLS 0.15。025）
export function ScreenSkeleton({ label = "データを読み込んでいます", fillScreen = false }: { label?: string; fillScreen?: boolean }) {
  return (
    <div role="status" aria-busy="true" className={`flex flex-col gap-4 ${fillScreen ? "min-h-[100svh]" : ""}`}>
      <span className="sr-only">{label}</span>
      <Skeleton className="h-7 w-2/3" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}
