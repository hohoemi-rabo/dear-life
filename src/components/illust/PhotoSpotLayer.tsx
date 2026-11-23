"use client";

import { useState } from "react";
import { DISTRICT_NAMES } from "@/lib/conditions/labels";
import { PHOTO_SPOTS, type PhotoSpot } from "@/lib/illust/photo-spots";
import { PhotoSpotPlayer } from "./PhotoSpotPlayer";

// えらぶ 01 の飯田市全体の絵に、押すと「絵が本物の写真に変わる動画」が流れる場所の目印を出す（050）。
// 目印は赤い丸に白い再生の三角で、まわりがやわらかく光り（くらしの PC のピンと同じ光）、ゆっくり上下にゆれる。
// スマホでは絵が小さいので目印も小さくする（2026-11-23 まさゆきさん）。押せる広さはどの幅でも 44px 以上。
// 光もゆれも「動きを減らす」では動かさない
export function PhotoSpotLayer() {
  const [playing, setPlaying] = useState<{ spot: PhotoSpot; origin: { x: number; y: number } } | null>(null);
  return (
    <>
      <ul className="absolute inset-0 z-10">
        {PHOTO_SPOTS.map((spot) => (
          <li key={spot.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${spot.x}%`, top: `${spot.y}%` }}>
            <span className={`block ${playing ? "" : "motion-safe:animate-pin-bob"}`}>
              <button
                type="button"
                aria-label={`${DISTRICT_NAMES[spot.district]}の景色：絵が本物の写真に変わる動画を見る`}
                aria-haspopup="dialog"
                onClick={(event) => {
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
        ))}
      </ul>
      {playing && <PhotoSpotPlayer key={playing.spot.id} spot={playing.spot} origin={playing.origin} onClose={() => setPlaying(null)} />}
    </>
  );
}
