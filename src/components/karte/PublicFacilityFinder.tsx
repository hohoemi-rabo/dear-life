"use client";

import { useId, useState } from "react";
import { DataStateMessage } from "@/components/data/DataStateMessage";
import type { DataState, Facility } from "@/lib/data/screen-data";
import type { PropId } from "@/lib/illust/assets";
import { publicFacilityGroups, publicUseTabs, type PublicUse } from "@/lib/karte/public-facilities";
import { GoogleMapsLink, PropIcon } from "./DetailCard";

// カルテの公共施設（040。見本 docs/design/karte-detail-public.png）：「使い道から施設を探す」の箱。
// 使い道のタブ → 「〈地区〉の〈種類〉 〇か所」の帯 → 1行ずつの名前と「地図で見る」→「掲載施設をすべて見る」→ 注意書き

// タブと帯の見出しの印。病院・市役所は交通の行ける場所の印を使う（2026-11-13 まさゆきさん）
const USE_ICONS: Readonly<Record<PublicUse, PropId>> = {
  play: "public-tab-park",
  library: "public-tab-library",
  sports: "public-tab-sports",
  community: "public-tab-community",
  office: "errand-office",
  medical: "errand-hospital",
};

// 見本の注意書き。開いている日と時間はデータに持っていないので、各施設の案内で確かめてもらう
export const PUBLIC_FACILITY_NOTE = "開館日・利用時間は、各施設の案内で確認してください。";
// 市の公共施設一覧にあるのは市立の施設だけ。上郷に診療所が1か所しかないように見えないように書く（2026-11-13 まさゆきさん）
export const PUBLIC_MEDICAL_NOTE = "市の施設だけです。民間の診療所は入っていません。";

export function PublicFacilityFinder({ state, districtName }: { state: DataState<readonly Facility[]>; districtName: string }) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-card md:p-5">
      <h2 id={titleId} className="text-lg font-extrabold md:text-2xl">
        使い道から施設を探す
      </h2>
      {state.status === "available" && state.value.length > 0 ? (
        <Finder facilities={state.value} districtName={districtName} />
      ) : state.status === "available" ? (
        <p className="py-4 text-center text-sm text-ink-muted">地区の中にはありません。</p>
      ) : (
        <DataStateMessage state={state} />
      )}
    </section>
  );
}

