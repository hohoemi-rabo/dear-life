import Link from "next/link";
import { HeaderNav } from "./HeaderNav";
import { SiteLogo } from "./SiteLogo";

// サイト名・ロゴに国土交通省・飯田市の名称やマークを使わない（要件 7.3）。
// スマホは「ロゴ・メニュー」の下に進みぐあい、PC は「ロゴ・進みぐあい・データについて」を1行に並べる（027）。
// えらぶではロゴだけにする（028。HeaderNav）。
// ロゴは家とサイト名が1枚に入った絵（2026-11-17）。読み上げは絵の alt（DearLife 飯田移住カルテ）
export function SiteHeader() {
  return (
    // 「≡」のメニューはヘッダーから下へはみ出して開く。くらしの見出し（z-30）の下にもぐらないよう、ヘッダーを上に重ねる（2026-11-19 Android で見つけた）
    <header className="relative z-40 border-b border-line bg-surface">
      <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2">
        <Link href="/" className="flex min-h-tap items-center">
          <SiteLogo className="h-12 md:h-14" sizes="(min-width: 768px) 196px, 168px" />
        </Link>
        <HeaderNav />
      </div>
    </header>
  );
}
