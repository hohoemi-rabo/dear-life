import type { KarteCard } from "@/lib/conditions/labels";
import { KARTE_ICON_WIDTHS, karteIconSrc, karteIconSrcSet } from "@/lib/illust/assets";

// md は 32px（カードの見出し）。sm は 24px（タブなど）。絵が細かいので、これより小さくすると潰れて見分けにくい
const SIZES = {
  sm: { px: "24px", className: "size-6" },
  md: { px: "32px", className: "size-8" },
} as const;

// 項目ごとの印（タブ・カードの見出し）。そばの文字で意味がわかるので読み上げない
export function KarteCardIcon({ card, size = "md" }: { card: KarteCard; size?: keyof typeof SIZES }) {
  const { px, className } = SIZES[size];
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 静的書き出しなので WebP をそのまま出す
    <img
      src={karteIconSrc(card, KARTE_ICON_WIDTHS[0])}
      srcSet={karteIconSrcSet(card)}
      sizes={px}
      alt=""
      draggable={false}
      className={`${className} shrink-0 select-none object-contain`}
    />
  );
}
