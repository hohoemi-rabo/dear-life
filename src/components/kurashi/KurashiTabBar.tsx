"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { Conditions } from "@/lib/conditions/model";
import type { Season } from "@/lib/conditions/scene";
import { kurabeHref } from "@/lib/kurabe/links";
import { karteHref } from "@/lib/kurashi/links";
import { SEASON_SLUGS } from "@/lib/kurashi/season";
import { mapHref } from "@/lib/map/links";

// スマホの下に固定するタブ（028 見本）：くらし・カルテ・地区くらべ・地図。条件と季節を URL に載せたまま移る（F-02）
export function KurashiTabBar({ conditions, season }: { conditions: Conditions; season: Season }) {
  const slug = SEASON_SLUGS[season];
  return (
    <nav aria-label="画面の切り替え" className="sticky bottom-0 z-30 -mx-4 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
      <ul className="grid grid-cols-4">
        <Tab current label="くらし" icon={<HomeIcon />} />
        <Tab href={karteHref(conditions, season)} label="カルテ" icon={<DocumentIcon />} />
        <Tab href={kurabeHref(conditions, slug)} label="地区くらべ" icon={<ChartIcon />} />
        <Tab href={mapHref(conditions, slug)} label="地図" icon={<PinIcon />} />
      </ul>
    </nav>
  );
}

const TAB = "flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 text-xs";

function Tab({ href, current = false, label, icon }: { href?: string; current?: boolean; label: string; icon: ReactNode }) {
  return (
    <li>
      {current || !href ? (
        <span aria-current="page" className={`${TAB} font-bold text-primary`}>
          {icon}
          {label}
        </span>
      ) : (
        <Link href={href} className={`${TAB} text-ink-muted hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary`}>
          {icon}
          {label}
        </Link>
      )}
    </li>
  );
}

// タブの印（見本：線の印。くらしだけ塗る）。飾り
function HomeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="currentColor">
      <path d="M12 3 3 10.5V21h6.5v-6h5v6H21V10.5z" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4M9 12h6M9 16h6" strokeLinecap="round" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M4 20h16M7 17v-5M12 17V7M17 17v-8" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 21s7-6.6 7-11.6A7 7 0 0 0 5 9.4C5 14.4 12 21 12 21Z" strokeLinejoin="round" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}
