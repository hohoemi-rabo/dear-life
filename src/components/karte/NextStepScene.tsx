import { FamilyRow } from "@/components/illust/FamilyRow";
import type { Conditions } from "@/lib/conditions/model";
import { NEXT_STEP_BACKGROUNDS, propSrc, propSrcSet } from "@/lib/illust/assets";
import { PROP_SIZES } from "@/lib/illust/sprites";
import type { DistrictId } from "@/lib/town-district/resolve";

// カルテの下の帯の絵：地区ごとの背景の道の上を、選んだ家族が歩く（2026-11-05 まさゆきさん）。飾りなので読み上げない。
// 背景はふちを切り落としてあり地区ごとに高さが違うので、足元は背景の高さに対する割合で置く
export function NextStepScene({ conditions }: { conditions: Conditions & { district: DistrictId } }) {
  const { prop, footFromBottom } = NEXT_STEP_BACKGROUNDS[conditions.district];
  const { width, height } = PROP_SIZES[prop];
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
      </div>
    </div>
  );
}
