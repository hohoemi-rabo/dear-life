// 画面のテストで使う ScreenData（読み込んだあとの形）。既定では出典のあるデータがすべて「データ未取得」で、
// 確かめたい欄だけを上書きして使う
import type { DataState, DistrictData, MarketStat, ScreenData, SourceInfo } from "@/lib/data/screen-data";
import type { DistrictId } from "@/lib/town-district/resolve";

export function sourceFixture(id: string, extra: Partial<SourceInfo> = {}): SourceInfo {
  return {
    id,
    name: `${id} の名前`,
    publisher: "提供元",
    url: null,
    license: null,
    credit: null,
    periodLabel: null,
    checkedOn: null,
    fetchedOn: "2026-10-26",
    ...extra,
  };
}

export const MARKET_SOURCE = sourceFixture("reinfolib_xit001", {
  name: "不動産価格（取引価格・成約価格）情報",
  publisher: "国土交通省 不動産情報ライブラリ",
  periodLabel: "2021年第1四半期〜2026年第1四半期",
});

export function marketFixture(median: number, sampleCount: number, extra: Partial<MarketStat> = {}): DataState<MarketStat> {
  return {
    status: "available",
    value: { median, p25: null, p75: null, sampleCount, periodFrom: "2021Q1", periodTo: "2026Q1", ...extra },
    source: MARKET_SOURCE,
  };
}

export function availableFixture<T>(value: T, source: SourceInfo): DataState<T> {
  return { status: "available", value, source };
}

const UNAVAILABLE = { status: "unavailable" } as const;

const NAMES: Record<DistrictId, string> = { kamisato: "上郷", kanae: "鼎", igara: "伊賀良", chushin: "中心市街地" };

function districtFixture(id: DistrictId): DistrictData {
  return {
    id,
    name: NAMES[id],
    areaDescription: `${NAMES[id]}の範囲`,
    market: { land: UNAVAILABLE, house_built_within_20y: UNAVAILABLE, house_built_over_20y: UNAVAILABLE },
    elementarySchoolDistricts: UNAVAILABLE,
    juniorHighSchoolDistricts: UNAVAILABLE,
    schools: UNAVAILABLE,
    childcare: UNAVAILABLE,
    afterSchoolClubs: UNAVAILABLE,
    evacuationSites: UNAVAILABLE,
    publicFacilities: UNAVAILABLE,
    busStops: UNAVAILABLE,
    trainStations: UNAVAILABLE,
    trainDepartures: UNAVAILABLE,
    population: UNAVAILABLE,
    busOuting: UNAVAILABLE,
    trainOuting: UNAVAILABLE,
    events: [],
  };
}

export function screenDataFixture(overrides: Partial<Record<DistrictId, Partial<DistrictData>>> = {}): ScreenData {
  const order: DistrictId[] = ["kamisato", "kanae", "igara", "chushin"];
  return {
    generatedAt: "2026-10-26T13:00:00+00:00",
    sources: [],
    districtOrder: order,
    districts: Object.fromEntries(order.map((id) => [id, { ...districtFixture(id), ...overrides[id] }])) as Record<
      DistrictId,
      DistrictData
    >,
    supportPrograms: [],
    sceneTemplates: [],
  };
}
