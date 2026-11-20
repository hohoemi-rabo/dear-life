"use client";

import { forwardRef, type CSSProperties, type ReactNode } from "react";
import type { PinSpot } from "@/lib/kurashi/pins";

// 風景の上のピン（028）：場所の絵が入ったピン。押すとその場所のデータが開く。
// 2026-10-31 まさゆきさん：風景を主役にするため、札の文字をやめて絵のピンにした（見本の札つきのピンからの変更）。
// 2026-11-20 まさゆきさん（045）：風景に溶け込んで分かりにくかったので、目立って押したくなる見た目にした。
// - スマホ（lg 未満）は「地図のピン」：赤いしずく形で、中は白に場所の絵。名前は赤地に白い字の札で、後ろに「›」
// - PC（lg 以上）は「大きく光る」：白い太いふちの大きな丸に桜色の線、まわりに白い光の輪が広がって消える。名前は白地の札
// 名前は PC でもいつも出す（2026-10-31 の「PC はマウスをあてたときだけ」はやめた）。読み上げの名前はいつも aria-label で付ける。
// 位置はスマホ（縦長の絵）と PC（横長の絵）で別に持ち、CSS の変数で切りかえる（ボタンは1つだけにして、見た目だけを lg: で切りかえる。読み上げで2回出さない）。
// 押せると分かるよう、ゆっくり上下にゆれる。光の輪もゆれも「動きを減らす」では動かさない
export const ScenePin = forwardRef<
  HTMLButtonElement,
  { label: string; icon: ReactNode; tall: PinSpot; wide: PinSpot; active: boolean; onOpen: () => void }
>(function ScenePin({ label, icon, tall, wide, active, onOpen }, ref) {
  // 名前をどちらに出すかは、スマホと PC で別に決める（PIN_SPOTS の決めごと）。絵の右の端では左に出して、はみ出さないようにする
  const labelSide = [
    tall.side === "left" ? "right-full mr-1" : "left-full ml-1",
    wide.side === "left" ? "lg:left-auto lg:right-full lg:ml-0 lg:mr-1.5" : "lg:right-auto lg:left-full lg:mr-0 lg:ml-1.5",
  ].join(" ");
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
            className="relative flex flex-col items-center rounded-full transition duration-150 hover:scale-110 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {/* ピンの形の入れもの。スマホのしずく形は、丸（直径 48px）の中心から 48px÷√2 下に先があるので、高さは 24 + 34 = 58px。
                入れものの下の端がピンの先になり、外側の -translate-y-full で先が場所を指す */}
            <span aria-hidden="true" className="relative block h-[58px] w-12 lg:size-[62px]">
              {/* PC の白い光の輪（開いているときは止める） */}
              <span
                className={`absolute inset-0 hidden rounded-full lg:block ${active ? "" : "motion-safe:animate-pin-halo"}`}
              />
              {/* しずく形は、角を1つだけ丸めない正方形を -45度 回して、とがった角を真下に向けて作る。PC では回さない丸 */}
              <span
                className={[
                  "absolute left-0 top-0 flex size-12 -rotate-45 items-center justify-center overflow-hidden rounded-[50%_50%_50%_0] border-[5px] bg-white shadow-pin-drop",
                  "lg:size-[62px] lg:rotate-0 lg:rounded-full lg:border-4 lg:shadow-card lg:outline lg:outline-[3px]",
                  active ? "scale-110 border-primary lg:outline-primary" : "border-pin lg:border-white lg:outline-spring",
                ].join(" ")}
              >
                {/* 中の絵は逆に回して、まっすぐに見せる */}
                <span className="flex rotate-45 items-center justify-center lg:rotate-0">{icon}</span>
              </span>
            </span>
            {/* PC の丸の下の三角（場所を指す）。飾り */}
            <svg
              aria-hidden="true"
              viewBox="0 0 16 11"
              className={`-mt-px hidden h-[11px] w-4 drop-shadow lg:block ${active ? "fill-primary" : "fill-white"}`}
            >
              <path d="M0 0h16L8 11Z" />
            </svg>
            <span
              aria-hidden="true"
              className={[
                "absolute top-6 -translate-y-1/2 whitespace-nowrap rounded-full border-2 border-white bg-pin px-2 py-0.5 text-xs font-bold text-white shadow-pin",
                "lg:top-[31px] lg:px-2.5 lg:text-[13px] lg:border-[2.5px] lg:border-spring lg:bg-surface lg:text-ink",
                labelSide,
              ].join(" ")}
            >
              {label}
              {/* 押すと開くことが分かるように（スマホだけ） */}
              <span className="lg:hidden"> ›</span>
            </span>
          </button>
        </span>
      </span>
    </span>
  );
});
