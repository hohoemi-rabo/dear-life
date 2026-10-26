"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { Conditions } from "./model.ts";
import { parseConditions, writeConditions } from "./url.ts";

// URL パラメータの条件を読み書きする（F-02）。静的書き出しではページの searchParams がビルド時に空なので、
// これを使う Client Component は必ず <Suspense> で囲む（CLAUDE.md）。
// 書きかえは router.replace で行い、選び直しのたびに履歴を増やさない
export function useConditions(): {
  conditions: Conditions;
  setConditions: (update: Partial<Conditions>) => void;
} {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const conditions = useMemo(() => parseConditions(searchParams), [searchParams]);

  const setConditions = useCallback(
    (update: Partial<Conditions>) => {
      const query = writeConditions({ ...conditions, ...update }, searchParams).toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [conditions, pathname, router, searchParams],
  );

  return { conditions, setConditions };
}
