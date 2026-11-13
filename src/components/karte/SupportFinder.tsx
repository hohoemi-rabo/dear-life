"use client";

import { useId, useState } from "react";
import { DataStateMessage } from "@/components/data/DataStateMessage";
import { buttonClassName } from "@/components/ui/Button";
import type { SupportProgram } from "@/lib/data/screen-data";
import type { PropId } from "@/lib/illust/assets";
import { supportPurposeTabs, type SupportCategory } from "@/lib/karte/support";
import { PropIcon } from "./DetailCard";

// カルテの支援制度（040。見本 docs/design/karte-detail-support.png）：「目的から支援制度を探す」の箱。
// 目的のタブ → 「移住の支援 掲載3件」→ 1行ずつ 札・題・正式な名前・「公式ページを見る」→「掲載制度をすべて見る」。
// 制度ごとの絵は出さない（制度が増えるたびに絵が要るため。2026-11-13 まさゆきさん）。行の左は札

// タブの印。「その他」は今0件なので専用の印はなく、書類の絵を出す
const PURPOSE_ICONS: Readonly<Record<SupportCategory, PropId>> = {
  移住: "support-tab-move",
  住まい: "support-tab-housing",
  子育て: "support-tab-childcare",
  その他: "support-before-apply",
};

export function SupportFinder({ programs }: { programs: readonly SupportProgram[] }) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-card md:p-5">
      <h2 id={titleId} className="flex items-center gap-3 text-lg font-extrabold md:text-2xl">
        <span aria-hidden="true" className="h-6 w-1.5 rounded-full bg-gold md:h-7" />
        目的から支援制度を探す
      </h2>
      {programs.length > 0 ? <Finder programs={programs} /> : <DataStateMessage state={{ status: "unavailable" }} />}
    </section>
  );
}

