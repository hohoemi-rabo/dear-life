import { FamilyRow } from "@/components/illust/FamilyRow";
import { MascotFigure, paletteSideFor } from "@/components/mascot/Mascot";
import type { Conditions } from "@/lib/conditions/model";
import type { Season } from "@/lib/conditions/scene";
import { NEXT_STEP_BACKGROUNDS, propSrc, propSrcSet } from "@/lib/illust/assets";
import { PROP_SIZES } from "@/lib/illust/sprites";
import { mascotMotion } from "@/lib/mascot/spots";
import type { DistrictId } from "@/lib/town-district/resolve";

// マスコット（042）を帯の絵のどこに置くか（背景の幅・高さに対する割合。x は足元の真ん中、footFromBottom は足元、height は高さ）。
// 上郷は右の石段のいちばん下の段（くらしと同じく石段を掃く。2026-11-15）。動きのない地区には出さない
const MASCOT_SPOTS: Partial<Record<DistrictId, { x: number; footFromBottom: number; height: number }>> = {
  kamisato: { x: 87, footFromBottom: 0.22, height: 0.62 },
  // 鼎は帯に公園がないので、左の街灯と木の右の歩道（家族と同じ道の上。Claude の案）
  kanae: { x: 27, footFromBottom: 0.09, height: 0.7 },
};

// カルテの下の帯の絵：地区ごとの背景の道の上を、選んだ家族が歩く（2026-11-05 まさゆきさん）。飾りなので読み上げない。
// 背景はふちを切り落としてあり地区ごとに高さが違うので、足元は背景の高さに対する割合で置く。
// 帯の右にはマスコット（042）が、くらしで見ていた季節（URL の s）の服装で出る
export function NextStepScene({ conditions, season }: { conditions: Conditions & { district: DistrictId }; season: Season }) {
  const { prop, footFromBottom } = NEXT_STEP_BACKGROUNDS[conditions.district];
  const { width, height } = PROP_SIZES[prop];
  const motion = mascotMotion(conditions.district, season);
  const mascotSpot = MASCOT_SPOTS[conditions.district];
  return (
    <div className="relative h-24 w-full shrink-0 md:w-72">
      <div className="absolute inset-x-0 bottom-0" style={{ aspectRatio: `${width} / ${height}` }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- 静的書き出しなので WebP をそのまま出す */}
        <img
          src={propSrc(prop, 480)}
          srcSet={propSrcSet(prop)}
          sizes="(min-width: 768px) 288px, 100vw"
          alt=""
          loading="lazy"
          draggable={false}
          className="h-full w-full select-none"
        />
        <div className="absolute left-1/2 w-max -translate-x-1/2" style={{ bottom: `${footFromBottom * 100}%` }}>
          <FamilyRow conditions={conditions} fatherHeight={64} pose="walk" lazy />
        </div>
        {motion !== null && mascotSpot !== undefined && (
          <MascotFigure
            motion={motion}
            paletteSide={paletteSideFor(mascotSpot.x)}
            style={{ left: `${mascotSpot.x}%`, bottom: `${mascotSpot.footFromBottom * 100}%`, height: `${mascotSpot.height * 100}%` }}
            className="absolute -translate-x-1/2"
          />
        )}
      </div>
    </div>
  );
}
