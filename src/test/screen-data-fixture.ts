// 画面のテストで使う ScreenData（読み込んだあとの形）。既定では出典のあるデータがすべて「データ未取得」で、
// 確かめたい欄だけを上書きして使う
import { COMPARE_METRIC_KEYS, type CompareMetricKey } from "@/lib/compare-city/metrics";
import type {
  BusOuting,
  CompareCity,
  CompareMetricValue,
  DataState,
  DistrictData,
  HousingTenure,
  MarketStat,
  RentReference,
  ScreenData,
  SourceInfo,
} from "@/lib/data/screen-data";
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

export const RENT_SOURCE = sourceFixture("estat_housing_land_survey_rent", {
  name: "住宅・土地統計調査 民営借家の1か月当たり家賃",
  publisher: "総務省統計局",
  periodLabel: "2023年10月1日現在（令和5年住宅・土地統計調査）",
  checkedOn: "2026-11-08",
  fetchedOn: null,
});

// 2026-11-08 に取り込んだ飯田市の値
export function rentFixture(extra: Partial<RentReference> = {}): DataState<RentReference> {
  return {
    status: "available",
    value: { asOf: "2023-10-01", all: 50043, detached: 51671, apartmentWooden: 43392, apartmentNonWooden: 51483, ...extra },
    source: RENT_SOURCE,
  };
}

export const TENURE_SOURCE = sourceFixture("estat_census_housing_tenure", {
  name: "国勢調査 小地域集計（町丁・字等別）住宅の所有の関係別一般世帯数",
  publisher: "総務省統計局",
  periodLabel: "2020年10月1日現在（令和2年国勢調査）",
  checkedOn: "2026-11-08",
  fetchedOn: null,
});

export function tenureFixture(householdsInHousing: number, privateRented: number): DataState<HousingTenure> {
  return {
    status: "available",
    value: { asOf: "2020-10-01", householdsInHousing, ownerOccupied: householdsInHousing - privateRented - 100, privateRented },
    source: TENURE_SOURCE,
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
    schoolZones: UNAVAILABLE,
    schools: UNAVAILABLE,
    childcare: UNAVAILABLE,
    afterSchoolClubs: UNAVAILABLE,
    evacuationSites: UNAVAILABLE,
    publicFacilities: UNAVAILABLE,
    busStops: UNAVAILABLE,
    trainStations: UNAVAILABLE,
    trainDepartures: UNAVAILABLE,
    trainCounts: UNAVAILABLE,
    population: UNAVAILABLE,
    housingTenure: UNAVAILABLE,
    busOuting: UNAVAILABLE,
    busErrands: UNAVAILABLE,
    clinicCount: UNAVAILABLE,
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
    marketSummary: UNAVAILABLE,
    rent: UNAVAILABLE,
    compareCities: COMPARE_CITY_FIXTURE_IDS.map((id) => compareCityFixture(id)),
    supportPrograms: [],
    sceneTemplates: [],
  };
}

// いまの街と（041）。既定では値も相場もすべて「データ未取得」（cities.csv の並び）
const COMPARE_CITY_NAMES: Record<string, [string, string]> = {
  tokyo: ["東京23区", "東京"],
  yokohama: ["横浜市", "横浜"],
  nagoya: ["名古屋市", "名古屋"],
  osaka: ["大阪市", "大阪"],
  nagano: ["長野市", "長野"],
  matsumoto: ["松本市", "松本"],
  iida: ["飯田市", "飯田"],
};
export const COMPARE_CITY_FIXTURE_IDS = Object.keys(COMPARE_CITY_NAMES);

export function compareCityFixture(
  id: string,
  extra: { metrics?: Partial<Record<CompareMetricKey, DataState<CompareMetricValue>>>; market?: Partial<CompareCity["market"]> } = {},
): CompareCity {
  const [name, jmaStation] = COMPARE_CITY_NAMES[id] ?? [id, id];
  return {
    id,
    name,
    jmaStation,
    metrics: { ...(Object.fromEntries(COMPARE_METRIC_KEYS.map((key) => [key, UNAVAILABLE])) as Record<CompareMetricKey, DataState<CompareMetricValue>>), ...extra.metrics },
    market: { land: UNAVAILABLE, house_built_within_20y: UNAVAILABLE, house_built_over_20y: UNAVAILABLE, ...extra.market },
  };
}

export function compareMetricFixture(value: number, unit: string, source: SourceInfo, extra: Partial<CompareMetricValue> = {}): DataState<CompareMetricValue> {
  return { status: "available", value: { value, unit, periodLabel: "1991〜2020年", checkedOn: "2026-11-14", note: null, ...extra }, source };
}

// 冬・車0台のバスのおでかけ（036 からはバス停の名前と時刻を持たず、行けるバス停の数だけ）
export function busOutingFixture(extra: Partial<BusOuting> = {}): BusOuting {
  return {
    dayType: "土曜",
    serviceDate: "2027-01-16",
    validUntil: "2027-03-31",
    destinationPlace: "飯田駅",
    districtStopCount: 25,
    reachableStopCount: 25,
    ...extra,
  };
}
