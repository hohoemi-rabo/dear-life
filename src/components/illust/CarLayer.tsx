import type { CarCount } from "@/lib/conditions/labels";
import { PROP_WIDTHS, propSrc, propSrcSet, type ErabuBaseId } from "@/lib/illust/assets";
import { placeCars, type CarPlacement } from "@/lib/illust/car";
import { Sparkles, type SparklePoint } from "./Sparkles";

// 車のまわりのキラキラ（車の絵の幅・高さに対する％）
const SPARKLES: readonly SparklePoint[] = [
  { x: 2, y: 20, delay: 0 },
  { x: 94, y: 8, delay: 80 },
  { x: 100, y: 60, delay: 160 },
];

// プレビューの家族の右に車を置く（028 見本の 04）。台数を選び直すと、車がぽんと出直す。
// 見本の車の後ろの白い点線は付けない（2026-10-29 まさゆきさん）。絵は飾りで、台数はプレビューの枠の名前で読み上げる
export function CarLayer({ car, background }: { car: CarCount | null; background: ErabuBaseId }) {
  const placements = placeCars(car, background);
  if (placements.length === 0) return null;
  return (
    <div aria-hidden="true" className="absolute inset-0 z-[8]">
      {placements.map((placement, index) => (
        <CarSprite key={`${car}-${placement.prop}`} placement={placement} delay={index * 60} />
      ))}
    </div>
  );
}

function CarSprite({ placement, delay }: { placement: CarPlacement; delay: number }) {
  const { prop, centerX, footY, width, height } = placement;
  return (
    <span
      className="absolute -translate-x-1/2"
      style={{ left: `${centerX}%`, bottom: `${100 - footY}%`, width: `${width}%`, height: `${height}%` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- 書き出した WebP を srcset で選ばせる（IllustPicture と同じ理由） */}
      <img
        src={propSrc(prop, PROP_WIDTHS.at(-1)!)}
        srcSet={propSrcSet(prop)}
        sizes="(min-width: 640px) 150px, 25vw"
        alt=""
        draggable={false}
        decoding="async"
        className="size-full origin-bottom select-none motion-safe:animate-pop-in"
        style={{ animationDelay: `${delay}ms` }}
      />
      <Sparkles points={SPARKLES} />
    </span>
  );
}
