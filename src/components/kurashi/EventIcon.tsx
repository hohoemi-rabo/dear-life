import { PixelImage } from "@/components/pixel/PixelImage";
import type { DistrictEvent } from "@/lib/data/screen-data";
import { eventIllustFor, PROP_WIDTHS, propSrc, propSrcSet } from "@/lib/illust/assets";
import { EVENT_ART_ASSET } from "@/lib/pixel/assets";

// 行事の絵（飾り）。行事ごとの絵があればそれを（2026-10-31 まさゆきさんの絵）、なければ行事の種類ごとのドット絵を出す
// sizeClassName は行事ごとの絵の大きさ（枠いっぱいに出すときに変える）
export function EventIcon({
  event,
  className = "",
  sizeClassName = "size-16",
  sizes = "64px",
}: {
  event: DistrictEvent;
  className?: string;
  sizeClassName?: string;
  sizes?: string;
}) {
  const illust = eventIllustFor(event.name);
  if (!illust) return <PixelImage asset={EVENT_ART_ASSET[event.art]} scale={2} decorative className={className} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 書き出した WebP を srcset で選ばせる（えらぶの選択肢の絵と同じ理由）
    <img
      src={propSrc(illust, PROP_WIDTHS[0])}
      srcSet={propSrcSet(illust)}
      sizes={sizes}
      alt=""
      draggable={false}
      decoding="async"
      className={`${sizeClassName} select-none object-contain ${className}`}
    />
  );
}
