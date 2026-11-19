"use client";

import { DataSourceNote } from "@/components/data/DataSourceNote";
import { Card } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { DISTRICT_NAMES } from "@/lib/conditions/labels";
import type { SourceInfo } from "@/lib/data/screen-data";
import { findPoint, type MapSelection } from "@/lib/map/features";
import type { MapData } from "@/lib/map/map-data";
import { POINT_STYLES } from "@/lib/map/style";
import { NOTICES } from "@/lib/notices";

// 地図の画面（021）と、えらぶの車の質問のバス停の地図のシートで使う
function sourceOf(data: MapData, selected: MapSelection): SourceInfo | null {
  const state =
    selected.type === "point"
      ? data.districts[selected.point.district].points[selected.point.kind]
      : data.districts[selected.district].elementarySchoolDistricts;
  return state.status === "unavailable" ? null : state.source;
}

// タップしたものの名称・住所・出典（F-06）
export function SelectionDetail({
  data,
  selected,
  hint = "点や色の付いた範囲をタップすると、名前・住所・出典が出ます。",
}: {
  data: MapData;
  selected: MapSelection | null;
  hint?: string;
}) {
  const point = selected?.type === "point" ? findPoint(data, selected.point) : null;
  const source = selected ? sourceOf(data, selected) : null;
  return (
    <Card as="section" aria-label="選んだ場所" aria-live="polite" className="flex flex-col gap-2">
      <h2 className="text-sm font-bold text-ink-muted">
        {selected === null ? "地図の点をタップ" : selected.type === "point" ? POINT_STYLES[selected.point.kind].label : "小学校区"}
      </h2>
      {selected === null && <p className="text-sm">{hint}</p>}
      {selected?.type === "point" && point && (
        <>
          <p className="text-lg font-bold">{point.name}</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            {point.subkind && (
              <>
                <dt className="text-ink-muted">区分</dt>
                <dd>{point.subkind}</dd>
              </>
            )}
            <dt className="text-ink-muted">住所</dt>
            <dd>{point.address ?? "出典に記載なし"}</dd>
            <dt className="text-ink-muted">地区</dt>
            <dd>{DISTRICT_NAMES[selected.point.district]}</dd>
          </dl>
        </>
      )}
      {selected?.type === "schoolDistrict" && (
        <>
          <p className="text-lg font-bold">{selected.schoolName}の学区</p>
          <p className="text-sm">学校がある地区：{DISTRICT_NAMES[selected.district]}</p>
          <Notice>{NOTICES.schoolDistrictMap}</Notice>
          <Notice>{NOTICES.schoolDistrict}</Notice>
        </>
      )}
      {source && <DataSourceNote source={source} />}
    </Card>
  );
}
