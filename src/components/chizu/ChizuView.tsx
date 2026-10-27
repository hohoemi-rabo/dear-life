"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { use, useMemo, useState, type ReactNode } from "react";
import { DataSourceNote } from "@/components/data/DataSourceNote";
import { DataStateLegend } from "@/components/data/DataStateMessage";
import { DataBoundary } from "@/components/data/ScreenDataBoundary";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { ScreenSkeleton } from "@/components/ui/Skeleton";
import { DISTRICT_NAMES, DISTRICTS } from "@/lib/conditions/labels";
import type { Conditions } from "@/lib/conditions/model";
import { conditionsHref } from "@/lib/conditions/url";
import { useConditions } from "@/lib/conditions/useConditions";
import { GSI_TILES } from "@/lib/credits";
import type { SourceInfo } from "@/lib/data/screen-data";
import { karteBackHref, kurashiHref } from "@/lib/karte/links";
import { findPoint, pointFeatures, schoolDistrictFeatures, type MapSelection } from "@/lib/map/features";
import { clearMapDataCache, loadMapData } from "@/lib/map/load-map-data";
import { MAP_POINT_KINDS, type MapData, type MapPointKind } from "@/lib/map/map-data";
import { BASE_MAP_LABELS, POINT_STYLES, type BaseMap } from "@/lib/map/style";
import { pointKindSummary, schoolDistrictSummary, type LayerSummary } from "@/lib/map/summary";
import { NOTICES } from "@/lib/notices";
import { ERABU_PATH } from "@/lib/site";
import type { DistrictId } from "@/lib/town-district/resolve";
import { LazyMapCanvas } from "./LazyMapCanvas";

// 最初に出す種類。避難場所（4地区で155か所）と放課後児童クラブは点が多くなるので、切り替えで出す
const INITIALLY_VISIBLE: readonly MapPointKind[] = ["schools", "childcare", "bus_stops", "train_stations"];

// 05 地図（F-06）。施設を種類ごとに出し分け、点をタップすると名称・住所・出典を出す。小学校区は面で出し、距離は出さない。
// 最初は真上から見た平面で開き、「立体で見る」で地図を倒して起伏をつける。useSearchParams を使うので <Suspense> の中で使う
export function ChizuView() {
  const { conditions, setConditions } = useConditions();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold">地図で確かめる</h1>
        <p className="text-sm text-ink-muted">学校・保育施設・バス停・避難場所などの位置と、小学校区の範囲を地図で見られます。</p>
      </div>

      <DistrictSwitcher selected={conditions.district} onChange={(district) => setConditions({ district })} />

      <DataBoundary clearCache={clearMapDataCache} fallback={<ScreenSkeleton label="地図のデータを読み込んでいます" />}>
        <MapScreen focus={conditions.district} />
      </DataBoundary>

      <MapNavigation conditions={conditions} />
    </div>
  );
}

function useMapData(): MapData {
  return use(loadMapData());
}

