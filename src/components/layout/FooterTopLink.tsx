"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TOP_PATH } from "@/lib/site";

// フッターの「トップへ」（2026-11-19 まさゆきさん）。トップにいるときは出さない
export function FooterTopLink({ className }: { className: string }) {
  if (usePathname() === TOP_PATH) return null;
  return (
    <Link href={TOP_PATH} className={className}>
      トップへ
    </Link>
  );
}
