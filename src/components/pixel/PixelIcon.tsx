import type { PixelAssetId } from "@/lib/pixel/assets";
import { PixelImage } from "./PixelImage";

type IconId = Extract<PixelAssetId, `icon-${string}`>;

// 見出し・ボタン・タブに添える 16×16 のドット絵のアイコン（027）。そばの文字で意味がわかるので読み上げない。
// 大きさは整数倍だけ：md＝2倍（32px、見出し・タブ）、sm＝1倍（16px、文中の小さな印）
const SCALE = { sm: 1, md: 2 } as const;

export function PixelIcon({ icon, size = "md", className = "" }: { icon: IconId; size?: keyof typeof SCALE; className?: string }) {
  return <PixelImage asset={icon} scale={SCALE[size]} decorative className={`shrink-0 ${className}`} />;
}