// 地区の切り替え。選んだ地区へ地図を動かす（地区の範囲の線は持っていないので、場所を合わせるだけ）
function DistrictSwitcher({ selected, onChange }: { selected: DistrictId | null; onChange: (district: DistrictId) => void }) {
  return (
    <div role="group" aria-label="地図で見る地区" className="grid grid-cols-4 gap-2">
      {DISTRICTS.map(({ id, name }) => {
        const pressed = id === selected;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(id)}
            className={[
              "min-h-tap rounded-button border-2 px-1 py-2 text-sm font-bold",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              pressed ? "border-primary bg-primary-soft text-primary" : "border-line bg-surface hover:border-ink-muted",
            ].join(" ")}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}

function MapScreen({ focus }: { focus: DistrictId | null }) {
  const data = useMapData();
  const points = useMemo(() => pointFeatures(data), [data]);
  const schoolDistricts = useMemo(() => schoolDistrictFeatures(data), [data]);
  const [visibleKinds, setVisibleKinds] = useState<ReadonlySet<MapPointKind>>(() => new Set(INITIALLY_VISIBLE));
  const [showSchoolDistricts, setShowSchoolDistricts] = useState(true);
  const [tilted, setTilted] = useState(false);
  const [baseMap, setBaseMap] = useState<BaseMap>("standard");
  const [selected, setSelected] = useState<MapSelection | null>(null);

  const toggleKind = (kind: MapPointKind, visible: boolean) => {
    setVisibleKinds((current) => {
      const next = new Set(current);
      if (visible) next.add(kind);
      else next.delete(kind);
      return next;
    });
    // 見えなくした種類の点を選んだままにしない
    if (!visible && selected?.type === "point" && selected.point.kind === kind) setSelected(null);
  };

  const setFlat = () => {
    setTilted(false);
    // 航空写真は立体のときだけ選べる（要件 F-06）。平面に戻したら地図に戻す
    setBaseMap("standard");
  };

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_20rem] lg:items-start">
      <div className="flex flex-col gap-3">
        <ViewControls tilted={tilted} baseMap={baseMap} onTilt={() => setTilted(true)} onFlat={setFlat} onBaseMap={setBaseMap} />
        <div className="relative h-[60vh] min-h-[320px] overflow-hidden rounded-card border border-line lg:h-[70vh]">
          <LazyMapCanvas
            points={points}
            schoolDistricts={schoolDistricts}
            visibleKinds={visibleKinds}
            showSchoolDistricts={showSchoolDistricts}
            tilted={tilted}
            baseMap={baseMap}
            focus={focus}
            selected={selected}
            onSelect={setSelected}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Notice>{NOTICES.mapPosition}</Notice>
          <Notice>{NOTICES.mapOffline}</Notice>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <SelectionDetail data={data} selected={selected} />
        <LayerToggles
          data={data}
          visibleKinds={visibleKinds}
          onToggleKind={toggleKind}
          showSchoolDistricts={showSchoolDistricts}
          onToggleSchoolDistricts={(visible) => {
            setShowSchoolDistricts(visible);
            if (!visible && selected?.type === "schoolDistrict") setSelected(null);
          }}
          schoolDistricts={schoolDistricts.features.map((feature) => feature.properties)}
        />
        <PointList data={data} focus={focus} visibleKinds={visibleKinds} onSelect={setSelected} />
      </div>

      <Sources data={data} />
    </div>
  );
}

const SEGMENT =
  "min-h-tap rounded-button border-2 px-3 py-2 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

function segmentClass(pressed: boolean): string {
  return `${SEGMENT} ${pressed ? "border-primary bg-primary text-white" : "border-primary bg-surface text-primary hover:bg-primary-soft"}`;
}

// 平面⇔立体と、立体のときの下地（地図・航空写真）
function ViewControls({
  tilted,
  baseMap,
  onTilt,
  onFlat,
  onBaseMap,
}: {
  tilted: boolean;
  baseMap: BaseMap;
  onTilt: () => void;
  onFlat: () => void;
  onBaseMap: (baseMap: BaseMap) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {tilted ? (
        <button type="button" onClick={onFlat} className={segmentClass(false)}>
          平面に戻す
        </button>
      ) : (
        <button type="button" onClick={onTilt} className={segmentClass(false)}>
          立体で見る
        </button>
      )}
      {tilted && (
        <div role="group" aria-label="下地" className="flex gap-2">
          {(Object.keys(BASE_MAP_LABELS) as BaseMap[]).map((option) => (
            <button key={option} type="button" aria-pressed={baseMap === option} onClick={() => onBaseMap(option)} className={segmentClass(baseMap === option)}>
              {BASE_MAP_LABELS[option]}
            </button>
          ))}
        </div>
      )}
      {tilted && <p className="w-full text-xs text-ink-muted">動きが重いときは「平面に戻す」を押してください。</p>}
    </div>
  );
}

function summaryText(summary: LayerSummary): string {
  if (summary.status === "unavailable") return "データ未取得";
  if (summary.status === "none") return "該当なし";
  return `4地区で${summary.count}か所`;
}

function Swatch({ color, shape }: { color: string; shape: "dot" | "area" }) {
  return (
    <span
      aria-hidden="true"
      className={shape === "dot" ? "size-3.5 shrink-0 rounded-full border-2 border-white shadow" : "size-4 shrink-0 rounded-sm border-2"}
      style={shape === "dot" ? { backgroundColor: color } : { backgroundColor: `${color}2E`, borderColor: color }}
    />
  );
}

function ToggleRow({
  checked,
  onChange,
  swatch,
  label,
  note,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  swatch: ReactNode;
  label: string;
  note: string;
}) {
  return (
    <label className="flex min-h-tap cursor-pointer items-center gap-3 py-1">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-5 shrink-0 accent-primary" />
      {swatch}
      <span className="font-bold">{label}</span>
      <span className="ml-auto whitespace-nowrap text-xs text-ink-muted">{note}</span>
    </label>
  );
}

// 種類ごとの表示・非表示（F-06）と凡例
function LayerToggles({
  data,
  visibleKinds,
  onToggleKind,
  showSchoolDistricts,
  onToggleSchoolDistricts,
  schoolDistricts,
}: {
  data: MapData;
  visibleKinds: ReadonlySet<MapPointKind>;
  onToggleKind: (kind: MapPointKind, visible: boolean) => void;
  showSchoolDistricts: boolean;
  onToggleSchoolDistricts: (visible: boolean) => void;
  schoolDistricts: readonly { schoolName: string; color: string }[];
}) {
  return (
    <Card as="section" aria-labelledby="map-layers" className="flex flex-col gap-1">
      <h2 id="map-layers" className="text-lg font-bold">
        地図に出すもの
      </h2>
      <div className="flex flex-col divide-y divide-line">
        {MAP_POINT_KINDS.map((kind) => (
          <ToggleRow
            key={kind}
            checked={visibleKinds.has(kind)}
            onChange={(checked) => onToggleKind(kind, checked)}
            swatch={<Swatch color={POINT_STYLES[kind].color} shape="dot" />}
            label={POINT_STYLES[kind].label}
            note={summaryText(pointKindSummary(data, kind))}
          />
        ))}
        <div className="flex flex-col gap-1 py-1">
          <ToggleRow
            checked={showSchoolDistricts}
            onChange={onToggleSchoolDistricts}
            swatch={<Swatch color="#5F5B52" shape="area" />}
            label="小学校区"
            note={summaryText(schoolDistrictSummary(data))}
          />
          {showSchoolDistricts && schoolDistricts.length > 0 && (
            <ul aria-label="小学校区の色" className="flex flex-wrap gap-x-4 gap-y-1 pb-1 pl-8 text-sm">
              {schoolDistricts.map(({ schoolName, color }) => (
                <li key={schoolName} className="flex items-center gap-1.5">
                  <Swatch color={color} shape="area" />
                  {schoolName}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}

function sourceOf(data: MapData, selected: MapSelection): SourceInfo | null {
  const state =
    selected.type === "point"
      ? data.districts[selected.point.district].points[selected.point.kind]
      : data.districts[selected.district].elementarySchoolDistricts;
  return state.status === "unavailable" ? null : state.source;
}

// タップしたものの名称・住所・出典（F-06）
function SelectionDetail({ data, selected }: { data: MapData; selected: MapSelection | null }) {
  const point = selected?.type === "point" ? findPoint(data, selected.point) : null;
  const source = selected ? sourceOf(data, selected) : null;
  return (
    <Card as="section" aria-label="選んだ場所" aria-live="polite" className="flex flex-col gap-2">
      <h2 className="text-sm font-bold text-ink-muted">
        {selected === null ? "地図の点をタップ" : selected.type === "point" ? POINT_STYLES[selected.point.kind].label : "小学校区"}
      </h2>
      {selected === null && <p className="text-sm">点や色の付いた範囲をタップすると、名前・住所・出典が出ます。</p>}
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
          <Notice>{NOTICES.schoolDistrict}</Notice>
        </>
      )}
      {source && <DataSourceNote source={source} />}
    </Card>
  );
}

// 地図を使えない人・端末のための一覧。選んだ地区（なければ4地区）の、表示中の種類の施設を並べる
function PointList({
  data,
  focus,
  visibleKinds,
  onSelect,
}: {
  data: MapData;
  focus: DistrictId | null;
  visibleKinds: ReadonlySet<MapPointKind>;
  onSelect: (selection: MapSelection) => void;
}) {
  const districts = focus === null ? data.districtOrder : [focus];
  const groups = MAP_POINT_KINDS.filter((kind) => visibleKinds.has(kind)).map((kind) => ({
    kind,
    items: districts.flatMap((district) => {
      const state = data.districts[district].points[kind];
      return state.status === "available" ? state.value.map((point, index) => ({ point, district, index })) : [];
    }),
  }));
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);
  return (
    <details className="group rounded-card border border-line bg-surface shadow-card">
      <summary className="flex min-h-tap cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-bold [&::-webkit-details-marker]:hidden">
        <span>
          一覧で見る（{focus === null ? "4地区" : DISTRICT_NAMES[focus]}・{total}か所）
        </span>
        <span aria-hidden="true" className="text-ink-muted transition-transform group-open:rotate-90">
          ›
        </span>
      </summary>
      <div className="flex max-h-96 flex-col gap-3 overflow-y-auto border-t border-line px-4 py-3">
        {total === 0 && <p className="text-sm text-ink-muted">表示中の種類に、位置の分かる施設はありません。</p>}
        {groups
          .filter((group) => group.items.length > 0)
          .map(({ kind, items }) => (
            <section key={kind} aria-label={POINT_STYLES[kind].label}>
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <Swatch color={POINT_STYLES[kind].color} shape="dot" />
                {POINT_STYLES[kind].label}
              </h3>
              <ul className="flex flex-col">
                {items.map(({ point, district, index }) => (
                  <li key={`${district}-${index}`}>
                    <button
                      type="button"
                      onClick={() => onSelect({ type: "point", point: { kind, district, index } })}
                      className="min-h-tap w-full text-left text-sm text-primary underline underline-offset-4 hover:no-underline"
                    >
                      {point.name}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
      </div>
    </details>
  );
}

// 出典と、背景地図の出典（地理院タイル）
function Sources({ data }: { data: MapData }) {
  const sources = new Map<string, SourceInfo>();
  for (const summary of [...MAP_POINT_KINDS.map((kind) => pointKindSummary(data, kind)), schoolDistrictSummary(data)]) {
    if (summary.status !== "unavailable") sources.set(summary.source.id, summary.source);
  }
  return (
    <Card as="section" aria-labelledby="map-sources" className="flex flex-col gap-3 lg:col-span-2">
      <h2 id="map-sources" className="text-lg font-bold">
        出典と対象時点
      </h2>
      <DataStateLegend place="4地区" />
      <ul className="flex flex-col divide-y divide-line">
        {[...sources.values()].map((source) => (
          <li key={source.id} className="py-2">
            <DataSourceNote source={source} />
          </li>
        ))}
        <li className="flex flex-wrap items-center py-1 text-xs text-ink-muted">
          背景地図・航空写真・標高：
          <a href={GSI_TILES.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-tap items-center text-primary underline underline-offset-4">
            {GSI_TILES.name}
          </a>
        </li>
      </ul>
    </Card>
  );
}

// 下部：カルテ・くらしに戻る。地区を選んでいなければ、えらぶへ案内する
function MapNavigation({ conditions }: { conditions: Conditions }) {
  const searchParams = useSearchParams();
  if (conditions.district === null) {
    return (
      <nav aria-label="ほかの見方" className="flex flex-col items-center gap-3">
        <ButtonLink href={conditionsHref(ERABU_PATH, conditions)}>
          地区をえらんで、くらしを見る
          <span aria-hidden="true">→</span>
        </ButtonLink>
      </nav>
    );
  }
  return (
    <nav aria-label="ほかの見方" className="flex flex-col items-center gap-3">
      <ButtonLink href={karteBackHref(conditions, searchParams)} variant="secondary" className="w-full max-w-sm">
        <span aria-hidden="true">←</span>
        カルテに戻る
      </ButtonLink>
      <Link
        href={kurashiHref(conditions, searchParams)}
        className="inline-flex min-h-tap items-center justify-center gap-1 font-bold text-primary underline underline-offset-4 hover:no-underline"
      >
        くらしを見る
      </Link>
    </nav>
  );
}
