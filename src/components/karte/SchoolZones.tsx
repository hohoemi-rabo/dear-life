"use client";

import { useSearchParams } from "next/navigation";
import { useId, useState, type ReactNode } from "react";
import { DataStateMessage } from "@/components/data/DataStateMessage";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { usePrintMode } from "@/components/print/PrintMode";
import { ButtonLink } from "@/components/ui/Button";
import { useConditions } from "@/lib/conditions/useConditions";
import type { DataState } from "@/lib/data/screen-data";
import type { SchoolZoneGroup, SchoolZoneKind, SchoolZoneSummary, TownSchoolChoice } from "@/lib/karte/school-zones";
import { SEASON_PARAM } from "@/lib/kurashi/season";
import { facilityMapHref, schoolDistrictMapHref, type FacilityLayer } from "@/lib/map/links";
import { NOTICES } from "@/lib/notices";
import { NoticeBox, PanelTitle, PropIcon, SearchMark } from "./DetailCard";

// カルテの子育て・学校の「通う学校（学区）」のタブ（039。見本 karte-detail-childcare-uniform.png・karte-detail-childcare-split.png）。
// 通う学校は市の通学区域の規則の別表（町名 → 学校）から出す。
// どの町も同じ地区（上郷・鼎・伊賀良）は小学校・中学校の2枚の札、町によって分かれる地区（中心市街地）は町名を選ぶと2枚の札が出る

const KIND_NOTES: Readonly<Record<SchoolZoneKind, string | null>> = {
  single: null,
  choice: "どちらかを選べます",
  partial: "場所によって分かれます。番地を市で確かめてください",
};
const EDGE_NOTE = "となりの地区にある学校です";

function schools(names: readonly string[]): string {
  return names.join(" または ");
}

export function SchoolZonePanel({ state, districtName }: { state: DataState<SchoolZoneSummary>; districtName: string }) {
  if (state.status !== "available") {
    return (
      <div className="flex flex-col gap-3">
        <ZoneHead title={`${districtName}で通う学校`} />
        <DataStateMessage state={state} />
      </div>
    );
  }
  return state.value.uniform ? <UniformZone summary={state.value} districtName={districtName} /> : <SplitZones summary={state.value} />;
}

function ZoneHead({ title, description }: { title: string; description?: string }) {
  return <PanelTitle prop="childcare-zone-map" title={title} description={description} />;
}

function UniformZone({ summary, districtName }: { summary: SchoolZoneSummary; districtName: string }) {
  const [group] = summary.groups;
  const printing = usePrintMode();
  return (
    <div className="flex flex-col gap-3">
      <ZoneHead title={`${districtName}で通う学校`} description={`${districtName}では、どの町に住んでも同じ学校に通います。`} />
      <SchoolCards elementarySchools={group.elementarySchools} juniorHighSchools={group.juniorHighSchools} />
      <div className="grid gap-2 md:grid-cols-2 md:items-start">
        <SchoolDistrictMapLink />
        <Disclosure title={printing ? "対象の町名" : "対象の町名を見る"} open={printing}>
          <p className="text-sm">{group.towns.join("、")}</p>
        </Disclosure>
      </div>
      <NoticeBox title={NOTICES.schoolDistrict} />
    </div>
  );
}

function SplitZones({ summary }: { summary: SchoolZoneSummary }) {
  // 紙では町名を選べないので、すべての町名と学区の表を開いて出す（2026-11-12 まさゆきさん）
  const printing = usePrintMode();
  return (
    <div className="flex flex-col gap-3">
      <ZoneHead
        title="町名から学区を調べる"
        description={printing ? "町名ごとに、通う公立の小学校・中学校が決まっています。" : "住まいの候補がある町を選ぶと、通う公立の小学校・中学校が分かります。"}
      />
      {!printing && <TownPicker towns={summary.towns} />}
      <NoticeBox title={NOTICES.schoolDistrict} />
      <Disclosure title={printing ? "すべての町名と学区" : "すべての町名と学区を見る"} open={printing}>
        <AllZones summary={summary} />
      </Disclosure>
    </div>
  );
}

