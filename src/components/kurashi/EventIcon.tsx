import { PixelImage } from "@/components/pixel/PixelImage";
import type { DistrictEvent } from "@/lib/data/screen-data";
import { eventIllustFor, PROP_WIDTHS, propSrc, propSrcSet } from "@/lib/illust/assets";
import { EVENT_ART_ASSET } from "@/lib/pixel/assets";

// 行事の絵（飾り）。行事ごとの絵があればそれを（2026-10-31 まさゆきさんの絵）、なければ行事の種類ごとのドット絵を出す
export function EventIcon({ event, className = "" }: { event: DistrictEvent; className?: string }) {
  const illust = eventIllustFor(event.name);
  if (!illust) return <PixelImage asset={EVENT_ART_ASSET[event.art]} scale={2} decorative className={className} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 書き出した WebP を srcset で選ばせる（えらぶの選択肢の絵と同じ理由）
    <img
      src={propSrc(illust, PROP_WIDTHS[0])}
      srcSet={propSrcSet(illust)}
      sizes="64px"
      alt=""
      draggable={false}
      decoding="async"
      className={`size-16 select-none object-contain ${className}`}
    />
  );
}
