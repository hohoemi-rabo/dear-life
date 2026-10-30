"use client";

import { PixelImage } from "@/components/pixel/PixelImage";
import type { Season } from "@/lib/conditions/scene";
import type { DistrictEvent } from "@/lib/data/screen-data";
import type { KurashiPictureId } from "@/lib/illust/assets";
import type { PinSpot } from "@/lib/kurashi/pins";
import { EVENT_ART_ASSET } from "@/lib/pixel/assets";
import { PinThumbnail } from "./PinSheetContent";
import { SEASON_STYLES } from "./season-styles";

// 場面の下の「春の楽しみ」（028 見本）：その季節の最初の行事を1つ。押すと「地域の行事」のシートが開く（行事・時期・資料・確認日はそこで見る）。
// まだ集めていない季節は「準備中」と出し、作り話で埋めない（F-13）
export function EventCard({
  season,
  events,
  thumbnail,
  onOpen,
  heading = false,
}: {
  season: Season;
  events: readonly DistrictEvent[];
  // 風景の絵がある場面は、風景の行事の場所を切り出す。ない場面は行事のドット絵
  thumbnail: { picture: KurashiPictureId; spot: PinSpot } | null;
  onOpen: () => void;
  // PC は上に「春の楽しみを見つけよう」の見出しを出す（見本）
  heading?: boolean;
}) {
  const [event] = events;
  return (
    <section aria-label={`${season}の楽しみ`} className="flex flex-col gap-2">
      {heading && <h2 className="hidden font-bold lg:block">{season}の楽しみを見つけよう</h2>}
      {event ? (
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={onOpen}
          className="flex w-full items-center gap-3 rounded-card border border-line bg-surface p-2 pr-3 text-left shadow-card transition duration-150 hover:border-ink-muted active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {thumbnail ? (
            <PinThumbnail picture={thumbnail.picture} spot={thumbnail.spot} className="w-24 shrink-0 lg:w-36" />
          ) : (
            <span className="flex aspect-[3/2] w-24 shrink-0 items-center justify-center overflow-hidden rounded-button bg-pixel-sky lg:w-36">
              <PixelImage asset={EVENT_ART_ASSET[event.art]} scale={2} decorative />
            </span>
          )}
          <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
            <span className={`rounded-full border px-2 py-0.5 text-xs font-bold lg:hidden ${SEASON_STYLES[season].selected}`}>{season}の楽しみ</span>
            <span className="font-bold">{event.name}</span>
            <span className="text-sm text-ink-muted">{event.timingNote}</span>
          </span>
          <span aria-hidden="true" className="text-2xl text-ink-muted">
            ›
          </span>
        </button>
      ) : (
        <p className="rounded-card border border-dashed border-line bg-surface px-3 py-4 text-center text-ink-muted">この季節の行事は準備中です。</p>
      )}
    </section>
  );
}
