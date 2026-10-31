import { PixelIcon } from "@/components/pixel/PixelIcon";
import type { Priority } from "@/lib/conditions/labels";
import { eventIllustFor, PRIORITY_ICON_WIDTHS, priorityIconSrc, priorityIconSrcSet, PROP_WIDTHS, propSrc, propSrcSet } from "@/lib/illust/assets";
import type { ScenePinSpec } from "@/lib/kurashi/pins";

// ピンの丸の中の絵（2026-10-31 まさゆきさん）。えらぶ 05 の大切なことの絵（家・校舎・非常口の印）と行事ごとの絵を使い回す。
// 合う絵のないもの（公共施設、行事ごとの絵のない行事）はドット絵のアイコン。名前はピンの aria-label で読むので飾りにする
const PRIORITY_OF: Partial<Record<ScenePinSpec["kind"], Priority>> = {
  school: "childcare",
  housing: "housing",
  evacuation: "disaster",
};

export function PinIcon({ pin }: { pin: Pick<ScenePinSpec, "kind" | "events"> }) {
  const priority = PRIORITY_OF[pin.kind];
  if (priority) return <PinImage src={priorityIconSrc(priority, PRIORITY_ICON_WIDTHS[0])} srcSet={priorityIconSrcSet(priority)} />;
  // 行事は、1つだけの行事のピンで行事ごとの絵があるときだけその絵（まとめたピンはカレンダー）
  const illust = pin.kind === "event" && pin.events?.length === 1 ? eventIllustFor(pin.events[0].name) : null;
  if (illust) return <PinImage src={propSrc(illust, PROP_WIDTHS[0])} srcSet={propSrcSet(illust)} />;
  return <PixelIcon icon={pin.kind === "public" ? "icon-public" : "icon-calendar"} />;
}

function PinImage({ src, srcSet }: { src: string; srcSet: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 書き出した WebP を srcset で選ばせる（えらぶの選択肢の絵と同じ理由）
    <img src={src} srcSet={srcSet} sizes="48px" alt="" draggable={false} decoding="async" className="size-9 select-none object-contain lg:size-11" />
  );
}
