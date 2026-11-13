"use client";

import { useId, useState } from "react";
import { DataStateMessage } from "@/components/data/DataStateMessage";
import { buttonClassName } from "@/components/ui/Button";
import type { DataState, EvacuationHazard, EvacuationSite } from "@/lib/data/screen-data";
import type { PropId } from "@/lib/illust/assets";
import { findEvacuationSites, googleMapsSearchHref } from "@/lib/karte/evacuation";
import { HAZARD_LABELS } from "@/lib/karte/facilities";
import { IIDA_HAZARD_MAP } from "@/lib/map/links";
import { DetailTabs, PropIcon, SearchMark, type DetailTabItem } from "./DetailCard";

// カルテの防災（040。見本 docs/design/karte-detail-disaster.png）：
// ハザードマップの帯 → 「災害の種類から避難先を探す」の箱（タブ・絞り込み・3件ずつの一覧・Google マップへのリンク）

export const DISASTER_TAB_ICONS: Readonly<Record<EvacuationHazard, PropId>> = {
  flood: "disaster-tab-flood",
  landslide: "disaster-tab-landslide",
  earthquake: "disaster-tab-earthquake",
  large_fire: "disaster-tab-large-fire",
};

// 一覧は最初に3件だけ出し、残りは「すべて見る」で開く（見本）
const FIRST_SITES = 3;

// 候補の家の周りの危険な場所は、市のハザードマップで確かめてもらう（データは取り込まない）。紙ではボタンを押せないので URL を書く
export function HazardMapBand() {
  return (
    <section
      aria-labelledby="hazard-map-band"
      className="flex break-inside-avoid flex-col gap-3 rounded-card border border-primary/20 bg-primary-soft p-4 md:flex-row md:items-center md:gap-5 md:p-5"
    >
      <div className="flex items-center gap-3 md:flex-1 md:gap-5">
        <PropIcon prop="childcare-zone-map" className="size-14 md:size-20" />
        <span aria-hidden="true" className="hidden self-stretch border-l border-primary/30 md:block" />
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="hazard-map-band" className="text-lg font-extrabold md:text-xl">
            候補の家の周りを確認する
          </h2>
          <p className="text-sm">
            浸水想定区域や土砂災害警戒区域を、
            <br className="hidden md:inline" />
            候補の住所の周辺で確認できます。
          </p>
        </div>
      </div>
      <a
        href={IIDA_HAZARD_MAP.url}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClassName("primary", "shrink-0 print:hidden")}
      >
        {IIDA_HAZARD_MAP.name}を開く
        <span className="sr-only">（新しいタブで開きます）</span>
        <span aria-hidden="true">↗</span>
      </a>
      <p className="hidden break-all text-xs print:block">
        {IIDA_HAZARD_MAP.name}：{IIDA_HAZARD_MAP.url}
      </p>
    </section>
  );
}

