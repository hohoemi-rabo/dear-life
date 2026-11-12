"use client";

import { DataStateMessage } from "@/components/data/DataStateMessage";
import type { DataState, Facility } from "@/lib/data/screen-data";
import type { PropId } from "@/lib/illust/assets";
import { childcareGroups, facilityCountSentence } from "@/lib/karte/facilities";
import type { FacilityLayer } from "@/lib/map/links";
import { NoticeBox, PanelTitle } from "./DetailCard";
import { FacilityMapLink } from "./SchoolZones";

// カルテの子育て・学校の「地区の学校」「保育園など」「放課後クラブ」のタブ（039 プラン 8。2026-11-13 まさゆきさん）。
// 「通う学校（学区）」のタブと同じ形：印・見出し・一行の説明（件数と内訳）→ 薄い緑の枠の中に1か所ずつの白い札 → 地図へのボタン。
// 件数は 2〜13 なので、開け閉めはせずに全部出す（一度に見えるほうが比べやすい）
export function ChildcareFacilityPanel({
  state,
  prop,
  title,
  unit,
  layer,
  notice,
}: {
  state: DataState<readonly Facility[]>;
  prop: PropId;
  title: string;
  unit: string;
  layer: FacilityLayer;
  notice?: string;
}) {
  if (state.status !== "available") {
    return (
      <div className="flex flex-col gap-3">
        <PanelTitle prop={prop} title={title} />
        <DataStateMessage state={state} />
      </div>
    );
  }
  const facilities = state.value;
  // 種類ごとにまとめて、小学校 → 中学校 → 高等学校、保育所 → こども園 → その他 の順に並べる。
  // 種類が1つだけ（放課後クラブなど）なら、どの札も同じなので種類の札は出さない
  const groups = childcareGroups(facilities);
  const ordered = groups.flatMap((group) => group.items);
  const showSubkind = groups.length >= 2;
  return (
    <div className="flex flex-col gap-3">
      <PanelTitle prop={prop} title={title} description={facilityCountSentence(facilities, unit)} />
      {facilities.length > 0 && (
        <ul aria-label={title} className="grid gap-2 rounded-card bg-primary-soft p-3 md:grid-cols-2 md:gap-3 md:p-4 print:grid-cols-2">
          {ordered.map((facility, index) => (
            <FacilityCard key={`${facility.name}-${index}`} facility={facility} showSubkind={showSubkind} />
          ))}
        </ul>
      )}
      {facilities.length > 0 && <FacilityMapLink layer={layer} />}
      {notice && <NoticeBox title={notice} />}
    </div>
  );
}

function FacilityCard({ facility, showSubkind }: { facility: Facility; showSubkind: boolean }) {
  return (
    <li className="flex break-inside-avoid flex-col items-start gap-1 rounded-button border border-line bg-surface px-4 py-3">
      {showSubkind && facility.subkind && <span className="rounded-button bg-warm-soft px-2 py-0.5 text-xs font-bold">{facility.subkind}</span>}
      <p className="text-lg font-extrabold md:text-xl">{facility.name}</p>
      {facility.address && <p className="text-xs text-ink-muted">{facility.address}</p>}
    </li>
  );
}
