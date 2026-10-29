import { ILLUST_PICTURES, illustPictureSrc, type IllustPictureId } from "@/lib/illust/assets";

// 生成AIで作った絵を1枚出す（028）。書き出した横幅の中から、端末の幅と画面の細かさに合うものをブラウザに選ばせる。
// 静的書き出しでは next/image の画像の最適化が使えず（next.config の images.unoptimized）、srcset を出せないので <img> を使う
export function IllustPicture({
  picture,
  sizes,
  decorative = false,
  priority = false,
  className = "",
}: {
  picture: IllustPictureId;
  // 画面の上での表示幅（<img sizes>）
  sizes: string;
  decorative?: boolean;
  // 最初に見える絵は先に読ませる
  priority?: boolean;
  className?: string;
}) {
  const { width, height, widths, alt } = ILLUST_PICTURES[picture];
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 上のとおり、srcset を出すため
    <img
      src={illustPictureSrc(picture, widths.at(-1)!)}
      srcSet={widths.map((w) => `${illustPictureSrc(picture, w)} ${w}w`).join(", ")}
      sizes={sizes}
      width={width}
      height={height}
      alt={decorative ? "" : alt}
      aria-hidden={decorative || undefined}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      draggable={false}
      className={`select-none ${className}`}
    />
  );
}