export function EvacuationFinder({
  state,
  tabs,
  selectedId,
  onSelect,
}: {
  state: DataState<readonly EvacuationSite[]>;
  tabs: readonly DetailTabItem[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const panelId = useId();
  return (
    <section aria-labelledby={`${panelId}-title`} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card md:p-5">
      <div className="flex flex-col gap-1">
        <h2 id={`${panelId}-title`} className="text-lg font-extrabold md:text-xl">
          災害の種類から避難先を探す
        </h2>
        <p className="text-sm">災害によって、使える指定緊急避難場所が異なります。</p>
      </div>
      {state.status === "available" ? (
        <>
          <DetailTabs label="災害の種類" tabs={tabs} selectedId={selectedId} panelId={panelId} onSelect={onSelect} large />
          <SiteSearch id={panelId} sites={state.value} hazard={selectedId as EvacuationHazard} />
        </>
      ) : (
        <DataStateMessage state={state} />
      )}
    </section>
  );
}

// 絞り込みの欄と一覧。入れた文字はタブを変えても残す（同じ町で、災害ごとの行き先を見比べられるように）
function SiteSearch({ id, sites, hazard }: { id: string; sites: readonly EvacuationSite[]; hazard: EvacuationHazard }) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [openHazard, setOpenHazard] = useState<EvacuationHazard | null>(null);
  const found = findEvacuationSites(sites, hazard, query);
  // 「すべて見る」で開いたのは、そのタブだけ（タブを変えたら3件に戻す）
  const open = openHazard === hazard;
  const shown = open ? found : found.slice(0, FIRST_SITES);
  const label = HAZARD_LABELS[hazard];
  return (
    <div id={id} role="tabpanel" aria-label={label} className="flex flex-col gap-2 pt-1">
      <div className="relative">
        <label htmlFor={inputId} className="sr-only">
          施設名・町名で絞り込む
        </label>
        <SearchMark />
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="施設名・町名で絞り込む"
          className="min-h-tap w-full rounded-button border border-line bg-surface py-2 pl-10 pr-3 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
      </div>
      <p aria-live="polite" className="flex items-baseline justify-between gap-3 border-b border-line pb-2 pt-1">
        <span className="font-bold text-primary">{label}に対応する指定緊急避難場所</span>
        <span className="shrink-0 font-bold tabular-nums text-ink-muted">{found.length.toLocaleString("ja-JP")}か所</span>
      </p>
      {found.length === 0 ? (
        <p className="py-4 text-center text-sm text-ink-muted">{query.trim() === "" ? "地区の中にはありません。" : "見つかりませんでした"}</p>
      ) : (
        <ul aria-label={`${label}に対応する指定緊急避難場所`} className="flex flex-col divide-y divide-line">
          {shown.map((site, index) => (
            <li key={`${site.name}-${index}`} className="flex items-center justify-between gap-3 py-2 md:px-2">
              <span className="min-w-0 text-base font-bold md:text-lg">{site.name}</span>
              <SiteMapLink site={site} />
            </li>
          ))}
        </ul>
      )}
      {found.length > FIRST_SITES && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpenHazard(open ? null : hazard)}
          className="flex min-h-tap items-center justify-center gap-2 border-t border-line font-bold text-primary"
        >
          {open ? "閉じる" : `${label}の避難場所をすべて見る`}
          <span aria-hidden="true" className={open ? "rotate-180" : ""}>
            ⌄
          </span>
        </button>
      )}
    </div>
  );
}

function SiteMapLink({ site }: { site: EvacuationSite }) {
  return (
    <a
      href={googleMapsSearchHref(site)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-tap shrink-0 items-center gap-1 rounded-button border-2 border-primary bg-surface px-3 text-sm font-bold text-primary hover:bg-primary-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      地図で見る
      <span className="sr-only">（{site.name}を Google マップで、新しいタブで開きます）</span>
      <span aria-hidden="true">↗</span>
    </a>
  );
}

// 紙では絞り込めないので、地区の避難場所を全部1つの一覧にし、1行ずつ使える災害を書く（040 作り方 5）
export function EvacuationPrintList({ state }: { state: DataState<readonly EvacuationSite[]> }) {
  if (state.status !== "available") return <DataStateMessage state={state} />;
  const sites = state.value;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="break-after-avoid font-bold">
        地区の指定緊急避難場所（{sites.length.toLocaleString("ja-JP")}か所）
      </h3>
      <ul className="block divide-y divide-line">
        {sites.map((site, index) => (
          <li key={`${site.name}-${index}`} className="break-inside-avoid py-1.5 text-sm">
            <span className="font-bold">{site.name}</span>
            {site.address && <span className="ml-2 text-xs text-ink-muted">{site.address}</span>}
            {site.hazards.length > 0 && (
              <span className="mt-0.5 block text-xs text-ink-muted">使える災害：{site.hazards.map((item) => HAZARD_LABELS[item]).join("・")}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
