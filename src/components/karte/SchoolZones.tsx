"use client";

import { useSearchParams } from "next/navigation";
import { DataStateMessage } from "@/components/data/DataStateMessage";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { ButtonLink } from "@/components/ui/Button";
import { useConditions } from "@/lib/conditions/useConditions";
import type { DataState } from "@/lib/data/screen-data";
import type { SchoolZoneGroup, SchoolZoneSummary } from "@/lib/karte/school-zones";
import { SEASON_PARAM } from "@/lib/kurashi/season";
import { schoolDistrictMapHref } from "@/lib/map/links";
import { BigCount } from "./DetailCard";

// カルテの子育て・学校の「学区」のタブ（039）。通う学校は市の通学区域の規則の別表（町名 → 学校）から出す。
// 学校のタブの「地区にある学校」（高校なども入る）とは数えるものが違うので、見出しで分ける

// 「（学区）」の途中で折り返さないようにする（スマホの幅で「（学／区）」になった）
export function SchoolZoneTitle() {
  return (
    <>
      この地区の子が通う学校<span className="whitespace-nowrap">（学区）</span>
    </>
  );
}
export const SCHOOL_ZONE_MEANING = "学区：住む場所によって、通う公立の小学校・中学校が決まる範囲です。";

const KIND_NOTES: Readonly<Record<SchoolZoneGroup["kind"], string | null>> = {
  single: null,
  choice: "どちらかを選べます",
  partial: "場所によって分かれます。番地を市で確かめてください",
};

// 大きい数字：「2校　小学校1・中学校1」
export function SchoolZoneFigure({ state }: { state: DataState<SchoolZoneSummary> }) {
  if (state.status !== "available") return <DataStateMessage state={state} />;
  const { elementarySchools, juniorHighSchools } = state.value;
  return (
    <BigCount
      count={elementarySchools.length + juniorHighSchools.length}
      unit="校"
      after={<span className="text-sm">{`小学校${elementarySchools.length}・中学校${juniorHighSchools.length}`}</span>}
    />
  );
}

export function SchoolZoneList({ state }: { state: DataState<SchoolZoneSummary> }) {
  return (
    <section className="flex flex-col gap-3 border-t border-line pt-3">
      <p className="text-sm">{SCHOOL_ZONE_MEANING}</p>
      {state.status === "available" && (state.value.uniform ? <UniformZone summary={state.value} /> : <SplitZones summary={state.value} />)}
      <SchoolDistrictMapLink />
    </section>
  );
}

function UniformZone({ summary }: { summary: SchoolZoneSummary }) {
  const [group] = summary.groups;
  return (
    <div className="flex flex-col gap-2">
      <p className="font-bold">地区の中は、どの町も同じ学校です。</p>
      <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1 rounded-button bg-kinari px-3 py-2">
        <dt className="text-sm text-ink-muted">小学校</dt>
        <dd className="text-lg font-bold">{group.elementarySchools.join("・")}</dd>
        <dt className="text-sm text-ink-muted">中学校</dt>
        <dd className="text-lg font-bold">{group.juniorHighSchools.join("・")}</dd>
        <dt className="text-sm text-ink-muted">町</dt>
        <dd className="text-sm">{group.towns.join("、")}</dd>
      </dl>
    </div>
  );
}

function SplitZones({ summary }: { summary: SchoolZoneSummary }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="font-bold">町によって通う学校が分かれます。</p>
      <ZoneTable caption="町ごとの通う小学校・中学校" groups={summary.groups} />
      {summary.edgeGroups.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="break-after-avoid font-bold">地区の端の町</h3>
          <p className="text-sm">となりの地区にある学校に通う町です（上の学校の数には入れていません）。</p>
          <ZoneTable caption="地区の端の町の通う小学校・中学校" groups={summary.edgeGroups} />
        </div>
      )}
    </div>
  );
}

function schools(names: readonly string[]): string {
  return names.join(" または ");
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

function KindNote({ kind }: { kind: SchoolZoneGroup["kind"] }) {
  return <span className="mt-1 block text-xs font-bold text-kind-local">※{KIND_NOTES[kind]}</span>;
}

// 地図を学区の塗り分けを付けた状態で開く。紙では押せないので出さない
function SchoolDistrictMapLink() {
  const { conditions } = useConditions();
  const searchParams = useSearchParams();
  return (
    <ButtonLink href={schoolDistrictMapHref(conditions, searchParams.get(SEASON_PARAM))} variant="secondary" className="self-start print:hidden">
      <PixelIcon icon="icon-map" size="sm" />
      学区の範囲を地図で見る
      <span aria-hidden="true">→</span>
    </ButtonLink>
  );
}
