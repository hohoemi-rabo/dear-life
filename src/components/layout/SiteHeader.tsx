import Link from "next/link";
import { PixelImage } from "@/components/pixel/PixelImage";
import { SITE_NAME, SITE_NAME_JA } from "@/lib/site";
import { HeaderNav } from "./HeaderNav";

// サイト名・ロゴに国土交通省・飯田市の名称やマークを使わない（要件 7.3）。
// スマホは「ロゴ・メニュー」の下に進みぐあい、PC は「ロゴ・進みぐあい・データについて」を1行に並べる（027）。
// えらぶではロゴだけにする（028。HeaderNav）
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
        <HeaderNav />
      </div>
    </header>
  );
}
