import Link from "next/link";
import { ABOUT_DATA_PATH, SITE_NAME, SITE_NAME_JA } from "@/lib/site";
import { StepIndicator } from "./StepIndicator";

// サイト名・ロゴに国土交通省・飯田市の名称やマークを使わない（要件 7.3）
export function SiteHeader() {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2">
        <Link href="/" className="flex min-h-tap flex-col justify-center leading-tight">
          <span className="text-xl font-bold text-primary">{SITE_NAME}</span>
          <span className="text-xs tracking-widest text-ink-muted">{SITE_NAME_JA}</span>
        </Link>
        <Link
          href={ABOUT_DATA_PATH}
          className="flex min-h-tap items-center text-sm font-bold text-primary underline-offset-4 hover:underline md:order-last"
        >
          データについて
        </Link>
        <div className="w-full md:w-auto">
          <StepIndicator />
        </div>
      </div>
    </header>
  );
}
