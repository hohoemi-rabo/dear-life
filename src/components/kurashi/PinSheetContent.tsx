"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { DataSourceNote } from "@/components/data/DataSourceNote";
import { DataStateMessage } from "@/components/data/DataStateMessage";
import { MarketSheetBody } from "@/components/data/MarketSheetBody";
import { Notice } from "@/components/ui/Notice";
import type { Conditions } from "@/lib/conditions/model";
import type { Season } from "@/lib/conditions/scene";
import { EVENTS_CREDIT } from "@/lib/credits";
import { ILLUST_PICTURES, illustPictureSrc, type KurashiPictureId } from "@/lib/illust/assets";
import { karteHref } from "@/lib/kurashi/links";
import type { PinSheet, SheetSource } from "@/lib/kurashi/pin-sheets";
import { thumbnailPosition, type PinSpot } from "@/lib/kurashi/pins";
import { buttonClassName } from "@/components/ui/Button";
import { EventItem } from "./EventItem";
import { SceneLineView } from "./ScenePanel";

// シートの小さな絵は、横長の風景をこの倍率に拡大して、ピンの場所のまわりを切り出す
const THUMBNAIL_ZOOM = 3.2;

// ピンのシート（スマホ）・吹き出し（PC）の中身（028 見本）：小さな絵とひと言、場面の文やデータ、出典の枠、「確かめる」ボタン。
// 見出しはシート・吹き出しの側で出す
export function PinSheetContent({
  sheet,
  season,
  conditions,
  thumbnail,
  compact = false,
}: {
  sheet: PinSheet;
  season: Season;
  conditions: Conditions;
  // 小さな絵にする風景（横長）とピンの場所。風景の絵がない場面では null
  thumbnail: { picture: KurashiPictureId; spot: PinSpot } | null;
  // PC の吹き出しは狭いので、絵を上に置く
  compact?: boolean;
}) {
  const sourceNumbers = new Map(sheet.sources.map(({ source }, index) => [source.id, index + 1]));
  return (
    <div className="flex flex-col gap-3">
      <div className={compact ? "flex flex-col gap-2" : "flex items-center gap-3"}>
        {thumbnail && <PinThumbnail {...thumbnail} wide={compact} className={compact ? "w-full" : "w-32 shrink-0"} />}
        <p className="text-sm">{sheet.intro}</p>
      </div>

      {sheet.missing && <DataStateMessage state={sheet.missing} />}

      {sheet.lines.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {sheet.lines.map((line) => (
            <li key={line.position}>
              <SceneLineView line={line} sourceNumbers={sourceNumbers} withTimetableNote={false} />
            </li>
          ))}
        </ul>
      )}

      {sheet.market && <MarketSheetBody state={sheet.market.state} alwaysFew={sheet.market.alwaysFew} />}

      {sheet.events &&
        (sheet.events.length === 0 ? (
          <p className="text-ink-muted">この季節の行事は準備中です。</p>
        ) : (
          <>
            <ul className="flex flex-col divide-y divide-line">
              {sheet.events.map((event) => (
                <li key={event.name} className="py-3 first:pt-0">
                  <EventItem event={event} />
                </li>
              ))}
            </ul>
            <Notice>{EVENTS_CREDIT}</Notice>
          </>
        ))}

      {sheet.notices.map((notice) => (
        <Notice key={notice}>{notice}</Notice>
      ))}

      {sheet.sources.length > 0 && <SheetSources sources={sheet.sources} />}

      {sheet.karteCard && sheet.action && (
        <Link href={karteHref(conditions, season, sheet.karteCard)} className={buttonClassName("primary", "w-full rounded-full")}>
          {sheet.action}
          <span aria-hidden="true">→</span>
        </Link>
      )}
    </div>
  );
}

// PC の吹き出しの小さな絵の枠の縦横の比（見本のように平たい帯にする）。ふつうは風景と同じ比
const WIDE_THUMBNAIL_ASPECT = 2.6;

// 風景から切り出した小さな絵（飾り。場所の名前はシートの見出しで読む）
export function PinThumbnail({
  picture,
  spot,
  wide = false,
  className = "",
}: {
  picture: KurashiPictureId;
  spot: Pick<PinSpot, "x" | "y">;
  wide?: boolean;
  className?: string;
}) {
  const { width, height } = ILLUST_PICTURES[picture];
  const frameAspect = wide ? WIDE_THUMBNAIL_ASPECT : width / height;
  const zoom = wide ? THUMBNAIL_ZOOM * 0.8 : THUMBNAIL_ZOOM;
  const position = thumbnailPosition(spot, zoom, frameAspect, width / height);
  const style: CSSProperties = {
    aspectRatio: frameAspect,
    backgroundImage: `url(${illustPictureSrc(picture, 960)})`,
    backgroundSize: `${zoom * 100}% auto`,
    backgroundPosition: `${position.x}% ${position.y}%`,
  };
  return <span aria-hidden="true" style={style} className={`block rounded-button bg-pixel-sky bg-no-repeat ${className}`} />;
}

// 出典の枠（見本）：出典の名前を1行で出し、対象時点・確認日は開いて見る（要件：すべての情報に出典・対象時点・確認日）。
// 右の印は出典のページを新しいタブで開く
function SheetSources({ sources }: { sources: readonly SheetSource[] }) {
  const names = sources.map(({ source }) => `${source.publisher}「${source.name}」`).join("・");
  const link = sources.find(({ source }) => source.url)?.source;
  return (
    <div className="flex items-start gap-1 rounded-button bg-kinari px-3 py-1 text-xs text-ink-muted">
      <details className="group min-w-0 flex-1">
        <summary className="flex min-h-tap cursor-pointer list-none flex-col justify-center gap-0.5 [&::-webkit-details-marker]:hidden">
          <span>出典：{names}</span>
          <span className="font-bold text-primary underline-offset-2 group-open:hidden">対象時点・確認日は詳細へ</span>
        </summary>
        <div className="flex flex-col gap-2 pb-2">
          {sources.map(({ source, period }) => (
            <DataSourceNote key={source.id} source={source} period={period} />
          ))}
        </div>
      </details>
      {link?.url && (
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${link.publisher}「${link.name}」のページを開く（新しいタブ）`}
          className="-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-kinari-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
          </svg>
        </a>
      )}
    </div>
  );
}
