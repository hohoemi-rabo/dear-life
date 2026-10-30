"use client";

import { useSyncExternalStore } from "react";

// PC の並び（左に「わが家」、ピンの中身は絵の上の吹き出し）にする幅。tailwind の lg と同じ
export const WIDE_QUERY = "(min-width: 1024px)";

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia?.(WIDE_QUERY);
  query?.addEventListener("change", onChange);
  return () => query?.removeEventListener("change", onChange);
}

// ピンを押したときに、スマホは下からのシート、PC は吹き出しを出しわけるために使う。書き出しのときはスマホとみなす
export function useWideScreen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia?.(WIDE_QUERY).matches ?? false,
    () => false,
  );
}
