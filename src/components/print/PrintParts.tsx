"use client";

import { useState, type ReactNode } from "react";
import { PixelImage } from "@/components/pixel/PixelImage";
import { CAR_LABELS, DISTRICT_NAMES, HOUSING_LABELS, familyLabel } from "@/lib/conditions/labels";
import type { Conditions } from "@/lib/conditions/model";
import { printedOn } from "@/lib/print/print";
import { SITE_NAME, SITE_NAME_JA } from "@/lib/site";

// 印刷物の部品（023）。紙の幅（A4 縦・余白12mm で約700px）では md 以上の書き方は効かないので、幅で切りかえない書き方にする

// いちばん上：サイト名・何の印刷か・選んだ条件・印刷日・この画面の URL（紙から画面に戻れるように。URL には条件しか入っていない）
export function PrintHeader({ title, conditions }: { title: string; conditions: Conditions }) {
  // 印刷するたびに作り直される部品なので、作ったときの日時と URL で足りる
  const [{ date, url }] = useState(() => ({ date: printedOn(new Date()), url: window.location.href }));
  const chosen = [
    `地区：${conditions.district === null ? "選んでいません" : DISTRICT_NAMES[conditions.district]}`,
    `家族：${familyLabel(conditions)}`,
    `家：${HOUSING_LABELS[conditions.housing]}`,
    ...(conditions.car !== null ? [`車：${CAR_LABELS[conditions.car]}`] : []),
  ];
  return (
    <header className="flex flex-col gap-2 border-b-2 border-ink pb-3">
      <div className="flex items-center justify-between gap-4">
        <p className="flex items-center gap-2">
          <PixelImage asset="logo" scale={2} decorative />
          <span className="flex flex-col leading-tight">
            <span className="text-xl font-extrabold text-primary">{SITE_NAME}</span>
            <span className="text-xs tracking-[0.3em] text-ink-muted">{SITE_NAME_JA}</span>
          </span>
        </p>
        <p className="text-sm">印刷日：{date}</p>
      </div>
      <h1 className="text-2xl font-extrabold">{title}</h1>
      <p className="flex flex-wrap gap-x-4 text-sm font-bold">
        {chosen.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </p>
      <p className="break-all text-xs text-ink-muted">この画面：{url}</p>
    </header>
  );
}

// 1つのまとまり。2つ目からは新しい紙から始める。
// 紙の上では flex の縦並びを使わない（Chrome は flex の中で紙を切ると、次のまとまりが上に重なることがある）
export function PrintSection({ first, label, children }: { first: boolean; label: string; children: ReactNode }) {
  return (
    <section aria-label={label} className={`space-y-4 pt-4 ${first ? "" : "break-before-page"}`}>
      {children}
    </section>
  );
}

// 紙の上のまとまり（カード・表など）。ふだんは途中で切らない。
// 長い一覧を含むもの（breakable）は、印刷の直前に高さを測り、1ページに収まるときだけ分けない（PrintControl の keepBlocksThatFit）
export function PrintBlock({ children, breakable = false, className = "" }: { children: ReactNode; breakable?: boolean; className?: string }) {
  return (
    <div data-print-fit={breakable ? "" : undefined} className={`${breakable ? "" : "break-inside-avoid"} rounded-card border border-line p-4 ${className}`}>
      {children}
    </div>
  );
}

// 「現地で確かめたいこと」：ペンでチェックする空の箱（2026-11-01 まさゆきさん。画面で押したチェックは反映しない）
export function PrintCheckList({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <PrintBlock className="flex flex-col gap-2">
      <h3 className="font-bold">{title}</h3>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-3">
            <span aria-hidden="true" className="size-5 shrink-0 rounded-sm border-2 border-ink bg-white" />
            {item}
          </li>
        ))}
        {/* 自分で書き足すための空いた行 */}
        <li aria-hidden="true" className="flex items-center gap-3">
          <span className="size-5 shrink-0 rounded-sm border-2 border-ink bg-white" />
          <span className="h-5 flex-1 border-b border-dotted border-ink-muted" />
        </li>
      </ul>
    </PrintBlock>
  );
}
