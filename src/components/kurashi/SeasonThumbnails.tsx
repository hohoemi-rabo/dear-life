"use client";

import { useScreenData } from "@/components/data/ScreenDataBoundary";
import { IllustPicture } from "@/components/illust/IllustPicture";
import { PixelScene } from "@/components/pixel/PixelScene";
import type { Conditions } from "@/lib/conditions/model";
import { SEASONS, type Season } from "@/lib/conditions/scene";
import { kurashiPicturesFor } from "@/lib/illust/assets";
import { seasonView } from "@/lib/kurashi/view";
import type { DistrictId } from "@/lib/town-district/resolve";
import { SEASON_STYLES } from "./season-styles";

// PC：場面の下の4季節の絵（028 見本）。押すとその季節に切り替わる。風景の絵がある季節はその絵、ない季節は今のドット絵。
// ScreenDataBoundary の中で使う
export function SeasonThumbnails({
  season,
  conditions,
  onSelect,
}: {
  season: Season;
  conditions: Conditions & { district: DistrictId };
  onSelect: (season: Season) => void;
}) {
  const data = useScreenData();
  return (
    <ul aria-label="季節の場面" className="grid grid-cols-4 gap-2">
      {SEASONS.map((item) => {
        const selected = item === season;
        const pictures = kurashiPicturesFor(conditions.district, item);
        return (
          <li key={item}>
            <button
              type="button"
              aria-pressed={selected}
              aria-label={`${item}の場面`}
              onClick={() => onSelect(item)}
              className={[
                "block w-full overflow-hidden rounded-button border-2 transition duration-150 active:scale-95",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                selected ? SEASON_STYLES[item].selected : "border-transparent hover:border-ink-muted",
              ].join(" ")}
            >
              {/* 絵の説明は大きい場面のほうで読むので、ここではボタンの名前だけを読ませる */}
              {pictures ? (
                <IllustPicture picture={pictures.wide} sizes="120px" decorative className="block aspect-[4/5] w-full object-cover" />
              ) : (
                <div aria-hidden="true" className="flex aspect-[4/5] items-center justify-center overflow-hidden bg-pixel-sky">
                  <PixelScene layers={seasonView(item, conditions, data).layers} widthClassName="w-[320px] max-w-none shrink-0" />
                </div>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
