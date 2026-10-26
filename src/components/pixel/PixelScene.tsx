import Image from "next/image";
import { PIXEL_ASSETS, pixelAssetSrc } from "@/lib/pixel/assets";
import { SCENE_HEIGHT, SCENE_WIDTH, type SceneLayer } from "@/lib/pixel/scenes";

// 部品を重ねて1枚の場面にする（要件 6.2・8.1）。160×90 ドットを、幅 320・480・640px（2・3・4倍）の整数倍でぼかさずに出す。
// 部品の位置と大きさは場面に対する割合で置くので、どの倍率でもドットの境目がそろう。
// 読み上げは場面全体を1枚の絵として扱い、部品の代替テキストをつないで説明にする
export function PixelScene({ layers, className = "" }: { layers: readonly SceneLayer[]; className?: string }) {
  const label = layers.map((layer) => PIXEL_ASSETS[layer.asset].alt).join("。");
  return (
    <div
      role="img"
      aria-label={label}
      className={`relative aspect-[16/9] w-[320px] overflow-hidden bg-kinari-deep sm:w-[480px] lg:w-[640px] ${className}`}
    >
      {layers.map((layer, index) => {
        const { width, height } = PIXEL_ASSETS[layer.asset];
        return (
          <Image
            key={`${layer.asset}-${index}`}
            src={pixelAssetSrc(layer.asset)}
            alt=""
            aria-hidden
            width={width}
            height={height}
            unoptimized
            className="pixelated absolute max-w-none select-none"
            style={{
              left: `${(layer.x / SCENE_WIDTH) * 100}%`,
              top: `${(layer.y / SCENE_HEIGHT) * 100}%`,
              width: `${(width / SCENE_WIDTH) * 100}%`,
              height: `${(height / SCENE_HEIGHT) * 100}%`,
            }}
          />
        );
      })}
    </div>
  );
}
