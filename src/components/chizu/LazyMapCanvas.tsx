"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/Skeleton";

// Google マップはこの画面でだけ、ブラウザで読み込む（032。地図の読み込みは Google の料金の数え方にも入るため）
export const LazyMapCanvas = dynamic(() => import("./MapCanvas"), {
  ssr: false,
  loading: () => (
    <div role="status" className="h-full w-full">
      <span className="sr-only">地図を読み込んでいます</span>
      <Skeleton className="h-full w-full rounded-none" />
    </div>
  ),
});
