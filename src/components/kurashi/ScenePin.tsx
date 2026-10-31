"use client";

import { forwardRef, type CSSProperties } from "react";
import type { PinSpot } from "@/lib/kurashi/pins";

// 風景の上のピン（028 見本）：白い札に、場所の印と名前。押すとその場所のデータが開く。
// 位置はスマホ（縦長の絵）と PC（横長の絵）で別に持ち、CSS の変数で切りかえる（ボタンは1つだけにして、読み上げで2回出さない）。
// ピンの先（札の下の三角）が場所を指す。押せると分かるよう、ゆっくり上下にゆれる（「動きを減らす」では動かさない）
export const ScenePin = forwardRef<HTMLButtonElement, { label: string; tall: PinSpot; wide: PinSpot; active: boolean; onOpen: () => void }>(
  function ScenePin({ label, tall, wide, active, onOpen }, ref) {
    // 札をどちらに伸ばすかは、スマホと PC で同じにする（PIN_SPOTS の決めごと）。左に伸ばすときは印を右に置き、先を印の下にそろえる
    const left = tall.side === "left";
    const style = {
      "--pin-x": `${tall.x}%`,
      "--pin-y": `${tall.y}%`,
      "--pin-shift": shift(tall),
      "--pin-x-lg": `${wide.x}%`,
      "--pin-y-lg": `${wide.y}%`,
      "--pin-shift-lg": shift(wide),
    } as CSSProperties;
    return (
      <span
        style={style}
        className="absolute left-[var(--pin-x)] top-[var(--pin-y)] z-20 [transform:translate(var(--pin-shift),-100%)] lg:left-[var(--pin-x-lg)] lg:top-[var(--pin-y-lg)] lg:[transform:translate(var(--pin-shift-lg),-100%)]"
      >
        <span className="block motion-safe:animate-pin-drop">
          <span className={`block ${active ? "" : "motion-safe:animate-pin-bob"}`}>
            <button
              ref={ref}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={active}
              onClick={onOpen}
              className={[
                left ? "flex-row-reverse pl-3.5 pr-1.5" : "pl-1.5 pr-3.5",
                "relative flex min-h-tap items-center gap-1.5 whitespace-nowrap rounded-full border-2 bg-surface/95 py-1 text-sm font-bold text-ink shadow-card transition duration-150",
                "hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                active ? "scale-105 border-primary" : "border-white",
              ].join(" ")}
            >
              <PinMark active={active} />
              {label}
              {/* 札の下の三角（場所を指す）。飾り */}
              <span
                aria-hidden="true"
                className={`absolute -bottom-[7px] ${left ? "right-[1.05rem]" : "left-[1.05rem]"} size-3 rotate-45 border-b-2 border-r-2 bg-surface ${active ? "border-primary" : "border-white"}`}
              />
            </button>
          </span>
        </span>
      </span>
    );
  },
);

// ピンの先を場所に合わせる横のずらし。先はいつも印の下（札の端から約1.4rem）
function shift(spot: PinSpot): string {
  return spot.side === "right" ? "-1.4rem" : "calc(-100% + 1.4rem)";
}

// 場所の印（見本：ピンクのピン。選んでいるときは深緑）
function PinMark({ active }: { active: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-7 shrink-0">
      <path
        d="M12 2.5c-4 0-7 3-7 6.9 0 5 7 12.1 7 12.1s7-7.1 7-12.1c0-3.9-3-6.9-7-6.9Z"
        className={active ? "fill-primary" : "fill-spring"}
      />
      <circle cx="12" cy="9.4" r="2.8" className="fill-white" />
    </svg>
  );
}
