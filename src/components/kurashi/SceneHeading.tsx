"use client";

import { familyLabel } from "@/lib/conditions/labels";
import type { Conditions } from "@/lib/conditions/model";
import type { Season } from "@/lib/conditions/scene";
import { DISTRICT_NAMES } from "@/lib/conditions/labels";
import type { DistrictId } from "@/lib/town-district/resolve";
import { SeasonTabs } from "./SeasonTabs";

// 場面の上の見出し・条件の札・季節の切り替え（028 見本）。風景の絵がある場面では空の色の上に重ねる。
// スマホは「上郷で、わが家の春。」、PC は「上郷で、わが家の春がはじまる。」（見本どおり）
export function SceneHeading({
  conditions,
  season,
  onSeasonChange,
  onChangeConditions,
  hasPins,
}: {
  conditions: Conditions & { district: DistrictId };
  season: Season;
  onSeasonChange: (season: Season) => void;
  onChangeConditions: () => void;
  // ピンのある場面か（ない場面は今のドット絵と文。上郷・春以外）
  hasPins: boolean;
}) {
  const name = DISTRICT_NAMES[conditions.district];
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <h1 className="text-2xl font-extrabold text-ink sm:text-3xl lg:text-4xl">
        {name}で、わが家の{season}
        <span className="hidden lg:inline">がはじまる</span>。
      </h1>
      <p className="text-sm text-ink lg:text-base">
        {hasPins ? (
          <>
            <span className="lg:hidden">気になる場所をタップしてみよう。</span>
            <span className="hidden lg:inline">気になる場所をタップして、暮らしを発見しよう。</span>
          </>
        ) : (
          "季節を選んで、飯田での暮らしをのぞいてみよう。"
        )}
      </p>
      {/* 条件の札（スマホ。PC は左の「わが家」に出す） */}
      <p className="flex min-h-tap items-center gap-2 rounded-full bg-surface/90 py-0.5 pl-3 pr-0.5 text-sm shadow-card lg:hidden">
        <FamilyIcon />
        <span>
          {name}・{familyLabel(conditions.adults, conditions.children)}
        </span>
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={onChangeConditions}
          aria-label="条件を変更"
          className="inline-flex min-h-tap items-center px-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <span className="rounded-md border border-line bg-kinari px-2 py-0.5 text-xs font-bold text-primary">変更</span>
        </button>
      </p>
      <div className="mt-1 w-full">
        <SeasonTabs season={season} onSelect={onSeasonChange} />
      </div>
    </div>
  );
}

// 人の印（見本：大人と子ども）。飾り
export function FamilyIcon({ className = "size-5 text-primary" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={`shrink-0 ${className}`} fill="currentColor">
      <circle cx="8" cy="6" r="3" />
      <path d="M2.5 19.5c0-3.6 2.5-6.5 5.5-6.5s5.5 2.9 5.5 6.5z" />
      <circle cx="16.5" cy="9" r="2.3" />
      <path d="M12.5 19.5c.3-2.9 2-5 4-5s3.7 2.1 4 5z" />
    </svg>
  );
}
