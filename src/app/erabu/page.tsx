import type { Metadata } from "next";
import { Suspense } from "react";
import { ErabuFlow } from "@/components/erabu/ErabuFlow";
import { Skeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = {
  title: "えらぶ",
};

// 01 えらぶ（016）。条件は URL パラメータで持つので、読むのはブラウザで動き出してから（静的書き出しではビルド時に値がない）
export default function ErabuPage() {
  return (
    <Suspense fallback={<ErabuSkeleton />}>
      <ErabuFlow />
    </Suspense>
  );
}

function ErabuSkeleton() {
  return (
    <div role="status" aria-busy="true" className="mx-auto flex max-w-xl flex-col gap-5 lg:max-w-[1200px]">
      <span className="sr-only">読み込んでいます</span>
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-8 w-2/3" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    </div>
  );
}
