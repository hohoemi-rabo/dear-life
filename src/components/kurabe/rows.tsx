import type { ReactNode } from "react";
import { DataStateLabel } from "@/components/data/DataStateMessage";
import { CountBadge } from "@/components/ui/CountBadge";
import { SEASONS } from "@/lib/conditions/scene";
import { EVENTS_CREDIT } from "@/lib/credits";
import type { DataState, DistrictData, MarketStat } from "@/lib/data/screen-data";
import { SQUARE_METER, formatManYen } from "@/lib/format";
import { renterSharePercent } from "@/lib/housing/rent";
import { EXAMPLE_LAND_AREA, landEstimates, MARKET_CATEGORY_LABELS } from "@/lib/karte/housing";
import { ageShares } from "@/lib/karte/facilities";
import { districtSchoolZones, type SchoolZoneSummary } from "@/lib/karte/school-zones";
import { busiestStation, hasServiceTimes, trainTrips } from "@/lib/karte/train";
import { eventLabel, FACILITY_COUNT_ROWS } from "@/lib/kurabe/compare";
import { NOTICES } from "@/lib/notices";

import type { CompareTopic } from "@/lib/kurabe/compare";
import type { KurabeIconName } from "./KurabeIcon";

// マスの大きさ。compact はすべての項目の一覧、large は PC のタブの表、pair はスマホのタブの中（見本。数字を大きく出す）
export type CellSize = "compact" | "large" | "pair";

// 地区くらべの項目（要件 3章の表・F-05）。タブの中も一覧も、スマホも PC も、この行をそのまま使う
export type CompareRow = {
  id: string;
  label: string;
  note?: string;
  // スマホの2地区の比較で、項目名の横に添える短い説明
  unit?: string;
  // 値が数字1つだけの行。スマホでは 2×2 に詰めて、画面が長くなりすぎないようにする
  short?: boolean;
  cell: (district: DistrictData, size: CellSize) => ReactNode;
};
export type CompareSection = { id: string; title: string; rows: readonly CompareRow[]; notice?: string };

function stateCell<T>(state: DataState<T>, render: (value: T) => ReactNode): ReactNode {
  return state.status === "available" ? render(state.value) : <DataStateLabel state={state} />;
}

// 値段だけを大きく出すので、値段用のフォントにする（027）。タブの表では「万円」を数字より小さくする（028 見本）
function Price({ yen, size, perUnit }: { yen: number; size: CellSize; perUnit?: boolean }) {
  const text = formatManYen(yen);
  if (size === "compact") {
    return (
      <span className="price-figure block text-xl">
        {text}
        {perUnit && <span className="font-sans text-sm font-bold">／{SQUARE_METER}</span>}
      </span>
    );
  }
  return (
    <span className={`price-figure block whitespace-nowrap leading-tight ${size === "large" ? "text-[2rem]" : "text-[1.375rem] min-[360px]:text-[1.625rem]"}`}>
      {text.replace(/万円$/, "")}
      <span className={size === "large" ? "text-xl" : "text-base"}>万円</span>
      {perUnit && <span className={`ml-1 font-sans font-bold ${size === "large" ? "text-base" : "text-sm"}`}>/ {SQUARE_METER}</span>}
    </span>
  );
}

// 土地は㎡単価の真ん中の値と幅（下位25%〜上位25%）。伊賀良のように幅が広い地区でも幅は省略しない（要件 5.1）。
// タブの表も押さずに読めるように幅をそのまま出す（2026-11-05 まさゆきさん決定）
function LandCell({ stat, size }: { stat: MarketStat; size: CellSize }) {
  const range = stat.p25 !== null && stat.p75 !== null && (
    <span className="text-sm tabular-nums">
      <span className="text-ink-muted">幅 </span>
      {formatManYen(stat.p25)}〜{formatManYen(stat.p75)}
    </span>
  );
  const big = size !== "compact";
  return (
    <span className="flex flex-col gap-1">
      <Price yen={stat.median} size={size} perUnit />
      {!big && range}
      <CountBadge count={stat.sampleCount} outlined={big} prefix={size === "pair" ? "取引" : ""} tight={size === "pair"} />
      {big && range}
      {big && (
        // ㎡単価だけでは土地全体の値段が分かりにくいので、広さをそろえた目安を添える（2026-11-05 まさゆきさん）
        <span className="text-sm">
          <span className="text-ink-muted">
            {EXAMPLE_LAND_AREA}
            {SQUARE_METER}（約60坪）なら{" "}
          </span>
          <span className="whitespace-nowrap font-bold tabular-nums">約{formatManYen(landEstimates(stat.median).forExampleArea)}</span>
        </span>
      )}
    </span>
  );
}

function HouseCell({ stat, size }: { stat: MarketStat; size: CellSize }) {
  return (
    <span className="flex flex-col gap-1">
      <Price yen={stat.median} size={size} />
      <CountBadge count={stat.sampleCount} outlined={size !== "compact"} prefix={size === "pair" ? "取引" : ""} tight={size === "pair"} />
    </span>
  );
}

