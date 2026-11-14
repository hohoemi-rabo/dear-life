// 地区くらべ「いまの街と」（041）の表の中身。移住元に多い都市と飯田を、同じ出典・同じ定義の数字で左右に並べる。
// 良い悪いは付けない：差・増減・色分け・順位は出さず、左（いまの街）と右（飯田）の値を並べるだけにする（仕様書 3章）。
// 住まいの行だけ、右は飯田市ではなく選んだ地区の相場（市全体の相場は持っていないため）
import { COMPARE_METRICS, type CompareMetricGroup, type CompareMetricKey } from "../compare-city/metrics.ts";
import type { CompareCity, CompareMetricValue, DataState, DistrictData, MarketCategory, MarketStat, ScreenData, SourceInfo } from "../data/screen-data.ts";
import { formatQuarterRange } from "../format.ts";
import { MARKET_CATEGORY_LABELS } from "../karte/housing.ts";

export const IIDA_CITY_ID = "iida";
// 比べる都市を選んでいないとき・知らない値のとき（仕様書 7.1）
export const DEFAULT_COMPARE_CITY = "tokyo";

export type CityMetricRow = {
  kind: "metric";
  key: CompareMetricKey;
  label: string;
  unit: string;
  city: DataState<CompareMetricValue>;
  iida: DataState<CompareMetricValue>;
};

export type CityMarketRow = {
  kind: "market";
  key: MarketCategory;
  label: string;
  city: DataState<MarketStat>;
  // 地区を選んでいなければ null（「地区を選ぶと出ます」）
  district: DataState<MarketStat> | null;
};

export type CityCompareGroup =
  | { id: CompareMetricGroup; title: string; rows: readonly CityMetricRow[] }
  | { id: "housing"; title: string; rows: readonly CityMarketRow[] };

const GROUP_TITLES: Record<CompareMetricGroup, string> = {
  weather: "雨・風・雪",
  flood: "水害の被害",
  population: "人口",
};

// 住まいの行の名前。土地は m² 単価と分かるように書く（見本 kurabe-city-pc.png）
const MARKET_ROW_LABELS: Record<MarketCategory, string> = {
  land: "土地（宅地）の m² 単価",
  house_built_within_20y: MARKET_CATEGORY_LABELS.house_built_within_20y,
  house_built_over_20y: MARKET_CATEGORY_LABELS.house_built_over_20y,
};

const MARKET_CATEGORIES: readonly MarketCategory[] = ["land", "house_built_within_20y", "house_built_over_20y"];

const UNAVAILABLE = { status: "unavailable" } as const;

// 比べられる都市（飯田市は右の列なので選べない）。cities.csv の並び
export function compareCityOptions(data: ScreenData): readonly CompareCity[] {
  return data.compareCities.filter((city) => city.id !== IIDA_CITY_ID);
}

export function findIida(data: ScreenData): CompareCity | null {
  return data.compareCities.find((city) => city.id === IIDA_CITY_ID) ?? null;
}

// 行は 雨・風・雪 → 水害の被害 → 人口 → 住まい の順（見本どおり）
export function cityCompareGroups(city: CompareCity | null, iida: CompareCity | null, district: DistrictData | null): readonly CityCompareGroup[] {
  const metricGroups = (["weather", "flood", "population"] as const).map(
    (group): CityCompareGroup => ({
      id: group,
      title: GROUP_TITLES[group],
      rows: COMPARE_METRICS.filter((metric) => metric.group === group).map((metric) => ({
        kind: "metric",
        key: metric.key,
        label: metric.label,
        unit: metric.unit,
        city: city?.metrics[metric.key] ?? UNAVAILABLE,
        iida: iida?.metrics[metric.key] ?? UNAVAILABLE,
      })),
    }),
  );
  const housing: CityCompareGroup = {
    id: "housing",
    title: "住まい",
    rows: MARKET_CATEGORIES.map((category) => ({
      kind: "market",
      key: category,
      label: MARKET_ROW_LABELS[category],
      city: city?.market[category] ?? UNAVAILABLE,
      district: district ? district.market[category] : null,
    })),
  };
  return [...metricGroups, housing];
}

// 値の数字。整数はそのまま、小数は1桁まで（降水量 1598.2 mm・割合 11.4%）
export function formatMetricValue(value: number): string {
  return value.toLocaleString("ja-JP", { maximumFractionDigits: 1 });
}

export type CitySourceEntry = { source: SourceInfo; period?: string; checkedOn?: string };

// 表に出した値の出典を、出てくる順に1回ずつ。手で入れた値は、行ごとの対象期間と、いちばん新しい確認日を添える
export function cityCompareSources(groups: readonly CityCompareGroup[]): CitySourceEntry[] {
  const entries = new Map<string, CitySourceEntry>();
  for (const group of groups) {
    for (const row of group.rows) {
      const states: DataState<CompareMetricValue | MarketStat>[] =
        row.kind === "metric" ? [row.city, row.iida] : [row.city, ...(row.district ? [row.district] : [])];
      for (const state of states) {
        if (state.status === "unavailable") continue;
        const current = entries.get(state.source.id);
        if (state.status === "none") {
          if (!current) entries.set(state.source.id, { source: state.source });
          continue;
        }
        const value = state.value;
        if ("checkedOn" in value) {
          const checkedOn = current?.checkedOn && current.checkedOn > value.checkedOn ? current.checkedOn : value.checkedOn;
          entries.set(state.source.id, { source: state.source, period: current?.period ?? value.periodLabel, checkedOn });
        } else if (!current?.period) {
          entries.set(state.source.id, { source: state.source, period: formatQuarterRange(value.periodFrom, value.periodTo) });
        }
      }
    }
  }
  return [...entries.values()];
}

// 水害被害額の対象期間（注意書きの「対象期間：○○」）。飯田と相手の都市で同じはずなので、値のある方から取る
export function floodPeriod(groups: readonly CityCompareGroup[]): string | null {
  for (const group of groups) {
    for (const row of group.rows) {
      if (row.kind !== "metric" || row.key !== "flood_damage_10y") continue;
      for (const state of [row.iida, row.city]) {
        if (state.status === "available") return state.value.periodLabel;
      }
    }
  }
  return null;
}
