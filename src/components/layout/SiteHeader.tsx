import Link from "next/link";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { PixelImage } from "@/components/pixel/PixelImage";
import { ABOUT_DATA_PATH, SITE_NAME, SITE_NAME_JA } from "@/lib/site";
import { HeaderMenu } from "./HeaderMenu";
import { StepIndicator } from "./StepIndicator";

// サイト名・ロゴに国土交通省・飯田市の名称やマークを使わない（要件 7.3）。
// スマホは「ロゴ・メニュー」の下に進みぐあい、PC は「ロゴ・進みぐあい・データについて」を1行に並べる（027）
export function SiteHeader() {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2">
        <Link href="/" className="flex min-h-tap items-center gap-2">
          <PixelImage asset="logo" scale={2} decorative />
          <span className="flex flex-col leading-tight">
            <span className="text-2xl font-extrabold text-primary md:text-3xl">{SITE_NAME}</span>
            <span className="text-xs tracking-[0.3em] text-ink-muted">{SITE_NAME_JA}</span>
          </span>
        </Link>
        <div className="md:hidden">
          <HeaderMenu />
        </div>
        <Link
          href={ABOUT_DATA_PATH}
          className="hidden min-h-tap items-center gap-2 font-bold text-primary underline-offset-4 hover:underline md:order-last md:flex"
        >
          <PixelIcon icon="icon-sprout" />
          データについて
          <span aria-hidden="true">›</span>
        </Link>
        <div className="w-full md:w-auto">
          <StepIndicator />
        </div>
      </div>
    </header>
  );
}
