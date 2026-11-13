import { settingsIconSrc, settingsIconSrcSet } from "@/lib/illust/assets";

// 地区の札のピン。カルテの「わが家の設定」の地区と同じ生成AIの赤いピン（settings-icons.png）を使い、絵柄をそろえる
// （2026-11-13 まさゆきさん：ドット絵の小さいピンから差しかえ）。そばに地区名があるので読み上げない
export function DistrictPinIcon({ className = "size-5" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 静的書き出しなので WebP をそのまま出す
    <img
      src={settingsIconSrc("district", 64)}
      srcSet={settingsIconSrcSet("district")}
      sizes="20px"
      alt=""
      draggable={false}
      className={`shrink-0 select-none object-contain ${className}`}
    />
  );
}
