"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { DISTRICT_NAMES } from "@/lib/conditions/labels";
import { PHOTO_SPOT_TIMING, type PhotoSpot } from "@/lib/illust/photo-spots";

// 押した場所のドット絵がふわっと出て、それが本物の写真に変わっていく動画を流す窓（050）。
// 流れ：押した目印から絵がふわっと広がる → 動画（音なし）を流す → 終わったらひと呼吸おいて自動で閉じる。
// 途中でも、窓のどこを押しても閉じる（2026-11-23 まさゆきさん）。Esc でも閉じる。
// ネイティブの <dialog> の showModal で開くので、後ろの画面は押せず、閉じるとフォーカスは押した目印に戻る。
// 「動きを減らす」では、ふわっと広がる動きと閉じる動きをせず、動画はそのまま流す（見る人が押して見たいもの）
export function PhotoSpotPlayer({
  spot,
  origin,
  onClose,
}: {
  spot: PhotoSpot;
  // 押した目印の画面上の位置。絵はここから広がる
  origin: { x: number; y: number };
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [closing, setClosing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [transformOrigin, setTransformOrigin] = useState<string | undefined>(undefined);
  const timers = useRef<number[]>([]);
  const closingRef = useRef(false);

  const later = (callback: () => void, ms: number) => {
    timers.current.push(window.setTimeout(callback, ms));
  };

  const requestClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    video.current?.pause();
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      onClose();
      return;
    }
    setClosing(true);
    later(onClose, PHOTO_SPOT_TIMING.closeMs);
  };

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    // 絵が押した目印から広がるよう、窓の中での目印の位置を広がりの中心にする
    const rect = panel.current?.getBoundingClientRect();
    if (rect) setTransformOrigin(`${origin.x - rect.left}px ${origin.y - rect.top}px`);
    // ふわっと出たあとで動画を始める。読み込みが間に合わないときは、ブラウザが読めた分から流す
    later(() => {
      const element = video.current;
      if (!element || closingRef.current) return;
      const playing = element.play();
      // 流せなかったとき（読み込めない・ブラウザが止めた）は、絵のまま断りを出す。閉じるのは見る人に任せる
      if (playing) playing.catch(() => setFailed(true));
    }, PHOTO_SPOT_TIMING.introMs);
    const pending = timers.current;
    return () => pending.forEach((id) => window.clearTimeout(id));
    // 開いたときに1回だけ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 開いているあいだは後ろの画面をスクロールさせない
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, []);

  const district = DISTRICT_NAMES[spot.district];
  return (
    <dialog
      ref={dialog}
      aria-label={`${district}の景色：絵が本物の写真に変わる動画`}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClose={() => {
        if (!closingRef.current) onClose();
      }}
      // 窓のどこを押しても閉じる（後ろの暗いところも、動画の上も）
      onClick={requestClose}
      className={[
        "m-auto w-[min(92vw,960px)] max-w-none cursor-pointer overflow-visible bg-transparent p-0 text-white backdrop:bg-black/70",
        closing ? "motion-safe:backdrop:animate-fade-out" : "motion-safe:backdrop:animate-fade-in",
      ].join(" ")}
    >
      <div
        ref={panel}
        style={{ transformOrigin } as CSSProperties}
        className={`flex flex-col gap-2 ${closing ? "motion-safe:animate-photo-spot-out" : "motion-safe:animate-photo-spot-in"}`}
      >
        <video
          ref={video}
          src={spot.video}
          poster={spot.poster}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          aria-hidden="true"
          onEnded={() => later(requestClose, PHOTO_SPOT_TIMING.holdMs)}
          onError={() => setFailed(true)}
          // 暗い背景の上で絵の端が分かるよう、細い白い枠を付ける（太い枠にはしない。2026-11-23 まさゆきさん）
          className="aspect-video w-full rounded-card border-2 border-white bg-pixel-sky object-cover shadow-card"
        />
        <p className="text-center text-xs leading-relaxed text-white/90 sm:text-sm">
          {failed ? (
            <>動画を読み込めませんでした。電波の届くところで、もう一度お試しください。</>
          ) : (
            <>絵と本物の写真を、Google の AI（Omni）でつないだ映像です。</>
          )}
        </p>
        <p className="text-center text-xs text-white/70">押すと閉じます</p>
      </div>
    </dialog>
  );
}
