"use client";

import { useEffect, useRef, useState } from "react";
import { DISTRICT_NAMES } from "@/lib/conditions/labels";
import { isPlayable, PHOTO_SPOT_TIMING, PHOTO_SPOTS, type PlayablePhotoSpot } from "@/lib/illust/photo-spots";
import { PhotoSpotPlayer } from "./PhotoSpotPlayer";

// えらぶ 01 の飯田市全体の絵に、押すと「絵が本物の写真に変わる動画」が流れる場所の目印を出す（050）。
// 目印は赤い丸に白い再生の三角で、まわりがやわらかく光り（くらしの PC のピンと同じ光）、ゆっくり上下にゆれる。
// 動画のない場所も同じ目印にし、押すと目印のそばに「準備中です」の吹き出しを約2秒出して自然に消す（2026-11-23 まさゆきさん）。
// スマホでは絵が小さいので目印も小さくする（2026-11-23 まさゆきさん）。押せる広さはどの幅でも 44px 以上。
// 光もゆれも「動きを減らす」では動かさない
export function PhotoSpotLayer() {
  const [playing, setPlaying] = useState<{ spot: PlayablePhotoSpot; origin: { x: number; y: number } } | null>(null);
  // 準備中の吹き出しを出している場所。同じ場所を続けて押したら出し直す（count を key にする）
  const [preparing, setPreparing] = useState<{ id: string; count: number } | null>(null);
  const preparingTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(preparingTimer.current), []);

  const showPreparing = (id: string) => {
    window.clearTimeout(preparingTimer.current);
    setPreparing((previous) => ({ id, count: (previous?.count ?? 0) + 1 }));
    preparingTimer.current = window.setTimeout(() => setPreparing(null), PHOTO_SPOT_TIMING.preparingMs);
  };

  return (
    <>
      <ul className="absolute inset-0 z-10">
        {PHOTO_SPOTS.map((spot) => {
          const name = `${DISTRICT_NAMES[spot.district]}の${spot.place}`;
          const playable = isPlayable(spot);
          const bubble = preparing?.id === spot.id;
          return (
            <li
              key={spot.id}
              className={`absolute -translate-x-1/2 -translate-y-1/2 ${bubble ? "z-10" : ""}`}
              style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
            >
              {bubble && (
                <span
                  key={preparing.count}
                  role="status"
                  className="pointer-events-none absolute bottom-[calc(100%-4px)] left-1/2 -translate-x-1/2 motion-safe:animate-preparing-bubble"
                >
                  <span className="block whitespace-nowrap rounded-lg bg-surface px-2.5 py-1 text-xs font-bold text-ink shadow-card lg:px-3 lg:py-1.5 lg:text-sm">
                    準備中です
                  </span>
                  {/* 吹き出しのしっぽ。飾り */}
                  <svg aria-hidden="true" viewBox="0 0 12 6" className="mx-auto -mt-px block h-1.5 w-3 fill-surface">
                    <path d="M0 0h12L6 6Z" />
                  </svg>
                </span>
              )}
              <span className={`block ${playing ? "" : "motion-safe:animate-pin-bob"}`}>
                <button
                  type="button"
                  aria-label={playable ? `${name}：絵が本物の写真に変わる動画を見る` : `${name}：絵が本物の写真に変わる動画（準備中）`}
                  aria-haspopup={playable ? "dialog" : undefined}
                  onClick={(event) => {
                    if (!playable) {
                      showPreparing(spot.id);
                      return;
                    }
                    const rect = event.currentTarget.getBoundingClientRect();
                    setPlaying({ spot, origin: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } });
                  }}
                  className="group flex min-h-tap min-w-tap items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-6 items-center justify-center rounded-full border-2 border-white bg-pin shadow-pin-glow transition duration-150 group-hover:scale-110 group-active:scale-95 motion-safe:animate-pin-glow sm:size-9 sm:border-[3px] lg:size-14 lg:border-4"
                  >
                    {/* 再生の三角。見た目の重心を合わせるため少し右に寄せる */}
                    <svg viewBox="0 0 24 24" className="ml-px size-3 fill-white sm:ml-0.5 sm:size-4 lg:size-7">
                      <path d="M7 4.5v15l12.5-7.5z" />
                    </svg>
                  </span>
                </button>
              </span>
            </li>
          );
        })}
      </ul>
      {playing && <PhotoSpotPlayer key={playing.spot.id} spot={playing.spot} origin={playing.origin} onClose={() => setPlaying(null)} />}
    </>
  );
}
