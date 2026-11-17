import { PROP_SOURCES, propSrc, propSrcSet, type PropId } from "@/lib/illust/assets";
import { PROP_SIZES } from "@/lib/illust/sprites";

// サイトのロゴ（2026-11-17 まさゆきさんが用意した生成AIの絵。家・DearLife・飯田移住カルテが1枚に入っている）。
// 高さは className で決め、横幅は絵の縦横の比で決まる。sizes は表示する横幅のいちばん大きい値
export function SiteLogo({ className, sizes }: { className: string; sizes: string }) {
  return <LogoImage prop="logo" className={className} sizes={sizes} decorative={false} />;
}

// ロゴの左の家だけ（トップの札など、ロゴ全体が入らない小さな場所）。そばにサイト名などの文字があるときに使うので読み上げない
export function SiteLogoMark({ className, sizes }: { className: string; sizes: string }) {
  return <LogoImage prop="logo-mark" className={className} sizes={sizes} decorative />;
}

function LogoImage({ prop, className, sizes, decorative }: { prop: PropId; className: string; sizes: string; decorative: boolean }) {
  const { width, height } = PROP_SIZES[prop];
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 静的書き出しなので WebP をそのまま出す
    <img
      src={propSrc(prop, PROP_SOURCES[prop].widths?.[0] ?? 48)}
      srcSet={propSrcSet(prop)}
      sizes={sizes}
      width={width}
      height={height}
      alt={decorative ? "" : PROP_SOURCES[prop].alt}
      aria-hidden={decorative || undefined}
      draggable={false}
      className={`w-auto max-w-none shrink-0 select-none ${className}`}
    />
  );
}
