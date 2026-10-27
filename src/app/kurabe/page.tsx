import type { Metadata } from "next";
import { Suspense } from "react";
import { KurabeView } from "@/components/kurabe/KurabeView";
import { ScreenSkeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = {
  title: "地区くらべ",
};

// 04 地区くらべ（020）。選んだ地区は URL パラメータで持つので、読むのはブラウザで動き出してから（静的書き出しではビルド時に値がない）
export default function KurabePage() {
  return (
    <Suspense fallback={<ScreenSkeleton label="地区くらべを読み込んでいます" />}>
      <KurabeView />
    </Suspense>
  );
}