// 町名を選ぶ欄（スマホの標準の選択。丁目ごとに別の行で、並びは別表の順。はじめは何も選ばない。2026-11-12 まさゆきさん）
function TownPicker({ towns }: { towns: readonly TownSchoolChoice[] }) {
  const selectId = useId();
  const [townName, setTownName] = useState("");
  const town = towns.find((item) => item.townName === townName) ?? null;
  return (
    <>
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
        <div className="flex flex-1 items-center gap-2">
          <label htmlFor={selectId} className="flex min-h-tap shrink-0 items-center rounded-button bg-kinari-deep px-3 text-sm font-bold">
            町名
          </label>
          <div className="relative min-w-0 flex-1">
            <SearchMark />
            <select
              id={selectId}
              value={townName}
              onChange={(event) => setTownName(event.target.value)}
              className="min-h-tap w-full appearance-none rounded-button border border-line bg-surface py-2 pl-9 pr-9 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <option value="">町名を選んでください</option>
              {towns.map((item) => (
                <option key={item.townName} value={item.townName}>
                  {item.townName}
                </option>
              ))}
            </select>
            <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted">
              ⌄
            </span>
          </div>
        </div>
        <SchoolDistrictMapLink />
      </div>
      <div aria-live="polite" className="rounded-card bg-primary-soft p-3 md:p-4">
        {town === null ? (
          <p className="py-4 text-center text-sm text-ink-muted">町名を選ぶと、ここに学校が出ます</p>
        ) : (
          <div className="flex flex-col gap-2">
            <h3 className="flex items-center gap-2 text-lg font-extrabold">
              <PixelIcon icon="icon-school" />
              {town.townName}の学区
            </h3>
            <SchoolCards elementarySchools={town.elementarySchools} juniorHighSchools={town.juniorHighSchools} framed={false} />
            {(KIND_NOTES[town.kind] || town.edge) && (
              <p className="text-sm font-bold text-kind-local">※{[KIND_NOTES[town.kind], town.edge ? EDGE_NOTE : null].filter(Boolean).join("。")}</p>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// 小学校・中学校の2枚の札（学校名を大きく）。framed のときは薄い緑の枠で囲む
function SchoolCards({
  elementarySchools,
  juniorHighSchools,
  framed = true,
}: {
  elementarySchools: readonly string[];
  juniorHighSchools: readonly string[];
  framed?: boolean;
}) {
  return (
    <div className={`grid gap-2 md:grid-cols-2 md:gap-3 ${framed ? "rounded-card bg-primary-soft p-3 md:p-4" : ""}`}>
      <SchoolCard label="小学校" names={elementarySchools} />
      <SchoolCard label="中学校" names={juniorHighSchools} />
    </div>
  );
}

function SchoolCard({ label, names }: { label: string; names: readonly string[] }) {
  return (
    <div className="flex break-inside-avoid flex-col items-start gap-1 rounded-button border border-line bg-surface px-4 py-3">
      <span className="flex items-center gap-1 rounded-button bg-warm-soft px-2 py-0.5 text-xs font-bold">
        <PixelIcon icon="icon-school" size="sm" />
        {label}
      </span>
      {/* 2校から選べる町は「浜井場小学校 または 丸山小学校」。学校名の途中で折り返さない */}
      <p className="flex flex-wrap items-baseline gap-x-2 text-2xl font-extrabold md:text-3xl">
        {names.map((name, index) => (
          <span key={name} className="flex items-baseline gap-x-2">
            {index > 0 && <span className="text-base font-bold">または</span>}
            <span className="whitespace-nowrap">{name}</span>
          </span>
        ))}
      </p>
    </div>
  );
}

// 閉じた欄（「対象の町名を見る」「すべての町名と学区を見る」）
function Disclosure({ title, open = false, children }: { title: string; open?: boolean; children: ReactNode }) {
  return (
    <details open={open} className="group rounded-button border border-line bg-surface">
      <summary className="flex min-h-tap cursor-pointer list-none items-center gap-2 px-3 font-bold [&::-webkit-details-marker]:hidden">
        <ListMark />
        <span className="flex-1">{title}</span>
        <span aria-hidden="true" className="text-primary transition-transform group-open:rotate-180 print:hidden">
          ⌄
        </span>
      </summary>
      <div className="flex flex-col gap-3 border-t border-line p-3">{children}</div>
    </details>
  );
}

function ListMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 shrink-0" fill="currentColor">
      <rect x="2" y="4" width="2.5" height="2.5" rx="0.5" />
      <rect x="2" y="8.75" width="2.5" height="2.5" rx="0.5" />
      <rect x="2" y="13.5" width="2.5" height="2.5" rx="0.5" />
      <rect x="6.5" y="4.5" width="11.5" height="1.6" rx="0.8" />
      <rect x="6.5" y="9.2" width="11.5" height="1.6" rx="0.8" />
      <rect x="6.5" y="13.9" width="11.5" height="1.6" rx="0.8" />
    </svg>
  );
}

// すべての町名と学区（同じ学校の組み合わせの町をまとめた表と、地区の端の町）
function AllZones({ summary }: { summary: SchoolZoneSummary }) {
  return (
    <>
      <ZoneTable caption="町ごとの通う小学校・中学校" groups={summary.groups} />
      {summary.edgeGroups.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="break-after-avoid font-bold">地区の端の町</h3>
          <p className="text-sm">となりの地区にある学校に通う町です（地区の学校の数には入れていません）。</p>
          <ZoneTable caption="地区の端の町の通う小学校・中学校" groups={summary.edgeGroups} />
        </div>
      )}
    </>
  );
}

// PC は表（小学校｜中学校｜町）、スマホは組み合わせごとのカードを縦に並べる。印刷は表
function ZoneTable({ caption, groups }: { caption: string; groups: readonly SchoolZoneGroup[] }) {
  return (
    <>
      <table className="hidden w-full text-left text-sm md:table print:table">
        <caption className="sr-only">{caption}</caption>
        <thead className="text-xs text-ink-muted">
          <tr>
            <th scope="col" className="w-[24%] py-1 pr-3 font-normal">
              小学校
            </th>
            <th scope="col" className="w-[20%] py-1 pr-3 font-normal">
              中学校
            </th>
            <th scope="col" className="py-1 font-normal">
              町
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {groups.map((group) => (
            <tr key={group.towns.join("、")} className="break-inside-avoid align-top">
              <td className="py-2 pr-3 font-bold">{schools(group.elementarySchools)}</td>
              <td className="py-2 pr-3 font-bold">{schools(group.juniorHighSchools)}</td>
              <td className="py-2">
                {group.towns.join("、")}
                {KIND_NOTES[group.kind] && <KindNote kind={group.kind} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul aria-label={caption} className="flex flex-col gap-2 md:hidden print:hidden">
        {groups.map((group) => (
          <li key={group.towns.join("、")} className="flex flex-col gap-1 rounded-button bg-kinari px-3 py-2 text-sm">
            <p>
              <span className="text-xs text-ink-muted">小学校 </span>
              <span className="font-bold">{schools(group.elementarySchools)}</span>
            </p>
            <p>
              <span className="text-xs text-ink-muted">中学校 </span>
              <span className="font-bold">{schools(group.juniorHighSchools)}</span>
            </p>
            <p>
              <span className="text-xs text-ink-muted">町 </span>
              {group.towns.join("、")}
            </p>
            {KIND_NOTES[group.kind] && <KindNote kind={group.kind} />}
          </li>
        ))}
      </ul>
    </>
  );
}

function KindNote({ kind }: { kind: SchoolZoneKind }) {
  return <span className="mt-1 block text-xs font-bold text-kind-local">※{KIND_NOTES[kind]}</span>;
}

// 地図を学区の塗り分けを付けた状態で開く。紙では押せないので出さない
function SchoolDistrictMapLink() {
  const { conditions } = useConditions();
  const searchParams = useSearchParams();
  return (
    <ButtonLink href={schoolDistrictMapHref(conditions, searchParams.get(SEASON_PARAM))} variant="secondary" className="print:hidden">
      <PropIcon prop="childcare-map-button" className="size-5" />
      学区の範囲を地図で見る
      <span aria-hidden="true">→</span>
    </ButtonLink>
  );
}

// 地区の学校・保育園など・放課後クラブのタブの「地図で場所を見る」（その種類の施設だけを出して開く。039）。紙では押せないので出さない
export function FacilityMapLink({ layer }: { layer: FacilityLayer }) {
  const { conditions } = useConditions();
  const searchParams = useSearchParams();
  return (
    <ButtonLink href={facilityMapHref(conditions, searchParams.get(SEASON_PARAM), layer)} variant="secondary" className="self-start print:hidden">
      <PropIcon prop="childcare-map-button" className="size-5" />
      地図で場所を見る
      <span aria-hidden="true">→</span>
    </ButtonLink>
  );
}
