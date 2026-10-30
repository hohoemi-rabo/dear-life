"use client";

import { SEASONS, type Season } from "@/lib/conditions/scene";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { SEASON_ICONS, SEASON_STYLES } from "./season-styles";

// 春・夏・秋・冬の切り替え（F-11）。好きな順に見られる。最初は春（URL に季節がないとき）。
// 見本（028）：白い丸い帯に4つ並べ、選んでいる季節を季節の色で塗る。PC は季節の印を付ける
export function SeasonTabs({ season, onSelect }: { season: Season; onSelect: (season: Season) => void }) {
  return (
    <div role="group" aria-label="季節" className="mx-auto grid w-full max-w-md grid-cols-4 gap-1 rounded-full bg-surface/85 p-1 shadow-card">
      {SEASONS.map((item) => {
        const selected = item === season;
        return (
          <button
            key={item}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(item)}
            className={[
              "flex min-h-tap items-center justify-center gap-1 rounded-full font-bold transition duration-150 active:scale-95",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              selected ? `${SEASON_STYLES[item].label} text-white shadow-card` : "text-ink hover:bg-kinari-deep",
            ].join(" ")}
          >
            <PixelIcon icon={SEASON_ICONS[item]} size="sm" className="hidden lg:inline-block" />
            {item}
          </button>
        );
      })}
    </div>
  );
}
