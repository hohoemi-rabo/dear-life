import type { Metadata } from "next";
import { Suspense } from "react";
import { KurashiView } from "@/components/kurashi/KurashiView";
import { Skeleton } from "@/components/ui/Skeleton";
import { scenePicturePreloadScript } from "@/lib/kurashi/scene-picture";

export const metadata: Metadata = {
  title: "くらしを見る",
};

// 02 くらしを見る（018）。条件と季節は URL パラメータで持つので、読むのはブラウザで動き出してから（静的書き出しではビルド時に値がない）
export default function KurashiPage() {
  return (
    <>
      {/* 風景の絵を、画面のプログラムを待たずに読み始める（025。遅い回線で約3秒早くなる） */}
      <script dangerouslySetInnerHTML={{ __html: scenePicturePreloadScript() }} />
      <Suspense fallback={<KurashiSkeleton />}>
        <KurashiView />
      </Suspense>
    </>
  );
}

// 画面の高さまで伸ばし、フッターを最初から画面の外に置く（ScreenSkeleton の fillScreen と同じ理由。025）
function KurashiSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex min-h-[100svh] flex-col gap-5">
      <span className="sr-only">読み込んでいます</span>
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="aspect-[16/9] w-[320px] self-center sm:w-[480px]" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