function CountValue({ count, unit, size }: { count: number; unit: string; size: CellSize }) {
  return (
    <span className="font-bold tabular-nums">
      <span className={{ compact: "text-xl", large: "text-3xl font-extrabold", pair: "text-2xl font-extrabold" }[size]}>{count.toLocaleString("ja-JP")}</span>
      <span className={size === "compact" ? "ml-0.5 text-sm" : "ml-1 text-base"}>{unit}</span>
    </span>
  );
}

// 借りて住む人がどれくらいいるか（034）。家賃は飯田市全体の値で地区ごとにないので、地区くらべには出さない。
// 割合は「借りやすさ」ではなく事実として出す（点数化しない）
const RENTER_ROW: CompareRow = {
  id: "private-rented",
  label: "民営の借家に住む世帯",
  note: "住宅に住む世帯のうち、民営の借家に住む世帯の数と割合。",
  unit: "世帯",
  cell: (district, size) =>
    stateCell(district.housingTenure, (tenure) => (
      <span className="flex flex-col">
        <CountValue count={tenure.privateRented} unit="世帯" size={size} />
        <span className="text-sm tabular-nums">
          <span className="text-ink-muted">住宅に住む世帯の </span>
          <span className="font-bold">約{renterSharePercent(tenure)}%</span>
        </span>
      </span>
    )),
};

const MARKET_ROWS: readonly CompareRow[] = [
  {
    id: "land",
    label: MARKET_CATEGORY_LABELS.land,
    note: `1${SQUARE_METER}あたりの真ん中の値。`,
    unit: `1${SQUARE_METER}あたり`,
    cell: (district, size) => stateCell(district.market.land, (stat) => <LandCell stat={stat} size={size} />),
  },
  {
    id: "house-within-20y",
    label: MARKET_CATEGORY_LABELS.house_built_within_20y,
    note: "総額の真ん中の値。",
    unit: "総額",
    cell: (district, size) => stateCell(district.market.house_built_within_20y, (stat) => <HouseCell stat={stat} size={size} />),
  },
  {
    id: "house-over-20y",
    label: MARKET_CATEGORY_LABELS.house_built_over_20y,
    note: "総額の真ん中の値。",
    unit: "総額",
    cell: (district, size) => stateCell(district.market.house_built_over_20y, (stat) => <HouseCell stat={stat} size={size} />),
  },
];

// 通う学校は市の通学区域の規則の別表から出す（039）。町によって分かれる地区（中心市街地）は、その一言を添える。
// 地区の端の町（八幡町・育良町）の学校は、カルテと同じく入れない（くわしくはカルテの学区のタブ）
function schoolNames(summary: SchoolZoneSummary, pick: (summary: SchoolZoneSummary) => readonly string[], size: CellSize): ReactNode {
  return (
    <>
      <span className={`font-bold ${size === "large" ? "text-lg" : ""}`}>{pick(summary).join("・")}</span>
      {!summary.uniform && <span className="block text-xs text-ink-muted">町によって分かれます</span>}
    </>
  );
}

const SCHOOL_DISTRICT_ROWS: readonly CompareRow[] = [
  {
    id: "elementary",
    label: "通う小学校（学区）",
    cell: (district, size) => stateCell(districtSchoolZones(district), (summary) => schoolNames(summary, (s) => s.elementarySchools, size)),
  },
  {
    id: "junior-high",
    label: "通う中学校（学区）",
    cell: (district, size) => stateCell(districtSchoolZones(district), (summary) => schoolNames(summary, (s) => s.juniorHighSchools, size)),
  },
];

const FACILITY_ROWS: readonly (CompareRow & { topic: "school" | "transport" })[] = FACILITY_COUNT_ROWS.map((row) => ({
  id: row.id,
  label: row.label,
  topic: row.topic,
  short: true,
  cell: (district: DistrictData, size: CellSize) =>
    stateCell(row.pick(district), (facilities) => <CountValue count={facilities.length} unit="か所" size={size} />),
}));

// 電車の本数（031）。地区の中でいちばん本数の多い駅の、上り・下りの合計（カルテの電車の大きい数字と同じ）。
// 時刻が公開されるまでは全国鉄道運行本数データの平日の本数なので、そのときは「平日」と添える
const TRAIN_ROW: CompareRow = {
  id: "train-trips",
  label: "電車の本数",
  note: "地区の駅を出る1日の本数（上り・下りの合計。特急を除く）。",
  unit: "1日",
  cell: (district, size) =>
    stateCell(trainTrips(district), (rows) => {
      const busiest = busiestStation(rows);
      if (!busiest) return null;
      return (
        <span className="flex flex-col">
          <CountValue count={busiest.trips} unit="本" size={size} />
          <span className="text-xs text-ink-muted">
            {busiest.tied ? `${busiest.stationCount}駅とも` : `${busiest.stationName}駅`}
            {hasServiceTimes(rows) ? "" : "・平日"}
          </span>
        </span>
      );
    }),
};

const TRANSPORT_ROWS: readonly CompareRow[] = FACILITY_ROWS.flatMap((row) =>
  row.topic !== "transport" ? [] : row.id === "train-stations" ? [row, TRAIN_ROW] : [row],
);

