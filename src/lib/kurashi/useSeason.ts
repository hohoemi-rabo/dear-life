"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { Season } from "../conditions/scene.ts";
import { parseSeason, SEASON_PARAM, SEASON_SLUGS } from "./season.ts";

// 今の季節を URL の s で読み書きする（F-11）。useSearchParams を使うので <Suspense> の中で使う。
// 季節を変えても履歴は増やさない（ブラウザの「戻る」で、季節ではなく前の画面に戻る）
export function useSeason(): { season: Season; setSeason: (season: Season) => void } {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const season = parseSeason(searchParams.get(SEASON_PARAM));

  const setSeason = useCallback(
    (next: Season) => {
      const params = new URLSearchParams(searchParams);
      params.set(SEASON_PARAM, SEASON_SLUGS[next]);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return { season, setSeason };
}
