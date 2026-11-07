import { TOP_ICON_WIDTHS, topIconSrc, topIconSrcSet, type TopIconId } from "@/lib/illust/assets";

// トップの飾りとアイコン（033）。そばの文字で意味がわかるので読み上げない。
// 大きさは className で決め、絵は縦横の比を保ったまま枠に収める
export function TopIcon({ icon, sizes, className = "" }: { icon: TopIconId; sizes: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 静的書き出しでは next/image で srcset を出せない（IllustPicture と同じ）
    <img
      src={topIconSrc(icon, TOP_ICON_WIDTHS.at(-1)!)}
      srcSet={topIconSrcSet(icon)}
      sizes={sizes}
      alt=""
      aria-hidden
      loading="lazy"
      decoding="async"
      draggable={false}
      className={`shrink-0 select-none object-contain ${className}`}
    />
  );
}

// 見出しの下の黄色い線（033 見本）。文字の下半分にかかる太い線
export function Marker({ children }: { children: React.ReactNode }) {
  return <span className="bg-[linear-gradient(transparent_62%,theme(colors.marker)_62%)] px-0.5">{children}</span>;
}
