"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { galleryDepth, readGallery, writeGallery, type GalleryTab } from "@/lib/gallery/gallery";
import type { GallerySpot } from "@/lib/illust/photo-spots";

// 飯田の風景を見る（052）の窓の状態を URL で持つ。useSearchParams を使うので <Suspense> の中で使う。
// - 開く・一覧から場所を開くは履歴に足す（スマホの「戻る」で 見比べる → 写真一覧 → えらぶ と戻れる）
// - タブ・前後の場所は置きかえる（「戻る」で1枚ずつ戻らないように）
// - × で閉じるときは、この画面で足した分だけ履歴を戻す（閉じたあとの「戻る」で窓がまた開かないように）。
//   URL を開いた直後など、足した履歴がないときは置きかえて閉じる
export function useGalleryRoute() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const state = readGallery(searchParams);
  const depth = galleryDepth(state);
  // この画面で履歴に足した数。ブラウザの「戻る」で浅くなったら、その分を減らす
  const pushed = useRef(0);
  useEffect(() => {
    pushed.current = Math.min(pushed.current, depth);
  }, [depth]);

  const href = (next: { tab: GalleryTab; spotId?: string | null } | null) => {
    const query = writeGallery(new URLSearchParams(searchParams.toString()), next).toString();
    return query ? `${pathname}?${query}` : pathname;
  };
  const push = (next: { tab: GalleryTab; spotId?: string | null }) => {
    pushed.current += 1;
    router.push(href(next), { scroll: false });
  };
  const replace = (next: { tab: GalleryTab; spotId?: string | null } | null) => router.replace(href(next), { scroll: false });
  const tab = state?.tab ?? "all";

  return {
    state,
    // 写真一覧を開く。spot を渡すと、その場所の見比べる窓をすぐ開く（「〈場所〉をじっくり見る →」）
    open: (spot?: GallerySpot) => push({ tab: "all", spotId: spot?.id }),
    setTab: (next: GalleryTab) => replace({ tab: next }),
    openSpot: (spot: GallerySpot) => push({ tab, spotId: spot.id }),
    move: (spot: GallerySpot) => replace({ tab, spotId: spot.id }),
    backToList: () => {
      if (pushed.current >= 2) {
        window.history.back();
        return;
      }
      replace({ tab });
    },
    close: () => {
      const steps = pushed.current;
      pushed.current = 0;
      if (steps > 0) window.history.go(-steps);
      else replace(null);
    },
  };
}
