"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { lastViewOf, readLastViewHref } from "@/lib/pwa/last-view";

const subscribeNothing = () => () => {};

// 前に見た画面へ戻るリンク（024）。ホーム画面のアイコンから開くと入口（/）から始まるので、圏外でも前回の場面やカルテへすぐ戻れるようにする。
// トップの見本（033）では「わが家の暮らしをつくる」の下の文字のリンク。初めての人には出さない（2026-11-07 まさゆきさん）。
// 端末に残した値はブラウザでしか読めないので、ビルド時とハイドレーションのあいだは出さない
export function ResumeLastView() {
  const href = useSyncExternalStore(subscribeNothing, readLastViewHref, () => null);
  const lastView = lastViewOf(href);
  if (!lastView) return null;
  return (
    <Link
      href={lastView.href}
      aria-label={`前に見た暮らしのつづきから（${lastView.label}）`}
      className="inline-flex min-h-tap items-center gap-2 whitespace-nowrap font-bold text-primary underline underline-offset-4"
    >
      <ResumeIcon />
      前に見た暮らしのつづきから
    </Link>
  );
}

// 「つづきから」の印（033 見本：戻る向きの丸い矢印）。飾り
function ResumeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12a8 8 0 1 0 2.3-5.6" />
      <path d="M4 4v4h4" />
    </svg>
  );
}
