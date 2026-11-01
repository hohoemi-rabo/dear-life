import { ExtraChildrenBadge } from "@/components/illust/ExtraChildrenBadge";
import type { Conditions } from "@/lib/conditions/model";
import { spriteId, spriteSrc, type Pose } from "@/lib/illust/assets";
import { familyMembers, hiddenChildren } from "@/lib/illust/family";
import { SPRITE_SIZES } from "@/lib/illust/sprites";

// 選んだ家族を横に並べた絵（くらしの「わが家」・カルテ。028）。背の比はえらぶと同じにし、お父さん（立つ）の高さを fatherHeight（px）にそろえる。
// 5人目からの子どもは「＋N人」の札で出す。飾りなので読み上げない（人数はそばの文字で伝える）
export function FamilyRow({
  conditions,
  fatherHeight,
  pose = "stand",
  lazy = false,
  className = "",
}: {
  conditions: Pick<Conditions, "adults" | "children" | "parent">;
  fatherHeight: number;
  pose?: Pose;
  // スマホで隠している絵などは、見えるまで読まない（2026-11-01 測り直し）
  lazy?: boolean;
  className?: string;
}) {
  const reference = SPRITE_SIZES["father-stand"].height;
  const extra = hiddenChildren(conditions);
  return (
    <div aria-hidden="true" className={`relative flex items-end justify-center ${extra > 0 ? "pt-7" : ""} ${className}`}>
      {familyMembers(conditions).map((person, index) => {
        const id = spriteId(person, pose);
        return (
          // eslint-disable-next-line @next/next/no-img-element -- 切り出した小さな WebP をそのまま出す（FamilyLayer と同じ）
          <img
            key={person}
            src={spriteSrc(id)}
            alt=""
            loading={lazy ? "lazy" : undefined}
            draggable={false}
            style={{ height: `${(SPRITE_SIZES[id].height / reference) * fatherHeight}px` }}
            className={`w-auto select-none ${index > 0 ? "-ml-2" : ""}`}
          />
        );
      })}
      <ExtraChildrenBadge count={extra} className="absolute right-0 top-0" />
    </div>
  );
}