function Finder({ programs }: { programs: readonly SupportProgram[] }) {
  const panelId = useId();
  const tabs = supportPurposeTabs(programs);
  const [selected, setSelected] = useState<SupportCategory | null>(null);
  const [allOpen, setAllOpen] = useState(false);
  const tab = tabs.find((item) => item.category === selected) ?? tabs[0];
  return (
    <>
      <div
        role="tablist"
        aria-label="目的"
        className={`grid gap-2 md:gap-3 ${tabs.length >= 4 ? "grid-cols-2 md:grid-cols-4" : tabs.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}
      >
        {tabs.map((item) => {
          const isSelected = item.category === tab.category;
          return (
            <button
              key={item.category}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls={panelId}
              onClick={() => setSelected(item.category)}
              className={[
                // スマホは3つ横に並べるので、印を名前の上に置く
                "relative flex min-h-16 flex-col items-center justify-center gap-1 rounded-button border px-1 py-2 text-center",
                "md:min-h-24 md:flex-row md:justify-start md:gap-4 md:px-5 md:text-left",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                isSelected ? "border-primary bg-primary text-white" : "border-line bg-surface text-ink hover:border-primary",
              ].join(" ")}
            >
              <PropIcon prop={PURPOSE_ICONS[item.category]} className="size-9 md:size-16" />
              <span className="flex min-w-0 flex-col">
                <span className="text-base font-extrabold leading-snug md:text-2xl">{item.category}</span>
                <span className="text-[11px] leading-snug md:text-sm">
                  <Kinds text={item.kinds} />
                </span>
              </span>
              {isSelected && <span aria-hidden="true" className="absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 bg-primary" />}
            </button>
          );
        })}
      </div>

      <div id={panelId} role="tabpanel" aria-label={tab.heading} className="flex flex-col gap-1 border-t border-line pt-4">
        <PurposeHeading heading={tab.heading} count={tab.programs.length} />
        <ProgramRows programs={tab.programs} label={tab.heading} />
      </div>

      <div className="flex flex-col">
        <button
          type="button"
          aria-expanded={allOpen}
          onClick={() => setAllOpen(!allOpen)}
          className="flex min-h-tap items-center justify-center gap-2 rounded-button bg-kinari font-bold text-primary hover:bg-kinari-deep"
        >
          <span aria-hidden="true" className={allOpen ? "rotate-180" : ""}>
            ⌄
          </span>
          {allOpen ? "閉じる" : `掲載制度をすべて見る（${programs.length.toLocaleString("ja-JP")}件）`}
        </button>
        {allOpen && (
          <div className="flex flex-col gap-4 pt-4">
            {tabs.map((item) => (
              <section key={item.category} className="flex flex-col gap-1">
                <PurposeHeading heading={item.heading} count={item.programs.length} as="h4" />
                <ProgramRows programs={item.programs} label={item.heading} />
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// スマホの狭いタブでは「・」の後でだけ折り返す（「お／金」のように言葉の途中で切れないように）
function Kinds({ text }: { text: string }) {
  const parts = text.split("・");
  return parts.map((part, index) => (
    <span key={part} className="inline-block whitespace-nowrap">
      {part}
      {index < parts.length - 1 && "・"}
    </span>
  ));
}

function PurposeHeading({ heading, count, as: Tag = "h3" }: { heading: string; count: number; as?: "h3" | "h4" }) {
  return (
    <Tag className="flex items-center gap-3">
      <span aria-hidden="true" className="h-6 w-1.5 rounded-full bg-primary" />
      <span className="text-lg font-extrabold md:text-2xl">{heading}</span>
      <span className="rounded-full bg-kinari-deep px-3 py-0.5 text-sm font-bold tabular-nums">掲載{count.toLocaleString("ja-JP")}件</span>
    </Tag>
  );
}

function ProgramRows({ programs, label }: { programs: readonly SupportProgram[]; label: string }) {
  return (
    <ul aria-label={label} className="flex flex-col divide-y divide-line">
      {programs.map((program, index) => (
        <li key={program.name} className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:gap-6 md:px-2">
          <ProgramText program={program} />
          {/* 見本どおり、1行目のボタンだけ塗りつぶす。文言は全部「公式ページを見る」にそろえる（2026-11-13 まさゆきさん） */}
          <a
            href={program.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClassName(index === 0 ? "primary" : "secondary", "shrink-0 md:w-72")}
          >
            公式ページを見る
            <span className="sr-only">（{program.name}の公式ページが新しいタブで開きます）</span>
            <span aria-hidden="true">↗</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

// 札・題・正式な名前。題を入れていない制度は、正式な名前を太字にして札なしで出す（040 作り方 1）
function ProgramText({ program }: { program: SupportProgram }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
      {program.tag && program.title && (
        <span className="rounded-full border border-gold/50 bg-warm-soft px-2.5 py-0.5 text-xs font-bold">{program.tag}</span>
      )}
      {/* 題は文節で折り返す（最後の1文字だけが次の行に落ちないように。対応していないブラウザは今までどおり） */}
      <p className="text-base font-extrabold leading-snug [word-break:auto-phrase] md:text-xl">{program.title ?? program.name}</p>
      {program.title && <p className="text-sm">{program.name}</p>}
    </div>
  );
}

// 「申し込む前に確かめたいこと」の箱（見本）。今の注意書きと「窓口で確かめたいこと」を1つにまとめた（2026-11-13 まさゆきさん）
export function SupportBeforeApply({ title, text }: { title: string; text: string }) {
  return (
    <section className="flex break-inside-avoid items-center gap-3 rounded-card border border-gold/40 bg-warm-soft p-4 shadow-card md:gap-4 md:px-6">
      <PropIcon prop="support-before-apply" className="size-11 md:size-20" />
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="flex items-center gap-2 text-base font-extrabold [word-break:auto-phrase] md:gap-3 md:text-xl">
          <span aria-hidden="true" className="h-6 w-1.5 shrink-0 rounded-full bg-gold" />
          {title}
        </h2>
        <p className="text-sm md:text-base">{text}</p>
      </div>
    </section>
  );
}

// 紙ではタブを押せないので、3つの目的を全部出す。リンクを押せないので公式ページの URL を書く（023）
export function SupportPrintList({ programs }: { programs: readonly SupportProgram[] }) {
  if (programs.length === 0) return <DataStateMessage state={{ status: "unavailable" }} />;
  return (
    <div className="flex flex-col gap-3">
      <h3 className="break-after-avoid font-bold">飯田市全体の支援制度（{programs.length.toLocaleString("ja-JP")}件）</h3>
      {supportPurposeTabs(programs).map((tab) => (
        <section key={tab.category} className="flex flex-col gap-1">
          <h4 className="break-after-avoid text-sm font-bold">
            {tab.heading}（{tab.programs.length}件）
          </h4>
          <ul className="block divide-y divide-line">
            {tab.programs.map((program) => (
              <li key={program.name} className="break-inside-avoid py-2">
                <ProgramText program={program} />
                <p className="mt-1 text-sm">{program.summary}</p>
                <p className="break-all text-xs">{program.officialUrl}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
