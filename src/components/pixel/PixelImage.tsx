import Image from "next/image";
import { PIXEL_ASSETS, pixelAssetSrc, type PixelAssetId } from "@/lib/pixel/assets";

// ドット絵の部品を1枚だけ、整数倍に拡大してぼかさずに出す（要件 8.1）。場面にするときは PixelScene を使う。
// 選択肢の絵のように、そばの文字で中身がわかるときは decorative にして読み上げない
export function PixelImage({
  asset,
  scale,
  decorative = false,
  className = "",
}: {
  asset: PixelAssetId;
  scale: 1 | 2 | 3 | 4;
  decorative?: boolean;
  className?: string;
}) {
  const { width, height, alt } = PIXEL_ASSETS[asset];
  return (
    <Image
      src={pixelAssetSrc(asset)}
      alt={decorative ? "" : alt}
      aria-hidden={decorative || undefined}
      width={width * scale}
      height={height * scale}
      unoptimized
      className={`pixelated max-w-none select-none ${className}`}
    />
  );
}
