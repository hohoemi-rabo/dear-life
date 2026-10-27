"use client";

import { useSyncExternalStore } from "react";
import { offlineCopyGeneratedAt, offlineNoticeText, subscribeOfflineCopy } from "@/lib/data/offline-data";

// 圏外で、端末に残した前回のデータを出しているときの知らせ（要件 8.2）。画面の上に1つだけ出す（layout.tsx）。
// 実データの側なので基本色だけで出す
export function OfflineBanner() {
  const generatedAt = useSyncExternalStore(subscribeOfflineCopy, offlineCopyGeneratedAt, () => null);
  if (generatedAt === null) return null;
  return (
    <p role="status" className="mb-4 rounded-card border border-line bg-kinari-deep px-4 py-3 text-sm font-bold">
      {offlineNoticeText(generatedAt)}
    </p>
  );
}