function Finder({ facilities, districtName }: { facilities: readonly Facility[]; districtName: string }) {
  const panelId = useId();
  const tabs = publicUseTabs(facilities);
  const [selectedUse, setUse] = useState<PublicUse | null>(null);
  const [allOpen, setAllOpen] = useState(false);
  const tab = tabs.find((item) => item.id === selectedUse) ?? tabs[0];
  return (
    <>
      <div role="tablist" aria-label="使い道" className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3">
        {tabs.map((item) => {
          const selected = item.id === tab.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId}
              onClick={() => setUse(item.id)}
              className={[
                // スマホは2列で幅が狭いので、印を名前の上に置く（「地域の活動・文化」が途中で折り返さないように）
                "flex min-h-16 flex-col items-center justify-center gap-1 rounded-button border px-1.5 py-2 text-center",
                "md:min-h-20 md:flex-row md:justify-start md:gap-4 md:px-4 md:text-left",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                selected ? "border-primary bg-primary text-white" : "border-line bg-surface text-ink hover:border-primary",
              ].join(" ")}
            >
              <PropIcon prop={USE_ICONS[item.id]} className="size-8 md:size-14" />
              <span className="flex min-w-0 flex-col whitespace-nowrap">
                <span className="text-sm font-extrabold leading-snug md:text-lg">{item.title}</span>
                <span className="text-xs md:text-sm">{item.kinds}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div id={panelId} role="tabpanel" aria-label={tab.title} className="flex flex-col gap-1">
        <h3 className="flex items-center gap-3 rounded-button bg-primary-soft px-3 py-2 md:px-4">
          <PropIcon prop={USE_ICONS[tab.id]} className="size-8 md:size-10" />
          <span className="text-lg font-extrabold text-primary md:text-2xl">
            {districtName}の{tab.kinds}
          </span>
          <span className="font-bold tabular-nums text-ink-muted">{tab.facilities.length.toLocaleString("ja-JP")}か所</span>
        </h3>
        {tab.id === "medical" && <p className="px-1 pt-1 text-sm">{PUBLIC_MEDICAL_NOTE}</p>}
        <FacilityRows facilities={tab.facilities} label={`${districtName}の${tab.kinds}`} />
      </div>

      <div className="flex flex-col">
        <button
          type="button"
          aria-expanded={allOpen}
          onClick={() => setAllOpen(!allOpen)}
          className="flex min-h-tap items-center justify-center gap-2 border-t border-line font-bold text-primary"
        >
          {allOpen ? "閉じる" : `掲載施設をすべて見る（${facilities.length.toLocaleString("ja-JP")}か所）`}
          <span aria-hidden="true" className={allOpen ? "rotate-180" : ""}>
            ⌄
          </span>
        </button>
        {allOpen && (
          <div className="flex flex-col gap-3 border-t border-line pt-3">
            {publicFacilityGroups(facilities).map((group) => (
              <section key={group.subkind} className="flex flex-col">
                <h4 className="rounded-button bg-kinari px-3 py-1.5 text-sm font-bold">
                  {group.subkind}（{group.items.length}か所）
                </h4>
                <FacilityRows facilities={group.items} label={group.subkind} />
              </section>
            ))}
          </div>
        )}
      </div>

      <InfoNote text={PUBLIC_FACILITY_NOTE} />
    </>
  );
}

function FacilityRows({ facilities, label }: { facilities: readonly Facility[]; label: string }) {
  return (
    <ul aria-label={label} className="flex flex-col divide-y divide-line">
      {facilities.map((facility, index) => (
        <li key={`${facility.name}-${index}`} className="flex items-center justify-between gap-3 py-2 md:px-3">
          <span className="min-w-0 text-base font-bold md:text-lg">{facility.name}</span>
          <GoogleMapsLink place={facility} />
        </li>
      ))}
    </ul>
  );
}

// 見本の「i」の付いた注意書き
function InfoNote({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-2 rounded-button bg-kinari px-3 py-2 text-sm">
      <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center rounded-full bg-gold text-xs font-bold text-white">
        i
      </span>
      {text}
    </p>
  );
}

// 紙ではタブを押せないので、地区の公共施設を種類ごとに全部出す（040 作り方 5）
export function PublicFacilityPrintList({ state, districtName }: { state: DataState<readonly Facility[]>; districtName: string }) {
  if (state.status !== "available") return <DataStateMessage state={state} />;
  const groups = publicFacilityGroups(state.value);
  return (
    <div className="flex flex-col gap-3">
      <h3 className="break-after-avoid font-bold">
        {districtName}の公共施設（{state.value.length.toLocaleString("ja-JP")}か所）
      </h3>
      {groups.map((group) => (
        <section key={group.subkind} className="flex flex-col gap-1">
          <h4 className="break-after-avoid text-sm font-bold">
            {group.subkind}（{group.items.length}か所）
          </h4>
          {group.subkind === "病院・診療所" && <p className="text-xs">{PUBLIC_MEDICAL_NOTE}</p>}
          <ul className="block divide-y divide-line">
            {group.items.map((facility, index) => (
              <li key={`${facility.name}-${index}`} className="break-inside-avoid py-1.5 text-sm">
                <span className="font-bold">{facility.name}</span>
                {facility.address && <span className="ml-2 text-xs text-ink-muted">{facility.address}</span>}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <InfoNote text={PUBLIC_FACILITY_NOTE} />
    </div>
  );
}
