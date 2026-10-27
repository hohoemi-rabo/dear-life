"use client";

import { SEASONS, type Season } from "@/lib/conditions/scene";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { SEASON_ICONS, SEASON_STYLES } from "./season-styles";

// 春・夏・秋・冬の切り替え（F-11）。好きな順に見られる。最初は春（URL に季節がないとき）。
// 下の場面のカードにくっつくタブの形にする（027 デザインイメージ）
export function SeasonTabs({ season, onSelect }: { season: Season; onSelect: (season: Season) => void }) {
  return (
    <div role="group" aria-label="季節" className="grid grid-cols-4 gap-1 sm:gap-2">
      {SEASONS.map((item) => {
        const selected = item === season;
        return (
          <button
            key={item}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(item)}
            className={[
              "-mb-px flex min-h-tap items-center justify-center gap-1 rounded-t-button border-2 border-b-0 py-1 text-lg font-bold transition-colors sm:gap-2",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              selected ? SEASON_STYLES[item].selected : "border-transparent bg-kinari-deep text-ink-muted hover:border-line",
            ].join(" ")}
          >
            <PixelIcon icon={SEASON_ICONS[item]} />
            {item}
          </button>
        );
      })}
    </div>
  );
}
