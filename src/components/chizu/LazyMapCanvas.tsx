"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/Skeleton";

// MapLibre はこの画面でだけ、ブラウザで読み込む（大きいのと、WebGL がサーバーにないため）
export const LazyMapCanvas = dynamic(() => import("./MapCanvas"), {
  ssr: false,
  loading: () => (
    <div role="status" className="h-full w-full">
      <span className="sr-only">地図を読み込んでいます</span>
      <Skeleton className="h-full w-full rounded-none" />
    </div>
  ),
});
