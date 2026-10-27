"use client";

import { useScreenData } from "@/components/data/ScreenDataBoundary";
import { PixelScene } from "@/components/pixel/PixelScene";
import type { Conditions } from "@/lib/conditions/model";
import { SEASONS, type Season } from "@/lib/conditions/scene";
import { SCENE_AXIS_LABELS } from "@/lib/kurashi/season";
import { seasonView } from "@/lib/kurashi/view";
import type { DistrictId } from "@/lib/town-district/resolve";
import { SEASON_STYLES } from "./season-styles";

// PC：場面の下の4季節のサムネイル（デザインイメージ PC版）。押すとその季節に切り替わる。ScreenDataBoundary の中で使う
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
    <ul aria-label="季節の場面" className="grid grid-cols-4 gap-4">
      {SEASONS.map((item) => {
        const selected = item === season;
        const { plan, layers } = seasonView(item, conditions, data);
        return (
          <li key={item}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(item)}
              className={[
                "flex w-full flex-col items-center gap-1 rounded-button border-2 p-1.5 pb-2",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                selected ? SEASON_STYLES[item].selected : "border-line bg-surface hover:border-ink-muted",
              ].join(" ")}
            >
              {/* 絵の説明は大きい場面のほうで読むので、ここではボタンの文字だけを読ませる */}
              <div aria-hidden="true">
                <PixelScene layers={layers} widthClassName="w-[160px]" />
              </div>
              <span className="text-sm font-bold">
                {item}
                <span className="ml-2 font-normal">{SCENE_AXIS_LABELS[plan.axis].short}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
