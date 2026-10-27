"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { saveLastView } from "@/lib/pwa/last-view";

// 見ている画面と条件を端末に残す（024）。useSearchParams を使うので <Suspense> の中に置く
export function RememberLastView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => {
    const query = searchParams.toString();
    saveLastView(pathname, query ? `?${query}` : "");
  }, [pathname, searchParams]);
  return null;
}