const POPULATION_ROWS: readonly CompareRow[] = [
  {
    id: "total",
    label: "地区の人口",
    short: true,
    cell: (district, size) => stateCell(district.population, (population) => <CountValue count={population.total} unit="人" size={size} />),
  },
  {
    id: "ages",
    label: "年齢3区分の割合",
    cell: (district, size) =>
      stateCell(district.population, (population) => (
        <span className={`flex flex-col tabular-nums ${size === "large" ? "gap-1 text-base" : size === "pair" ? "gap-1 text-sm" : "text-sm"}`}>
          {ageShares(population).map((share) => (
            <span key={share.label}>
              <span className="text-ink-muted">{share.label} </span>
              <span className="font-bold">{share.percent}%</span>
            </span>
          ))}
        </span>
      )),
  },
];

// まだ集めていない季節は「準備中」と出し、作り話で埋めない（F-13）
const EVENT_ROWS: readonly CompareRow[] = SEASONS.map((season) => ({
  id: `events-${season}`,
  label: season,
  cell: (district: DistrictData) => {
    const events = district.events.filter((event) => event.season === season);
    if (events.length === 0) return <span className="text-sm text-ink-muted">この季節の行事は準備中です</span>;
    return (
      <ul className="flex flex-col gap-0.5 text-sm">
        {events.map((event) => (
          <li key={eventLabel(event)}>{eventLabel(event)}</li>
        ))}
      </ul>
    );
  },
}));

// すべての項目の一覧（スマホ・PC）
export const COMPARE_SECTIONS: readonly CompareSection[] = [
  { id: "market", title: "住まいの相場", notice: NOTICES.market, rows: [...MARKET_ROWS, RENTER_ROW] },
  { id: "school-districts", title: "主な学区", notice: NOTICES.schoolDistrict, rows: SCHOOL_DISTRICT_ROWS },
  { id: "facilities", title: "施設の数", rows: FACILITY_ROWS },
  { id: "trains", title: "電車", rows: [TRAIN_ROW] },
  { id: "population", title: "人口", rows: POPULATION_ROWS },
  { id: "events", title: "季節ごとの主な行事", notice: EVENTS_CREDIT, rows: EVENT_ROWS },
];

// タブ（028 見本 docs/design/kurabe-pc.png）。一度に読む項目を絞る
export type CompareTopicContent = {
  id: CompareTopic;
  tabLabel: string;
  // スマホのタブでは省く、ラベルの後ろの部分（見本は「交通・防災」）
  tabLabelRest?: string;
  icon: KurabeIconName;
  title: string;
  lead: string;
  // スマホの見本で違う言い方のとき
  leadMobile?: string;
  rows: readonly CompareRow[];
  notices: readonly string[];
  sourcesTitle: string;
  // 下の帯。次のタブへ案内する文（最後のタブは最初のタブへ）
  nextText: string;
};

export const COMPARE_TOPIC_CONTENTS: readonly CompareTopicContent[] = [
  {
    id: "housing",
    tabLabel: "住まい",
    icon: "home",
    title: "住まいの相場",
    lead: "過去の取引からみた参考値",
    leadMobile: "過去の取引の真ん中の値",
    rows: [...MARKET_ROWS, RENTER_ROW],
    notices: [NOTICES.market, NOTICES.marketFewCount],
    sourcesTitle: "出典・対象期間・集計方法",
    nextText: "次は、学校や交通も同じ4地区で比べられます。",
  },
  {
    id: "school",
    tabLabel: "学校・子育て",
    icon: "school",
    title: "学校・子育て",
    lead: "学区と、学校・保育の数",
    rows: [...SCHOOL_DISTRICT_ROWS, ...FACILITY_ROWS.filter((row) => row.topic === "school")],
    notices: [NOTICES.schoolDistrict],
    sourcesTitle: "出典・対象時点",
    nextText: "次は、交通や防災も同じ4地区で比べられます。",
  },
  {
    id: "transport",
    tabLabel: "交通・防災",
    tabLabelRest: "・施設",
    icon: "bus",
    title: "交通・防災・施設",
    lead: "地区の中の場所の数",
    rows: TRANSPORT_ROWS,
    notices: [],
    sourcesTitle: "出典・対象時点",
    nextText: "次は、人口も同じ4地区で比べられます。",
  },
  {
    id: "population",
    tabLabel: "人口",
    icon: "people",
    title: "人口",
    lead: "国勢調査からみた人口と年齢の割合",
    rows: POPULATION_ROWS,
    notices: [],
    sourcesTitle: "出典・対象時点",
    nextText: "次は、季節の行事も同じ4地区で比べられます。",
  },
  {
    id: "events",
    tabLabel: "季節の行事",
    icon: "calendar",
    title: "季節の行事",
    lead: "地区の公民館活動などから",
    rows: EVENT_ROWS,
    notices: [EVENTS_CREDIT],
    sourcesTitle: "出典・確認日",
    nextText: "住まいの相場も同じ4地区で比べられます。",
  },
];
