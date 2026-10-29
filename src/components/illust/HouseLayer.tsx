import type { Housing } from "@/lib/conditions/labels";
import { HOUSE_WIDTHS, houseSrc, type ErabuBaseId } from "@/lib/illust/assets";
import { placeHouse } from "@/lib/illust/house";
import { Sparkles, type SparklePoint } from "./Sparkles";

// 家のまわりのキラキラ（家の絵の幅・高さに対する％）
const SPARKLES: readonly SparklePoint[] = [
  { x: 4, y: 30, delay: 0 },
  { x: 96, y: 20, delay: 80 },
  { x: 88, y: 70, delay: 160 },
  { x: 12, y: 78, delay: 240 },
];

// プレビューの背景の上、家族の後ろに家を建てる（028 見本の 03）。家を選び直すと、新しい家がぽんと建ち替わる
// （呼ぶ側で key に家の種類を渡さなくても、ここで key を付けて出し直す）。絵は飾りで、家の種類はプレビューの枠の名前で読み上げる
export function HouseLayer({ housing, background }: { housing: Housing; background: ErabuBaseId }) {
  const { centerX, footY, width, height } = placeHouse(housing, background);
  return (
    <div aria-hidden="true" className="absolute inset-0 z-[5]">
      <span
        key={housing}
        className="absolute -translate-x-1/2"
        style={{ left: `${centerX}%`, bottom: `${100 - footY}%`, width: `${width}%`, height: `${height}%` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- 書き出した WebP を srcset で選ばせる（IllustPicture と同じ理由） */}
        <img
          src={houseSrc(housing, HOUSE_WIDTHS.at(-1)!)}
          srcSet={HOUSE_WIDTHS.map((w) => `${houseSrc(housing, w)} ${w}w`).join(", ")}
          sizes="(min-width: 640px) 350px, 60vw"
          alt=""
          draggable={false}
          decoding="async"
          className="size-full origin-bottom select-none motion-safe:animate-pop-in"
        />
        <Sparkles points={SPARKLES} />
      </span>
    </div>
  );
}
