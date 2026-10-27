"use client";

import { useSyncExternalStore } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { lastViewOf, readLastViewHref } from "@/lib/pwa/last-view";

const subscribeNothing = () => () => {};

// 前に見た画面へ戻るボタン（024）。ホーム画面のアイコンから開くと入口（/）から始まるので、圏外でも前回の場面やカルテへすぐ戻れるようにする。
// 端末に残した値はブラウザでしか読めないので、ビルド時とハイドレーションのあいだは出さない
export function ResumeLastView() {
  const href = useSyncExternalStore(subscribeNothing, readLastViewHref, () => null);
  const lastView = lastViewOf(href);
  if (!lastView) return null;
  return (
    <ButtonLink href={lastView.href} variant="secondary" className="self-start">
      前に見た{lastView.label}にもどる
      <span aria-hidden="true">→</span>
    </ButtonLink>
  );
}
