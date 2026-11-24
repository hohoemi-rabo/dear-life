"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { DISTRICT_NAMES } from "@/lib/conditions/labels";
import { galleryImageSrc, galleryImageSrcSet, GALLERY_SIZE, GALLERY_WIDTHS, type GallerySpot } from "@/lib/illust/photo-spots";

export type CompareMode = "photo" | "pixel" | "compare";

// 境目をキーボードで動かす幅（％）。矢印は小さく、Page Up・Page Down は大きく
const ARROW_STEP = 5;
const PAGE_STEP = 10;

// 見比べる窓の絵（052 見本）。ドット絵と写真を同じ枠に重ね、「見比べる」では左にドット絵・右に写真を出して、境目を左右に動かせる。
// 枠は PC では 16:9 のまま、スマホ（sm 未満）は画面幅いっぱいの縦に近い枠にし、2枚とも真ん中を同じ範囲で切り出す（object-cover。
// 2枚は npm run illust で同じ大きさにそろえてあるので、切り出す範囲もそろう。2026-11-24 まさゆきさん）。
// 境目はマウス（押したところへ動く・引っぱる）・指（左右に引っぱる。縦に動かすと窓がスクロールする）・キーボード（矢印など）で動かす。
// 境目を変えたい場所を選び直したら真ん中に戻すため、親で key={spot.id} を付ける
export function CompareFrame({ spot, mode }: { spot: GallerySpot; mode: CompareMode }) {
  const frame = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [position, setPosition] = useState(50);
  const compare = mode === "compare";
  const name = `${DISTRICT_NAMES[spot.district]}の${spot.place}`;

  const moveTo = (clientX: number) => {
    const rect = frame.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    setPosition(clamp(((clientX - rect.left) / rect.width) * 100));
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!compare || (event.pointerType === "mouse" && event.button !== 0)) return;
    dragging.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    // マウスは押したところへすぐ動かす。指は縦のスクロールのつもりのこともあるので、横に動かしたときだけ動かす
    if (event.pointerType === "mouse") moveTo(event.clientX);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) moveTo(event.clientX);
  };
  const stopDragging = () => {
    dragging.current = false;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, (value: number) => number> = {
      ArrowLeft: (value) => value - ARROW_STEP,
      ArrowDown: (value) => value - ARROW_STEP,
      ArrowRight: (value) => value + ARROW_STEP,
      ArrowUp: (value) => value + ARROW_STEP,
      PageDown: (value) => value - PAGE_STEP,
      PageUp: (value) => value + PAGE_STEP,
      Home: () => 0,
      End: () => 100,
    };
    const change = step[event.key];
    if (!change) return;
    event.preventDefault();
    setPosition((value) => clamp(change(value)));
  };

  const rounded = Math.round(position);
  const label =
    mode === "compare" ? `${name}：左がドット絵、右が実際の写真` : mode === "photo" ? `${name}の実際の写真` : `${name}のドット絵`;

  return (
    <div
      ref={frame}
      // 中に境目（slider）があるので、img ではなく group にして名前を付ける
      role="group"
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      // 指で横に引っぱるのは境目、縦は窓のスクロールにする
      style={compare ? { touchAction: "pan-y" } : undefined}
      className={`relative isolate aspect-[19/20] w-full select-none overflow-hidden rounded-card bg-pixel-sky sm:aspect-video ${compare ? "cursor-ew-resize" : ""}`}
    >
      <GalleryImage spot={spot} kind="photo" hidden={mode === "pixel"} />
      <GalleryImage
        spot={spot}
        kind="pixel"
        hidden={mode === "photo"}
        clip={compare ? `inset(0 ${100 - position}% 0 0)` : undefined}
      />
      {mode !== "photo" && <FrameTag className="left-2 sm:left-3">ドット絵</FrameTag>}
      {mode !== "pixel" && <FrameTag className={compare ? "right-2 sm:right-3" : "left-2 sm:left-3"}>実際の写真</FrameTag>}
      {compare && (
        <div className="pointer-events-none absolute inset-y-0 z-10 -translate-x-1/2" style={{ left: `${position}%` }}>
          {/* 境目の線。飾り */}
          <span aria-hidden="true" className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_4px_rgb(0_0_0/0.35)]" />
          <div
            role="slider"
            tabIndex={0}
            aria-label="ドット絵と写真の境目"
            aria-orientation="horizontal"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={rounded}
            aria-valuetext={`ドット絵 ${rounded}%、写真 ${100 - rounded}%`}
            onKeyDown={onKeyDown}
            className="pointer-events-auto absolute left-1/2 top-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full bg-white text-primary shadow-card focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {/* ‹ › の印。飾り */}
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 7 4 12l5 5M15 7l5 5-5 5" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}

// 2枚とも同じ枠いっぱいに置く。使わない1枚も消さずに隠しておき、「実際の写真／ドット絵／見比べる」を切りかえたときに待たせない
function GalleryImage({ spot, kind, hidden, clip }: { spot: GallerySpot; kind: "pixel" | "photo"; hidden: boolean; clip?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 静的書き出しでは next/image で srcset を出せない（IllustPicture と同じ）
    <img
      src={galleryImageSrc(spot.id, kind, GALLERY_WIDTHS.at(-1)!)}
      srcSet={galleryImageSrcSet(spot.id, kind)}
      // PC は窓の幅（最大 約720px）、スマホは縦に近い枠の高さに合わせて広げるので、画面幅の約1.9倍
      sizes="(min-width: 640px) 720px, 190vw"
      width={GALLERY_SIZE.width}
      height={GALLERY_SIZE.height}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
      style={clip ? { clipPath: clip } : undefined}
      className={`pointer-events-none absolute inset-0 size-full object-cover ${hidden ? "invisible" : ""}`}
    />
  );
}

// 絵の上の白い札（見本：左上「ドット絵」・右上「実際の写真」）
function FrameTag({ className, children }: { className: string; children: string }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute top-2 z-20 rounded-full bg-surface/95 px-3 py-1 text-xs font-bold text-ink shadow-card sm:top-3 sm:text-sm ${className}`}
    >
      {children}
    </span>
  );
}
