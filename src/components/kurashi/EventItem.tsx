import { PixelImage } from "@/components/pixel/PixelImage";
import type { DistrictEvent } from "@/lib/data/screen-data";
import { formatJaDate } from "@/lib/format";
import { EVENT_ART_ASSET } from "@/lib/pixel/assets";

// 地区の行事1つ（F-13）：名前・時期・範囲・参加と、元の資料・確認日。行事は手で集めた情報なので、確認日と元の資料を添える（要件 7.1・7.2）。
// くらしの「地域の行事」のシートで使う（028）
export function EventItem({ event }: { event: DistrictEvent }) {
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
