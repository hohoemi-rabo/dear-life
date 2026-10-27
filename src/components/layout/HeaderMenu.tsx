"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { ABOUT_DATA_PATH, ERABU_PATH } from "@/lib/site";

const ITEMS = [
  { href: ABOUT_DATA_PATH, label: "データについて" },
  { href: ERABU_PATH, label: "はじめから選ぶ" },
] as const;

// スマホのヘッダーの「≡」メニュー（027）。画面を移ってもヘッダーは残るので、移ったら閉じる
export function HeaderMenu() {
  const pathname = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (menu.current) menu.current.open = false;
  }, [pathname]);

  return (
    <details ref={menu} className="group relative">
      <summary
        aria-label="メニュー"
        className="flex size-11 cursor-pointer list-none items-center justify-center rounded-button text-2xl text-ink hover:bg-kinari-deep [&::-webkit-details-marker]:hidden"
      >
        <span aria-hidden="true">≡</span>
      </summary>
      <nav aria-label="メニュー" className="absolute right-0 top-12 z-20 w-48 rounded-card border border-line bg-surface p-2 shadow-card">
        <ul>
          {ITEMS.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="flex min-h-tap items-center rounded-button px-3 font-bold text-primary hover:bg-primary-soft">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </details>
  );
}
