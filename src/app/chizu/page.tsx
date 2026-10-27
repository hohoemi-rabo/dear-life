import type { Metadata } from "next";
import { Suspense } from "react";
import { ChizuView } from "@/components/chizu/ChizuView";
import { ScreenSkeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = {
  title: "地図",
};

// 05 地図（021）。選んだ地区は URL パラメータで持つので、読むのはブラウザで動き出してから（静的書き出しではビルド時に値がない）
export default function ChizuPage() {
  return (
    <Suspense fallback={<ScreenSkeleton label="地図を読み込んでいます" />}>
      <ChizuView />
    </Suspense>
  );
}
