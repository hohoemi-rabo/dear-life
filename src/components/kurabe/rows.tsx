import type { ReactNode } from "react";
import { DataStateLabel } from "@/components/data/DataStateMessage";
import { CountBadge } from "@/components/ui/CountBadge";
import { SEASONS } from "@/lib/conditions/scene";
import { EVENTS_CREDIT } from "@/lib/credits";
import type { DataState, DistrictData, MarketStat } from "@/lib/data/screen-data";
import { SQUARE_METER, formatManYen } from "@/lib/format";
import { MARKET_CATEGORY_LABELS } from "@/lib/karte/housing";
import { ageShares } from "@/lib/karte/facilities";
import { eventLabel, FACILITY_COUNT_ROWS } from "@/lib/kurabe/compare";
import { NOTICES } from "@/lib/notices";

// 地区くらべの項目（要件 3章の表・F-05）。スマホの並べ方と PC の表は、どちらもこの並びをそのまま使う
export type CompareRow = {
  id: string;
  label: string;
  note?: string;
  // 値が数字1つだけの行。スマホでは 2×2 に詰めて、画面が長くなりすぎないようにする
  short?: boolean;
  cell: (district: DistrictData) => ReactNode;
};
export type CompareSection = { id: string; title: string; rows: readonly CompareRow[]; notice?: string };

function stateCell<T>(state: DataState<T>, render: (value: T) => ReactNode): ReactNode {
  return state.status === "available" ? render(state.value) : <DataStateLabel state={state} />;
}

// 値段だけを大きく出すので、値段用のフォントにする（027）
function BigValue({ children }: { children: ReactNode }) {
  return <span className="price-figure block text-xl">{children}</span>;
}

// 土地は㎡単価の真ん中の値と幅（下位25%〜上位25%）。伊賀良のように幅が広い地区でも幅は省略しない（要件 5.1）
function LandCell({ stat }: { stat: MarketStat }) {
  return (
    <span className="flex flex-col gap-1">
      <BigValue>
        {formatManYen(stat.median)}
        <span className="font-sans text-sm font-bold">／{SQUARE_METER}</span>
      </BigValue>
      {stat.p25 !== null && stat.p75 !== null && (
        <span className="text-sm tabular-nums">
          <span className="text-ink-muted">幅 </span>
          {formatManYen(stat.p25)}〜{formatManYen(stat.p75)}
        </span>
      )}
      <CountBadge count={stat.sampleCount} />
    </span>
  );
}

function HouseCell({ stat }: { stat: MarketStat }) {
  return (
    <span className="flex flex-col gap-1">
      <BigValue>{formatManYen(stat.median)}</BigValue>
      <CountBadge count={stat.sampleCount} />
    </span>
  );
}

export const COMPARE_SECTIONS: readonly CompareSection[] = [
  {
    id: "market",
    title: "住まいの相場",
    notice: NOTICES.market,
    rows: [
      {
        id: "land",
        label: MARKET_CATEGORY_LABELS.land,
        note: `1${SQUARE_METER}あたりの真ん中の値`,
        cell: (district) => stateCell(district.market.land, (stat) => <LandCell stat={stat} />),
      },
      {
        id: "house-within-20y",
        label: MARKET_CATEGORY_LABELS.house_built_within_20y,
        note: "総額の真ん中の値",
        cell: (district) => stateCell(district.market.house_built_within_20y, (stat) => <HouseCell stat={stat} />),
      },
      {
        id: "house-over-20y",
        label: MARKET_CATEGORY_LABELS.house_built_over_20y,
        note: "総額の真ん中の値",
        cell: (district) => stateCell(district.market.house_built_over_20y, (stat) => <HouseCell stat={stat} />),
      },
    ],
  },
  {
    id: "school-districts",
    title: "主な学区",
    notice: NOTICES.schoolDistrict,
    rows: [
      {
        id: "elementary",
        label: "主な小学校区",
        cell: (district) => stateCell(district.elementarySchoolDistricts, (names) => <span className="font-bold">{names.join("・")}</span>),
      },
      {
        id: "junior-high",
        label: "主な中学校区",
        cell: (district) => stateCell(district.juniorHighSchoolDistricts, (names) => <span className="font-bold">{names.join("・")}</span>),
      },
    ],
  },
  {
    id: "facilities",
    title: "施設の数",
    rows: FACILITY_COUNT_ROWS.map((row) => ({
      id: row.id,
      label: row.label,
      short: true,
      cell: (district: DistrictData) =>
        stateCell(row.pick(district), (facilities) => (
          <span className="font-bold tabular-nums">
            <span className="text-xl">{facilities.length.toLocaleString("ja-JP")}</span>
            <span className="ml-0.5 text-sm">か所</span>
          </span>
        )),
    })),
  },
  {
    id: "population",
    title: "人口",
    rows: [
      {
        id: "total",
        label: "地区の人口",
        short: true,
        cell: (district) =>
          stateCell(district.population, (population) => (
            <span className="font-bold tabular-nums">
              <span className="text-xl">{population.total.toLocaleString("ja-JP")}</span>
              <span className="ml-0.5 text-sm">人</span>
            </span>
          )),
      },
      {
        id: "ages",
        label: "年齢3区分の割合",
        cell: (district) =>
          stateCell(district.population, (population) => (
            <span className="flex flex-col text-sm tabular-nums">
              {ageShares(population).map((share) => (
                <span key={share.label}>
                  <span className="text-ink-muted">{share.label} </span>
                  <span className="font-bold">{share.percent}%</span>
                </span>
              ))}
            </span>
          )),
      },
    ],
  },
  {
    id: "events",
    title: "季節ごとの主な行事",
    notice: EVENTS_CREDIT,
    // まだ集めていない季節は「準備中」と出し、作り話で埋めない（F-13）
    rows: SEASONS.map((season) => ({
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
    })),
  },
];
