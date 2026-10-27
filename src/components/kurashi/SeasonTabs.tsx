"use client";

import { SEASONS, type Season } from "@/lib/conditions/scene";
import { SEASON_STYLES } from "./season-styles";

// 春・夏・秋・冬の切り替え（F-11）。好きな順に見られる。最初は春（URL に季節がないとき）
export function SeasonTabs({ season, onSelect }: { season: Season; onSelect: (season: Season) => void }) {
  return (
    <div role="group" aria-label="季節" className="grid grid-cols-4 gap-2">
      {SEASONS.map((item) => {
        const selected = item === season;
        return (
          <button
            key={item}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(item)}
            className={[
              "min-h-tap rounded-button border-2 text-lg font-bold transition-colors",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              selected ? SEASON_STYLES[item].selected : "border-line bg-surface text-ink-muted hover:border-ink-muted",
            ].join(" ")}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}
