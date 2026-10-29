"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { ABOUT_DATA_PATH, ERABU_PATH } from "@/lib/site";
import { HeaderMenu } from "./HeaderMenu";
import { StepIndicator } from "./StepIndicator";

// ヘッダーのロゴより右の部分。えらぶでは出さない（028 見本：ロゴの下に質問の番号の丸5つだけを置く）。
// 要素はヘッダーの並び（flex）にそのまま入れるので、包まずに返す
export function HeaderNav() {
  const pathname = usePathname();
  if (pathname === ERABU_PATH || pathname.startsWith(`${ERABU_PATH}/`)) return null;
  return (
    <>
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
    </>
  );
}
