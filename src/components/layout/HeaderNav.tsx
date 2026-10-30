"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
        className="hidden min-h-tap items-center gap-1.5 text-sm font-bold text-ink underline-offset-4 hover:underline md:order-last md:flex"
      >
        <InfoIcon />
        データについて
      </Link>
      <div className="w-full md:w-auto">
        <StepIndicator />
      </div>
    </>
  );
}

// 「データについて」の印（028 見本：丸に i）。飾り
function InfoIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6" />
      <circle cx="12" cy="7.6" r="0.6" fill="currentColor" />
    </svg>
  );
}
