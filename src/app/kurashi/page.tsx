import type { Metadata } from "next";
import { Suspense } from "react";
import { KurashiView } from "@/components/kurashi/KurashiView";
import { Skeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = {
  title: "くらしを見る",
};

// 02 くらしを見る（018）。条件と季節は URL パラメータで持つので、読むのはブラウザで動き出してから（静的書き出しではビルド時に値がない）
export default function KurashiPage() {
  return (
    <Suspense fallback={<KurashiSkeleton />}>
      <KurashiView />
    </Suspense>
  );
}

function KurashiSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-5">
      <span className="sr-only">読み込んでいます</span>
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="aspect-[16/9] w-[320px] self-center sm:w-[480px]" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
