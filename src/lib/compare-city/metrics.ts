// 地区くらべ「いまの街と」（041）で並べる指標。並び・単位・出典はここが正で、CSV（data/compare/stats.csv）・
// 取り込み（compare:sql）・画面がこれを使う。Node の取り込みスクリプトからも読むので、外部に依存しない
export const COMPARE_METRIC_KEYS = [
  "precip_annual",
  "rain30_days",
  "wind10_days",
  "snow_depth_max",
  "flood_damage_10y",
  "pop_density",
  "under15_ratio",
] as const;
export type CompareMetricKey = (typeof COMPARE_METRIC_KEYS)[number];

export type CompareMetricGroup = "weather" | "flood" | "population";

export type CompareMetric = {
  key: CompareMetricKey;
  label: string;
  unit: string;
  group: CompareMetricGroup;
  sourceId: string;
};

export const COMPARE_METRICS: readonly CompareMetric[] = [
  { key: "precip_annual", label: "1年の降水量", unit: "mm", group: "weather", sourceId: "jma_climate_normals" },
  { key: "rain30_days", label: "日降水量30mm以上の日数", unit: "日/年", group: "weather", sourceId: "jma_climate_normals" },
  { key: "wind10_days", label: "日最大風速10m/s以上の日数", unit: "日/年", group: "weather", sourceId: "jma_climate_normals" },
  { key: "snow_depth_max", label: "最深積雪", unit: "cm", group: "weather", sourceId: "jma_climate_normals" },
  { key: "flood_damage_10y", label: "住まいや店の水害被害額", unit: "万円", group: "flood", sourceId: "mlit_flood_statistics" },
  { key: "pop_density", label: "人口密度", unit: "人/km²", group: "population", sourceId: "estat_census_basic" },
  { key: "under15_ratio", label: "15歳未満の割合", unit: "%", group: "population", sourceId: "estat_census_basic" },
];

export function compareMetric(key: CompareMetricKey): CompareMetric {
  const metric = COMPARE_METRICS.find((item) => item.key === key);
  if (!metric) throw new Error(`知らない指標：${key}`);
  return metric;
}
