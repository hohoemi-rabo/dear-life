"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { CloseIconButton } from "@/components/ui/BottomSheet";
import { DISTRICT_NAMES } from "@/lib/conditions/labels";
import { GALLERY_TABS, gallerySections, neighbourSpots, type GalleryState, type GalleryTab } from "@/lib/gallery/gallery";
import { galleryImageSrc, galleryImageSrcSet, GALLERY_PHOTO_CREDIT, GALLERY_SIZE, GALLERY_WIDTHS, type GallerySpot } from "@/lib/illust/photo-spots";
import { CompareFrame, type CompareMode } from "./CompareFrame";

// 閉じる動き（tailwind の animate-gallery-out）の長さ。終わってから閉じる
const CLOSE_MS = 220;

const MODES: readonly { id: CompareMode; label: string }[] = [
  { id: "photo", label: "実際の写真" },
  { id: "pixel", label: "ドット絵" },
  { id: "compare", label: "見比べる" },
];

// 飯田の風景を見る（052 見本）。えらぶ 01 から開く窓で、写真一覧と、ドット絵と写真を見比べる画面を出す。
// 窓の状態（タブ・場所）は URL に持ち、ここは見せるだけ。移り方（履歴に足すか置きかえるか）は呼ぶ側（ErabuFlow）が決める。
// ネイティブの <dialog> の showModal で開くので、後ろの画面は押せず、閉じるとフォーカスは開いたボタンに戻る。Esc でも閉じる。
// 窓は少し下からふわっと浮かび上がって出て、閉じるときは少し沈みながら消える。一覧 ⇔ 見比べる・場所の移動では中身だけをふわっと出し直す
// （2026-11-24 まさゆきさん）。「動きを減らす」では動かさない
export function SceneryGallery({
  state,
  onTab,
  onOpenSpot,
  onBackToList,
  onMove,
  onClose,
}: {
  state: GalleryState;
  onTab: (tab: GalleryTab) => void;
  onOpenSpot: (spot: GallerySpot) => void;
  onBackToList: () => void;
  // 前の場所・次の場所へ
  onMove: (spot: GallerySpot) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [closing, setClosing] = useState(false);
  // 見比べる窓の見せ方。はじめは「見比べる」（見本）。中身を作り直しても（場所の移動）、窓を開いているあいだは選んだ見せ方のまま
  const [mode, setMode] = useState<CompareMode>("compare");
  const closeTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const requestClose = () => {
    if (closing) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      onClose();
      return;
    }
    setClosing(true);
    closeTimer.current = window.setTimeout(onClose, CLOSE_MS);
  };

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
  }, []);

  // 開いているあいだは後ろの画面をスクロールさせない（窓の中だけ動かす）
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, []);

  // 一覧 ⇔ 見比べる・場所を移ったら、見出しへフォーカスを移して窓の上から見せる（読み上げも新しい見出しから読む）
  const view = state.spot?.id ?? "list";
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    dialog.current?.scrollTo?.({ top: 0 });
  }, [view]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="scenery-gallery-title"
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      // 後ろの暗いところ（::backdrop）を押すと、押した先が dialog そのものになる
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
      className={`m-auto max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-3xl overflow-y-auto overscroll-contain rounded-[1.25rem] border border-line bg-surface p-0 text-ink shadow-card backdrop:bg-black/50 sm:max-h-[calc(100dvh-2rem)] ${
        closing ? "motion-safe:animate-gallery-out motion-safe:backdrop:animate-fade-out" : "motion-safe:animate-gallery-in motion-safe:backdrop:animate-fade-in"
      }`}
    >
      {/* 一覧 ⇔ 見比べる・場所の移動のたびに作り直して、中身をふわっと出し直す */}
      <div key={view} className="flex flex-col gap-4 px-3 pb-5 pt-3 motion-safe:animate-gallery-view-in sm:px-6 sm:pb-6 sm:pt-5">
        {state.spot ? (
          <CompareView spot={state.spot} tab={state.tab} mode={mode} onMode={setMode} heading={heading} onBackToList={onBackToList} onMove={onMove} onClose={requestClose} />
        ) : (
          <ListView tab={state.tab} heading={heading} onTab={onTab} onOpenSpot={onOpenSpot} onClose={requestClose} />
        )}
      </div>
    </dialog>
  );
}

