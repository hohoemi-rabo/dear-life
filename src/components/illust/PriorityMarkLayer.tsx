"use client";

import type { Housing, Priority } from "@/lib/conditions/labels";
import { PRIORITY_ICON_WIDTHS, priorityIconSrc, priorityIconSrcSet, type ErabuBaseId } from "@/lib/illust/assets";
import { placePriorityMarks, type PriorityMark } from "@/lib/illust/priorities";
import { Sparkles, type SparklePoint } from "./Sparkles";
import { useLeavingItems } from "./useLeavingItems";

// 印のまわりのキラキラ（印の幅・高さに対する％）
const SPARKLES: readonly SparklePoint[] = [
  { x: 0, y: 14, delay: 0 },
  { x: 100, y: 22, delay: 80 },
  { x: 90, y: 96, delay: 160 },
];

// えらぶ 05 のプレビューに、選んだ大切にしたいことの印を付ける（028 見本の光る丸）。選ぶとぽんと出てキラキラ、外すとすっと消える。
// 動きは motion-safe: に付け、「動きを減らす」では動かさない。絵は飾りで、選んだものはプレビューの枠の名前で読み上げる
export function PriorityMarkLayer({
  priorities,
  housing,
  background,
}: {
  priorities: readonly Priority[];
  housing: Housing;
  background: ErabuBaseId;
}) {
  const marks = placePriorityMarks(priorities, housing, background);
  const leaving = useLeavingItems(marks, priorityOf);
  return (
    <div aria-hidden="true" className="absolute inset-0 z-[15]">
      {marks.map((mark) => (
        <Mark key={mark.priority} mark={mark} />
      ))}
      {leaving.map((mark) => (
        <Mark key={`leaving-${mark.priority}`} mark={mark} leaving />
      ))}
    </div>
  );
}

function priorityOf({ priority }: PriorityMark): string {
  return priority;
}

function Mark({ mark, leaving = false }: { mark: PriorityMark; leaving?: boolean }) {
  return (
    <span
      className="absolute aspect-square w-[13%] -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${mark.x}%`, top: `${mark.y}%` }}
    >
      <span
        className={`flex size-full items-center justify-center rounded-full border-[3px] border-map-label-selected bg-white/55 p-[16%] shadow-[0_0_10px_3px_rgba(166,227,188,0.85)] ${
          leaving ? "motion-safe:animate-pop-out" : "motion-safe:animate-pop-in"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- 書き出した WebP を srcset で選ばせる（IllustPicture と同じ理由） */}
        <img
          src={priorityIconSrc(mark.priority, PRIORITY_ICON_WIDTHS[0])}
          srcSet={priorityIconSrcSet(mark.priority)}
          sizes="(min-width: 1280px) 160px, (min-width: 1024px) 13vw, (min-width: 640px) 75px, 13vw"
          alt=""
          draggable={false}
          decoding="async"
          className="max-h-full w-full select-none object-contain"
        />
      </span>
      {!leaving && <Sparkles points={SPARKLES} />}
    </span>
  );
}
