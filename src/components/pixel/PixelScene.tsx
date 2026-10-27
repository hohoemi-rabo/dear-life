import Image from "next/image";
import { PIXEL_ASSETS, pixelAssetSrc } from "@/lib/pixel/assets";
import { SCENE_HEIGHT, SCENE_WIDTH, type SceneLayer } from "@/lib/pixel/scenes";

// 部品を重ねて1枚の場面にする（要件 6.2・8.1）。160×90 ドットを、既定では幅 320・480・640px（2・3・4倍）の整数倍でぼかさずに出す。
// 置く場所に合わせて幅を変えるときは widthClassName に 160px の整数倍の幅だけを書く。
// 部品の位置と大きさは場面に対する割合で置くので、どの倍率でもドットの境目がそろう。
// 読み上げは場面全体を1枚の絵として扱い、部品の代替テキストをつないで説明にする
export function PixelScene({
  layers,
  widthClassName = "w-[320px] sm:w-[480px] lg:w-[640px]",
  className = "",
}: {
  layers: readonly SceneLayer[];
  widthClassName?: string;
  className?: string;
}) {
  const label = layers.map((layer) => PIXEL_ASSETS[layer.asset].alt).join("。");
  return (
    <div
      role="img"
      aria-label={label}
      className={`relative aspect-[16/9] overflow-hidden bg-kinari-deep ${widthClassName} ${className}`}
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