function ListView({
  tab,
  heading,
  onTab,
  onOpenSpot,
  onClose,
}: {
  tab: GalleryTab;
  heading: RefObject<HTMLHeadingElement | null>;
  onTab: (tab: GalleryTab) => void;
  onOpenSpot: (spot: GallerySpot) => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-2 pl-1">
        <h2 id="scenery-gallery-title" ref={heading} tabIndex={-1} className="pt-1.5 text-xl font-extrabold outline-none sm:text-2xl">
          飯田の風景を見る
        </h2>
        <CloseIconButton onClick={onClose} />
      </div>
      <div role="group" aria-label="地区で絞り込む" className="flex flex-wrap gap-x-1 sm:gap-x-1.5">
        {GALLERY_TABS.map(({ id, label }) => {
          const selected = id === tab;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={selected}
              onClick={() => onTab(id)}
              className="group inline-flex min-h-tap items-center focus-visible:outline-none"
            >
              <span
                className={`inline-flex h-9 items-center rounded-full border px-2.5 text-[0.8125rem] font-bold max-[359px]:px-2 max-[359px]:text-xs transition group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-primary sm:px-5 sm:text-sm ${
                  selected ? "border-primary bg-primary text-white" : "border-line bg-surface text-ink group-hover:border-primary/50"
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-5">
        {gallerySections(tab).map(({ district, spots }) => (
          <section key={district} aria-labelledby={`gallery-district-${district}`} className="flex flex-col gap-2">
            <h3 id={`gallery-district-${district}`} className="text-lg font-extrabold text-primary">
              {DISTRICT_NAMES[district]}
            </h3>
            {spots.length === 0 ? (
              <p className="rounded-card border border-dashed border-line px-4 py-6 text-center text-sm text-ink-muted">準備中です</p>
            ) : (
              <ul className="grid grid-cols-2 gap-2 sm:gap-3">
                {spots.map((spot) => (
                  <li key={spot.id}>
                    <SpotCard spot={spot} onOpen={() => onOpenSpot(spot)} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </>
  );
}

// 写真カード（写真と場所の名前）。押すと見比べる画面へ
function SpotCard({ spot, onOpen }: { spot: GallerySpot; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full flex-col overflow-hidden rounded-card border border-line bg-surface text-center shadow-card transition duration-150 hover:border-primary/50 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- 静的書き出しでは next/image で srcset を出せない（IllustPicture と同じ） */}
      <img
        src={galleryImageSrc(spot.id, "photo", GALLERY_WIDTHS[0])}
        srcSet={galleryImageSrcSet(spot.id, "photo")}
        sizes="(min-width: 640px) 360px, 50vw"
        width={GALLERY_SIZE.width}
        height={GALLERY_SIZE.height}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        className="aspect-square w-full select-none bg-pixel-sky object-cover sm:aspect-video"
      />
      <span className="flex min-h-tap w-full items-center justify-center px-2 py-2 text-sm font-bold sm:text-base">{spot.place}</span>
    </button>
  );
}

function CompareView({
  spot,
  tab,
  mode,
  onMode,
  heading,
  onBackToList,
  onMove,
  onClose,
}: {
  spot: GallerySpot;
  tab: GalleryTab;
  mode: CompareMode;
  onMode: (mode: CompareMode) => void;
  heading: RefObject<HTMLHeadingElement | null>;
  onBackToList: () => void;
  onMove: (spot: GallerySpot) => void;
  onClose: () => void;
}) {
  const { previous, next } = neighbourSpots(tab, spot);
  const district = DISTRICT_NAMES[spot.district];
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBackToList}
          className="inline-flex min-h-tap items-center gap-1.5 px-1 font-bold text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <span aria-hidden="true">←</span>
          写真一覧へ
        </button>
        <CloseIconButton onClick={onClose} />
      </div>
      <div className="flex flex-col gap-0.5 px-1">
        <p className="font-extrabold text-primary sm:text-lg">{district}</p>
        <h2 id="scenery-gallery-title" ref={heading} tabIndex={-1} className="text-[1.75rem] font-extrabold leading-tight outline-none sm:text-4xl">
          <span className="sr-only">{district}の</span>
          {spot.place}
        </h2>
      </div>
      <div role="group" aria-label="見せ方" className="grid grid-cols-3 gap-1.5 sm:mx-auto sm:flex sm:gap-2">
        {MODES.map(({ id, label }) => {
          const selected = id === mode;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={selected}
              onClick={() => onMode(id)}
              className={`inline-flex min-h-tap items-center justify-center whitespace-nowrap rounded-full border px-2 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:min-w-[9.5rem] sm:px-6 sm:text-base ${
                selected ? "border-primary bg-primary text-white" : "border-line bg-surface text-ink hover:border-primary/50"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <CompareFrame key={spot.id} spot={spot} mode={mode} />
      <div className="flex flex-col items-center gap-1 text-center">
        {mode === "compare" && (
          <p className="text-sm font-bold text-ink-muted sm:text-base">
            {/* 指で触る端末（スマホ・タブレット）は「指で」と添える（見本） */}
            <span className="hidden [@media(pointer:coarse)]:inline">指で</span>境目を左右に動かす
          </p>
        )}
        <p className="text-xs text-ink-muted">{GALLERY_PHOTO_CREDIT}</p>
      </div>
      <nav aria-label="場所の移動" className="flex items-center justify-between gap-2 pt-1">
        <MoveButton direction="previous" spot={previous} onMove={onMove}>
          <span aria-hidden="true">←</span>
          前の場所
        </MoveButton>
        <MoveButton direction="next" spot={next} onMove={onMove}>
          次の場所
          <span aria-hidden="true">→</span>
        </MoveButton>
      </nav>
    </>
  );
}

function MoveButton({
  direction,
  spot,
  onMove,
  children,
}: {
  direction: "previous" | "next";
  spot: GallerySpot;
  onMove: (spot: GallerySpot) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onMove(spot)}
      aria-label={`${direction === "previous" ? "前の場所" : "次の場所"}（${DISTRICT_NAMES[spot.district]}の${spot.place}）`}
      className="inline-flex min-h-tap min-w-[8.5rem] items-center justify-center gap-2 rounded-full border-2 border-primary bg-surface px-4 font-bold text-primary transition duration-150 hover:bg-primary-soft active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:min-w-[10rem] sm:px-6"
    >
      {children}
    </button>
  );
}
