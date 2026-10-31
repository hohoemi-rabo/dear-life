"use client";

import { forwardRef, type CSSProperties, type ReactNode } from "react";
import type { PinSpot } from "@/lib/kurashi/pins";

// 風景の上のピン（028）：丸の中に場所の絵、下の小さな三角が場所を指す。押すとその場所のデータが開く。
// 2026-10-31 まさゆきさん：風景を主役にするため、札の文字をやめて絵のピンにした（見本の札つきのピンからの変更）。
// 名前は、スマホでは丸の横に小さく出し（マウスをあてられないため）、PC ではマウスをあてたときとキーボードで選んだときだけ出す。
// 読み上げの名前はいつも aria-label で付ける。
// 位置はスマホ（縦長の絵）と PC（横長の絵）で別に持ち、CSS の変数で切りかえる（ボタンは1つだけにして、読み上げで2回出さない）。
// 押せると分かるよう、ゆっくり上下にゆれる（「動きを減らす」では動かさない）
export const ScenePin = forwardRef<
  HTMLButtonElement,
  { label: string; icon: ReactNode; tall: PinSpot; wide: PinSpot; active: boolean; onOpen: () => void }
>(function ScenePin({ label, icon, tall, wide, active, onOpen }, ref) {
  // 名前をどちらに出すかは、スマホと PC で同じにする（PIN_SPOTS の決めごと）。絵の右の端では左に出して、はみ出さないようにする
  const left = tall.side === "left";
  const style = {
    "--pin-x": `${tall.x}%`,
    "--pin-y": `${tall.y}%`,
    "--pin-x-lg": `${wide.x}%`,
    "--pin-y-lg": `${wide.y}%`,
  } as CSSProperties;
  return (
    <span
      style={style}
      className="absolute left-[var(--pin-x)] top-[var(--pin-y)] z-20 -translate-x-1/2 -translate-y-full hover:z-30 focus-within:z-30 lg:left-[var(--pin-x-lg)] lg:top-[var(--pin-y-lg)]"
    >
      <span className="block motion-safe:animate-pin-drop">
        <span className={`block ${active ? "" : "motion-safe:animate-pin-bob"}`}>
          <button
            ref={ref}
            type="button"
            aria-label={label}
            aria-haspopup="dialog"
            aria-expanded={active}
            onClick={onOpen}
            className="group relative flex flex-col items-center rounded-full transition duration-150 hover:scale-110 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span
              aria-hidden="true"
              className={`flex size-12 items-center justify-center overflow-hidden rounded-full border-[3px] bg-surface/95 shadow-card lg:size-14 ${
                active ? "scale-110 border-primary" : "border-spring"
              }`}
            >
              {icon}
            </span>
            {/* 丸の下の三角（場所を指す）。飾り */}
            <svg aria-hidden="true" viewBox="0 0 12 8" className={`-mt-px h-2 w-3 ${active ? "fill-primary" : "fill-spring"}`}>
              <path d="M0 0h12L6 8Z" />
            </svg>
            <span
              aria-hidden="true"
              className={[
                "absolute top-6 -translate-y-1/2 whitespace-nowrap rounded-full bg-surface/95 px-2 py-0.5 text-xs font-bold text-ink shadow-card lg:top-7 lg:text-sm",
                left ? "right-full mr-1" : "left-full ml-1",
                // PC はマウスをあてたとき・キーボードで選んだときだけ
                "lg:hidden lg:group-hover:block lg:group-focus-visible:block",
              ].join(" ")}
            >
              {label}
            </span>
          </button>
        </span>
      </span>
    </span>
  );
});
