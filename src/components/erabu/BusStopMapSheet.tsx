"use client";

import { use, useMemo, useState } from "react";
import { DataSourceNote } from "@/components/data/DataSourceNote";
import { DataBoundary } from "@/components/data/ScreenDataBoundary";
import { LazyMapCanvas } from "@/components/chizu/LazyMapCanvas";
import { SelectionDetail } from "@/components/chizu/SelectionDetail";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { DISTRICT_NAMES } from "@/lib/conditions/labels";
import { GOOGLE_FLAT_MAP_CREDIT } from "@/lib/credits";
import { pointFeatures, type FeatureCollection, type MapSelection, type MultiPolygonGeometry, type SchoolDistrictProperties } from "@/lib/map/features";
import { clearMapDataCache, loadMapData } from "@/lib/map/load-map-data";
import type { MapPointKind } from "@/lib/map/map-data";
import { POINT_STYLES } from "@/lib/map/style";
import type { DistrictId } from "@/lib/town-district/resolve";

// 車0台を選んだとき、えらぶの画面のままバス停と駅を地図で見るシート（2026-11-19 まさゆきさん）。
// 地図の画面へ移ると車の質問に戻る道がなかったので、シートにして閉じれば戻れるようにした。
// 車を選ぶのに要るのはバス停の場所だけなので、選んだ地区のバス停と駅だけを平面で出す（立体・ほかの施設・一覧は出さない）
const KINDS: readonly MapPointKind[] = ["bus_stops", "train_stations"];
const VISIBLE_KINDS: ReadonlySet<MapPointKind> = new Set(KINDS);
// このシートは小学校区を出さないので、面は作らない（面をつなげる計算と polygon-clipping を、えらぶに読ませない。044）
const NO_SCHOOL_DISTRICTS: FeatureCollection<MultiPolygonGeometry, SchoolDistrictProperties> = { type: "FeatureCollection", features: [] };

export function BusStopMapSheet({ open, onClose, district }: { open: boolean; onClose: () => void; district: DistrictId }) {
  return (
    <BottomSheet open={open} onClose={onClose} title={`${DISTRICT_NAMES[district]}のバス停と駅`} variant="discovery" closeLabel="車の質問にもどる">
      <DataBoundary clearCache={clearMapDataCache} fallback={<MapSkeleton />}>
        <BusStopMap district={district} />
      </DataBoundary>
    </BottomSheet>
  );
}

const MAP_FRAME = "relative h-[45dvh] min-h-[260px] shrink-0 overflow-hidden rounded-card border border-line";

function MapSkeleton() {
  return (
    <div role="status" className={MAP_FRAME}>
      <span className="sr-only">地図のデータを読み込んでいます</span>
      <Skeleton className="h-full w-full rounded-none" />
    </div>
  );
}

function BusStopMap({ district }: { district: DistrictId }) {
  const data = use(loadMapData());
  // 選んだ地区の点だけにする（ほかの地区のバス停は出さない）
  const points = useMemo(() => {
    const all = pointFeatures(data);
    return { ...all, features: all.features.filter((feature) => feature.properties.district === district) };
  }, [data, district]);
  const [selected, setSelected] = useState<MapSelection | null>(null);
  const states = KINDS.map((kind) => ({ kind, state: data.districts[district].points[kind] }));

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {states.map(({ kind, state }) => (
          <li key={kind} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-3.5 shrink-0 rounded-full border-2 border-white shadow" style={{ backgroundColor: POINT_STYLES[kind].color }} />
            <span className="font-bold">{POINT_STYLES[kind].label}</span>
            <span>{state.status === "unavailable" ? "データ未取得" : state.status === "none" ? "該当なし" : `${state.value.length}か所`}</span>
          </li>
        ))}
      </ul>
      <div className={MAP_FRAME}>
        <LazyMapCanvas
          points={points}
          schoolDistricts={NO_SCHOOL_DISTRICTS}
          visibleKinds={VISIBLE_KINDS}
          showSchoolDistricts={false}
          tilted={false}
          focus={district}
          selected={selected}
          onSelect={setSelected}
        />
      </div>
      <SelectionDetail data={data} selected={selected} hint="点をタップすると、名前と住所が出ます。" />
      {/* 出典はシートでは目立たせず、押すと開く欄にする（2026-11-19 まさゆきさん。カルテの詳細の出典の欄と同じく最初は閉じる） */}
      <details className="group rounded-card border border-line bg-surface">
        <summary className="flex min-h-tap cursor-pointer list-none items-center justify-between gap-2 px-4 py-2 text-sm font-bold [&::-webkit-details-marker]:hidden">
          出典を見る
          <span aria-hidden="true" className="text-ink-muted transition-transform group-open:rotate-90">
            ›
          </span>
        </summary>
        <div className="flex flex-col gap-2 border-t border-line px-4 py-3">
          {states.map(({ kind, state }) => state.status !== "unavailable" && <DataSourceNote key={kind} source={state.source} />)}
          <p className="text-xs text-ink-muted">{GOOGLE_FLAT_MAP_CREDIT}</p>
        </div>
      </details>
    </div>
  );
}
