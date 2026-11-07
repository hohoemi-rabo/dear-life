"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { Conditions } from "@/lib/conditions/model";
import { seasonalHref } from "@/lib/kurashi/links";
import { KARTE_PATH, KURABE_PATH, KURASHI_PATH, MAP_PATH } from "@/lib/site";

export type ScreenTab = "kurashi" | "karte" | "kurabe" | "chizu";

const TABS: readonly { id: ScreenTab; label: string; path: string; icon: () => ReactNode }[] = [
  { id: "kurashi", label: "くらし", path: KURASHI_PATH, icon: HomeIcon },
  { id: "karte", label: "カルテ", path: KARTE_PATH, icon: DocumentIcon },
  { id: "kurabe", label: "地区くらべ", path: KURABE_PATH, icon: ChartIcon },
  { id: "chizu", label: "地図", path: MAP_PATH, icon: PinIcon },
];

// スマホ・iPad の縦の下に固定するタブ（028 見本のくらし）：くらし・カルテ・地区くらべ・地図。
// 2026-11-07 にカルテ（詳細も）・地区くらべ・地図にも広げた（まさゆきさん。見て判断する）。えらぶは下に「もどる・次へ」の帯があるので出さない。
// 条件と季節（URL の s）を載せたまま移る（F-02）。地区を選ぶ前は移る先に見せるものがないので、地区がある画面でだけ使う。
// フッターまでスクロールしても流れないよう画面に固定する。タブの裏にフッターが隠れないよう、
// data-tab-bar を目印に body の下にタブと同じ高さの余白をとる（layout.tsx）。
// カルテの詳細では「カルテ」を今の画面として色を付けたまま、一覧へ戻るリンクにする（linkCurrent）
export function ScreenTabBar({
  current,
  conditions,
  seasonSlug,
  linkCurrent = false,
}: {
  current: ScreenTab;
  conditions: Conditions;
  seasonSlug: string | null;
  linkCurrent?: boolean;
}) {
  return (
    <nav aria-label="画面の切り替え" data-tab-bar className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
      <ul className="grid grid-cols-4">
        {TABS.map(({ id, label, path, icon: Icon }) => {
          const active = id === current;
          const content = (
            <>
              <Icon />
              {label}
            </>
          );
          return (
            <li key={id}>
              {active && !linkCurrent ? (
                <span aria-current="page" className={`${TAB} font-bold text-primary`}>
                  {content}
                </span>
              ) : (
                <Link
                  href={seasonalHref(path, conditions, seasonSlug)}
                  aria-current={active ? "true" : undefined}
                  className={`${TAB} ${active ? "font-bold text-primary" : "text-ink-muted"} hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary`}
                >
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const TAB = "flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 text-xs";

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
