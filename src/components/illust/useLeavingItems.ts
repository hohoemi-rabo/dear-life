"use client";

import { useEffect, useRef, useState } from "react";

// 消える動き（tailwind の animate-pop-out）の長さ。終わったら絵から外す
export const LEAVE_MS = 240;

// 外れたものを、消える動きのあいだだけ前の位置に残す（028 の家族・印）。keyOf で同じものかどうかを見分ける
export function useLeavingItems<T>(items: readonly T[], keyOf: (item: T) => string): T[] {
  // items は描くたびに作り直されるので、並びが変わったときだけ比べる。比べる中身は ref から読む
  const latest = useRef({ items, keyOf });
  latest.current = { items, keyOf };
  const previous = useRef(items);
  const [leaving, setLeaving] = useState<T[]>([]);
  const key = items.map(keyOf).join(",");

  useEffect(() => {
    const { items: now, keyOf: keyOfNow } = latest.current;
    const present = new Set(now.map(keyOfNow));
    const removed = previous.current.filter((item) => !present.has(keyOfNow(item)));
    previous.current = now;
    if (removed.length === 0) return;
    setLeaving((current) => [...current.filter((item) => !present.has(keyOfNow(item))), ...removed]);
    const timer = setTimeout(() => setLeaving((current) => current.filter((item) => !removed.includes(item))), LEAVE_MS);
    return () => clearTimeout(timer);
  }, [key]);

  const present = new Set(items.map(keyOf));
  return leaving.filter((item) => !present.has(keyOf(item)));
}
