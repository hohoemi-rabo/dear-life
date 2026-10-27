import type { Metadata } from "next";
import { Suspense } from "react";
import { KarteView } from "@/components/karte/KarteView";
import { ScreenSkeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = {
  title: "カルテ",
};

// 03 カルテ（019）。条件は URL パラメータで持つので、読むのはブラウザで動き出してから（静的書き出しではビルド時に値がない）
export default function KartePage() {
  return (
    <Suspense fallback={<ScreenSkeleton label="カルテを読み込んでいます" />}>
      <KarteView />
    </Suspense>
  );
}
