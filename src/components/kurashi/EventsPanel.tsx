"use client";

import { useScreenData } from "@/components/data/ScreenDataBoundary";
import { PixelImage } from "@/components/pixel/PixelImage";
import { Card } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import type { Conditions } from "@/lib/conditions/model";
import { planScene, type Season } from "@/lib/conditions/scene";
import { EVENTS_CREDIT } from "@/lib/credits";
import type { DistrictEvent } from "@/lib/data/screen-data";
import { formatJaDate } from "@/lib/format";
import { EVENT_ART_ASSET } from "@/lib/pixel/assets";
import { selectSceneEvents } from "@/lib/scenes/render";
import type { DistrictId } from "@/lib/town-district/resolve";

// この季節の地区の行事（F-13）。場面の文と同じ選び方で1〜2個。まだ集めていない季節は「準備中」と出し、作り話で埋めない。
// 行事は手で集めた情報なので、確認日と元の資料を添える（要件 7.1・7.2）。ScreenDataBoundary の中で使う
export function EventsPanel({ season, conditions }: { season: Season; conditions: Conditions & { district: DistrictId } }) {
  const district = useScreenData().districts[conditions.district];
  const events = selectSceneEvents(district, planScene(season, conditions));
  return (
    <Card as="section" aria-labelledby="events-title" className="flex flex-col gap-3">
      <h2 id="events-title" className="text-lg font-bold">
        この季節の地区の行事
      </h2>
      {events.length === 0 ? (
        <p className="rounded-button border border-dashed border-line px-3 py-4 text-center text-ink-muted">
          この季節の行事は準備中です。
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-4">
            {events.map((event) => (
              <li key={event.name}>
                <EventItem event={event} />
              </li>
            ))}
          </ul>
          <Notice>{EVENTS_CREDIT}</Notice>
        </>
      )}
    </Card>
  );
}

function EventItem({ event }: { event: DistrictEvent }) {
  return (
    <article className="flex gap-3">
      <PixelImage asset={EVENT_ART_ASSET[event.art]} scale={2} decorative className="shrink-0 self-start" />
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="font-bold">
          {event.name}
          {event.chushinArea && <span className="ml-1 text-sm font-normal">（{event.chushinArea}）</span>}
        </h3>
        <dl className="grid grid-cols-[auto_1fr] gap-x-2 text-sm">
          <dt className="text-ink-muted">時期</dt>
          <dd>{event.timingNote}</dd>
          <dt className="text-ink-muted">範囲</dt>
          <dd>{event.scope === "区ごと" ? "区によって違います" : "地区全体"}</dd>
          {event.participation !== "未確認" && (
            <>
              <dt className="text-ink-muted">参加</dt>
              <dd>
                {event.participation}
                {event.participationNote && `（${event.participationNote}）`}
              </dd>
            </>
          )}
        </dl>
        <p className="text-xs text-ink-muted">
          資料：{event.sourceNote}・確認日 <time dateTime={event.checkedOn}>{formatJaDate(event.checkedOn)}</time>
        </p>
      </div>
    </article>
  );
}
