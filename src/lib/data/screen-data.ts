// 画面が読むデータの型と、screen_data()（015）の応答を画面で使う形に直す処理。
// 出典のあるデータは、すべて DataState にして「データ未取得」と「該当なし」を型で区別する（F-09・要件 7.2）
import type { Database } from "../supabase/database.types.ts";
import type { DistrictId } from "../town-district/resolve.ts";

type Enums = Database["public"]["Enums"];

// ---- 出典と、値の状態 ----

export type SourceInfo = {
  id: string;
  name: string;
  publisher: string;
  url: string | null;
  license: string | null;
  // 画面にそのまま出すクレジット（要件 7.3）
  credit: string | null;
  // 対象時点・対象期間（「2021年第1四半期〜2026年第1四半期」など）
  periodLabel: string | null;
  // 手で確かめたデータは確認日、自動で取ったデータは取得日を持つ（YYYY-MM-DD）
  checkedOn: string | null;
  fetchedOn: string | null;
};

// available：値がある／none：出典は公開済みで、該当するものがない（該当なし）／
// unavailable：出典が未公開・未取り込み・有効期限切れ（データ未取得）
export type DataState<T> =
  | { status: "available"; value: T; source: SourceInfo }
  | { status: "none"; source: SourceInfo }
  | { status: "unavailable" };

// ---- 地区ごとのデータ ----

export type MarketCategory = Enums["market_category"];

export type MarketStat = {
  // 土地は㎡単価、中古戸建ては総額（円）。p25・p75 は土地だけ
  median: number;
  p25: number | null;
  p75: number | null;
  sampleCount: number;
  // 対象期間（「2021Q1」形式）
  periodFrom: string;
  periodTo: string;
};

// 相場の集計の対象期間の取引件数と、外した取引の件数（要件 5章-3。データについてページで出す）
export type MarketSummary = {
  periodFrom: string;
  periodTo: string;
  // 飯田市全体の取引件数と、そのうち4地区に振り分けた件数（どちらも外した取引を含む）
  citywideCount: number;
  districtCount: number;
  // 4地区の取引のうち集計から外した件数と、その理由ごとの件数（1件が複数の理由に当たることがある）
  excludedCount: number;
  mediationCount: number;
  relatedPartyCount: number;
  adjacentLandCount: number;
};

export type Facility = {
  name: string;
  // 元の区分（「小学校」「認定こども園（保育所型）」「公園」など）。バス停・駅は null
  subkind: string | null;
  address: string | null;
};

export type EvacuationHazard = "flood" | "landslide" | "earthquake" | "large_fire";

export type EvacuationSite = Facility & { hazards: readonly EvacuationHazard[] };

// 駅ごと・向きごとの1日の本数（031 全国鉄道運行本数データ。平日・特急を除く）
export type StationTrips = {
  stationName: string;
  direction: "上り" | "下り";
  tripsPerDay: number;
};

export type StationDepartures = StationTrips & {
  // 特急を除いた本数と始発・最終（HH:MM。24時以上もありうるので formatServiceTime で出す）
  firstDeparture: string;
  lastDeparture: string;
};

export type Population = {
  asOf: string;
  total: number;
  age0to14: number | null;
  age15to64: number | null;
  age65plus: number | null;
};

// 地区の住宅の所有の関係別の一般世帯数（034。国勢調査の町丁・字等を4地区に合計）
export type HousingTenure = {
  asOf: string;
  // 住宅に住む一般世帯。持ち家・民営借家のほか、公営の借家・給与住宅・間借りを含む
  householdsInHousing: number;
  ownerOccupied: number;
  privateRented: number;
};

// 飯田市の民営借家の1か月あたりの家賃の平均（034。住宅・土地統計調査。市全体の値で、地区には分けられない）。
// 延べ面積の総数・家賃0円を含まない。建て方ごとの値は、推計できなかったものが null
export type RentReference = {
  asOf: string;
  all: number;
  detached: number | null;
  apartmentWooden: number | null;
  apartmentNonWooden: number | null;
};

export type Trip = {
  // HH:MM（GTFS の書き方。24時以上もありうる）
  departure: string;
  arrival: string;
  // バスは路線名、電車は種別（普通・快速 みすず など）
  line: string;
};

// 冬・車0台のおでかけ（要件 6.3）。行き・帰りの便が見つかったものだけ。見つからなければ DataState が none になる
export type Outing = {
  originName: string;
  destinationName: string;
  outbound: Trip;
  return: Trip;
  // 帰りの次の便。null なら「次の便はありません」
  nextReturn: Trip | null;
  outboundTripsPerDay: number;
  returnTripsPerDay: number;
  originDeparturesPerDay: number;
};

// 冬・車0台のバスのおでかけ（010・036）。バス停の名前と時刻は画面に出さない（乗る所は住む場所で決まるため。2026-11-11 まさゆきさん）。
// 「{地区}のバス停{districtStopCount}か所のうち{reachableStopCount}か所から、{destinationPlace}へ乗りかえなしで行けるバスがあります」と出す
export type BusOuting = {
  dayType: "平日" | "土曜" | "日曜";
  // 時刻表を見た日。「2027年1月16日（土）の時刻表」と出す
  serviceDate: string;
  validUntil: string;
  // 行き先の呼び方（「飯田駅」など。バス停の名前ではない）
  destinationPlace: string;
  // 地区のバス停の数と、そのうち行き先へ乗りかえなしで行けて帰ってこられるバス停の数
  districtStopCount: number;
  reachableStopCount: number;
};

// 用事の場所（市役所・病院・学校・店）へ、地区のバス停から乗りかえなしで行けるか（036・037）。バス停の名前は持たない。
// 行き先は地区ごと（037）。駅・診療所・高校はここに入らない（電車の本数・clinicCount・schools から出す）
export type BusErrand = {
  place: string;
  kind: "市役所" | "病院" | "小学校" | "中学校" | "店";
  // そばにバス停がない店は false（バスでは数えていない）
  hasStop: boolean;
  // 店の名前と住所を確かめた公式ページ（店のときだけ）
  officialUrl: string | null;
  dayType: "平日" | "土曜" | "日曜";
  serviceDate: string;
  districtStopCount: number;
  // 行きと帰りの両方に乗りかえなしの便があるバス停の数。0 なら本数は null
  reachableStopCount: number;
  minTripsPerDay: number | null;
  maxTripsPerDay: number | null;
};

// 町名ごとに通う公立の小学校・中学校（039。市の通学区域の規則の別表）。
// 学校が2つのときは、isPartial が false なら「どちらかを選べる」、true なら「町の中の場所によって分かれる」
export type TownSchoolZone = {
  townName: string;
  elementarySchools: readonly string[];
  juniorHighSchools: readonly string[];
  isPartial: boolean;
};

// 地区の診療所（クリニック）の数（037。国の医療機関の一覧を住所で振り分けた）
export type ClinicCount = {
  asOf: string;
  count: number;
};

export type DistrictEvent = {
  season: Enums["season"];
  name: string;
  chushinArea: Enums["chushin_area"] | null;
  timingNote: string;
  scope: Enums["event_scope"];
  participation: Enums["event_participation"];
  participationNote: string | null;
  isForChildren: boolean;
  art: Enums["event_art"];
  sourceNote: string;
  checkedOn: string;
};

export type DistrictData = {
  id: DistrictId;
  name: string;
  areaDescription: string;
  market: Readonly<Record<MarketCategory, DataState<MarketStat>>>;
  // 国の学区の範囲から決めた地区の主な学区の学校名（要件 7.2）。地図の説明に使う。
  // 通う学校は schoolZones（市の規則）で出す（039）
  elementarySchoolDistricts: DataState<readonly string[]>;
  juniorHighSchoolDistricts: DataState<readonly string[]>;
  // 町名ごとに通う学校（039）。並びは市の規則の別表の順
  schoolZones: DataState<readonly TownSchoolZone[]>;
  schools: DataState<readonly Facility[]>;
  childcare: DataState<readonly Facility[]>;
  afterSchoolClubs: DataState<readonly Facility[]>;
  evacuationSites: DataState<readonly EvacuationSite[]>;
  publicFacilities: DataState<readonly Facility[]>;
  busStops: DataState<readonly Facility[]>;
  trainStations: DataState<readonly Facility[]>;
  // 電車の時刻から数えた本数と始発・最終。市の許可が出るまで出典が非公開なので unavailable（026）
  trainDepartures: DataState<readonly StationDepartures[]>;
  // 時刻とは別のオープンデータの本数（031）。時刻が出せないあいだは、こちらを出す
  trainCounts: DataState<readonly StationTrips[]>;
  population: DataState<Population>;
  // 借家に住む世帯の数（034）
  housingTenure: DataState<HousingTenure>;
  busOuting: DataState<BusOuting>;
  // 用事の場所（036）。時刻表の有効期間を過ぎたら「データ未取得」
  busErrands: DataState<readonly BusErrand[]>;
  // 診療所（クリニック）の数（037）
  clinicCount: DataState<ClinicCount>;
  // 電車の時刻は市の許可が出るまで出典が非公開なので、そのあいだは unavailable になる（026）
  trainOuting: DataState<Outing>;
  // 手入力の行事。公開済みのものだけが季節順に入る。その季節の行事がなければ「この季節の行事は準備中です」（F-13）
  events: readonly DistrictEvent[];
};

export type SupportProgram = {
  name: string;
  summary: string;
  category: Enums["support_category"];
  officialUrl: string;
  checkedOn: string;
};

export type SceneSentence = {
  position: number;
  kind: Enums["sentence_kind"];
  body: string;
  karte_card: Enums["karte_card"] | null;
  has_children: boolean | null;
  car: Enums["car_choice"] | null;
  housing: Enums["housing_choice"] | null;
  // 差し込む値が「該当なし」のときに代わりに出す本文（017）
  fallback_body: string | null;
  // 本文に書いた事実（差し込みではないもの）の出典（017）
  source_id: string | null;
};

// 列の名前はひな形の選び方（@/lib/conditions/scene の SceneCondition）に合わせ、テーブルと同じにしている
export type SceneTemplate = {
  id: number;
  season: Enums["season"];
  title: string;
  has_children: boolean | null;
  car: Enums["car_choice"] | null;
  housing: Enums["housing_choice"] | null;
  sentences: readonly SceneSentence[];
};

export type ScreenData = {
  // データベースが応答を作った日時。オフライン表示の「データは◯月◯日時点」に使う（024）
  generatedAt: string;
  // 公開済みの出典。データについてページ（022）で一覧にする
  sources: readonly SourceInfo[];
  // 地区マスタの並び順
  districtOrder: readonly DistrictId[];
  districts: Readonly<Record<DistrictId, DistrictData>>;
  marketSummary: DataState<MarketSummary>;
  // 飯田市全体の家賃の参考値（034）
  rent: DataState<RentReference>;
  supportPrograms: readonly SupportProgram[];
  sceneTemplates: readonly SceneTemplate[];
};

// ---- screen_data() の応答（列の名前はデータベースのまま） ----

export type RawSection<T> = { source_id: string; items: T[] };

export type RawSource = {
  id: string;
  name: string;
  publisher: string;
  source_url: string | null;
  license: string | null;
  credit_text: string | null;
  period_label: string | null;
  checked_on: string | null;
  fetched_at: string | null;
};

type RawMarketStat = {
  category: MarketCategory;
  median_value: number | null;
  p25_value: number | null;
  p75_value: number | null;
  sample_count: number;
  period_from: string;
  period_to: string;
};

type RawFacility = { name: string; subkind: string | null; address: string | null };

type RawOuting = {
  origin_name: string;
  destination_name: string;
  status: "available" | "no_outbound" | "no_return";
  outbound_departure: string | null;
  outbound_arrival: string | null;
  outbound_line: string | null;
  return_departure: string | null;
  return_arrival: string | null;
  return_line: string | null;
  next_return_departure: string | null;
  next_return_arrival: string | null;
  next_return_line: string | null;
  outbound_trips_per_day: number;
  return_trips_per_day: number;
  origin_departures_per_day: number;
};

type RawDistrict = {
  id: string;
  name: string;
  area_description: string;
  market: RawSection<RawMarketStat>;
  elementary_school_districts: RawSection<{ school_name: string }>;
  junior_high_school_districts: RawSection<{ school_name: string }>;
  facilities: {
    schools: RawSection<RawFacility>;
    childcare: RawSection<RawFacility>;
    after_school_clubs: RawSection<RawFacility>;
    evacuation_sites: RawSection<RawFacility & { hazards: EvacuationHazard[] }>;
    public_facilities: RawSection<RawFacility>;
    bus_stops: RawSection<RawFacility>;
    train_stations: RawSection<RawFacility>;
  };
  train_departures: RawSection<{
    station_name: string;
    direction: "上り" | "下り";
    trips_per_day: number;
    first_departure: string;
    last_departure: string;
  }>;
  train_counts: RawSection<{
    station_name: string;
    direction: "上り" | "下り";
    trips_per_day: number;
  }>;
  population: RawSection<{
    as_of: string;
    total: number;
    age_0_14: number | null;
    age_15_64: number | null;
    age_65_plus: number | null;
  }>;
  housing_tenure: RawSection<{
    as_of: string;
    households_in_housing: number;
    owner_occupied: number;
    private_rented: number;
  }>;
  bus_outing: RawSection<{
    day_type: BusOuting["dayType"];
    service_date: string;
    valid_until: string;
    // 036 より前の版の RPC（圏外用に端末に残った古いデータ）にはない
    destination_place_name?: string;
    district_stop_count?: number;
    reachable_stop_count?: number;
  }>;
  train_outing: RawSection<RawOuting>;
  // 036 より前の版の RPC（圏外用に端末に残った古いデータ）にはない
  bus_errands?: RawSection<{
    place_name: string;
    kind: BusErrand["kind"];
    // 037 より前の版の RPC にはない
    has_stop?: boolean;
    official_url?: string | null;
    day_type: BusErrand["dayType"];
    service_date: string;
    valid_until: string;
    district_stop_count: number;
    reachable_stop_count: number;
    min_trips_per_day: number | null;
    max_trips_per_day: number | null;
  }>;
  // 039 より前の版の RPC（圏外用に端末に残った古いデータ）にはない
  school_zones?: RawSection<{ town_name: string; elementary_schools: string[]; junior_high_schools: string[]; is_partial: boolean }>;
  // 037 より前の版の RPC（圏外用に端末に残った古いデータ）にはない
  clinic_count?: RawSection<{ as_of: string; clinic_count: number }>;
  events: {
    season: DistrictEvent["season"];
    name: string;
    chushin_area: DistrictEvent["chushinArea"];
    timing_note: string;
    scope: DistrictEvent["scope"];
    participation: DistrictEvent["participation"];
    participation_note: string | null;
    is_for_children: boolean;
    art: DistrictEvent["art"];
    source_note: string;
    checked_on: string;
  }[];
};

export type RawScreenData = {
  generated_at: string;
  sources: RawSource[];
  districts: RawDistrict[];
  market_summary: RawSection<{
    period_from: string;
    period_to: string;
    citywide_count: number;
    district_count: number;
    excluded_count: number;
    mediation_count: number;
    related_party_count: number;
    adjacent_land_count: number;
  }>;
  rent: RawSection<{ building_type: "all" | "detached" | "apartment_wooden" | "apartment_non_wooden"; average_rent: number; as_of: string }>;
  support_programs: { name: string; summary: string; category: SupportProgram["category"]; official_url: string; checked_on: string }[];
  scene_templates: SceneTemplate[];
};

// 応答の形が想定と違う（関数を変えたのに画面が古いなど）ときのエラー。再試行しても直らない
export class ScreenDataFormatError extends Error {
  constructor(message: string) {
    super(`画面のデータの形が想定と違います：${message}`);
    this.name = "ScreenDataFormatError";
  }
}

export const DISTRICT_IDS: readonly DistrictId[] = ["kamisato", "kanae", "igara", "chushin"];
const MARKET_CATEGORIES: readonly MarketCategory[] = ["land", "house_built_within_20y", "house_built_over_20y"];

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isSection(value: unknown): value is RawSection<unknown> {
  return isObject(value) && typeof value.source_id === "string" && Array.isArray(value.items);
}

// 全部の列を確かめるのではなく、取り違えたときに画面が壊れる骨組み（地区・欄・出典の id）だけを確かめる
function assertShape(raw: unknown): asserts raw is RawScreenData {
  if (!isObject(raw)) throw new ScreenDataFormatError("オブジェクトではありません");
  for (const key of ["sources", "districts", "support_programs", "scene_templates"]) {
    if (!Array.isArray(raw[key])) throw new ScreenDataFormatError(`${key} が配列ではありません`);
  }
  if (typeof raw.generated_at !== "string") throw new ScreenDataFormatError("generated_at がありません");
  if (!isSection(raw.market_summary)) throw new ScreenDataFormatError("market_summary の欄がありません");
  if (!isSection(raw.rent)) throw new ScreenDataFormatError("rent の欄がありません");
  for (const district of raw.districts as unknown[]) {
    if (!isObject(district) || !DISTRICT_IDS.includes(district.id as DistrictId)) {
      throw new ScreenDataFormatError(`知らない地区があります：${isObject(district) ? String(district.id) : "?"}`);
    }
    const sections = [
      district.market,
      district.elementary_school_districts,
      district.junior_high_school_districts,
      district.train_departures,
      district.train_counts,
      district.population,
      district.housing_tenure,
      district.bus_outing,
      district.train_outing,
      ...(isObject(district.facilities) ? Object.values(district.facilities) : [null]),
    ];
    if (!sections.every(isSection) || !Array.isArray(district.events)) {
      throw new ScreenDataFormatError(`${district.id} の欄が足りません`);
    }
  }
}

export type SourceLookup = (sourceId: string) => SourceInfo | undefined;

// 出典が公開されていなければ「データ未取得」、公開済みで中身が空なら「該当なし」
export function listState<T, U>(section: RawSection<T>, findSource: SourceLookup, map: (item: T) => U): DataState<readonly U[]> {
  const source = findSource(section.source_id);
  if (!source) return { status: "unavailable" };
  if (section.items.length === 0) return { status: "none", source };
  return { status: "available", value: section.items.map(map), source };
}

// 1行だけのデータ。行がないのは取り込まれていないということなので「データ未取得」にする
function singleState<T, U>(
  section: RawSection<T>,
  findSource: SourceLookup,
  map: (item: T) => U | null,
): DataState<U> {
  const source = findSource(section.source_id);
  const [item] = section.items;
  if (!source || item === undefined) return { status: "unavailable" };
  const value = map(item);
  return value === null ? { status: "none", source } : { status: "available", value, source };
}

function toFacility(item: RawFacility): Facility {
  return { name: item.name, subkind: item.subkind, address: item.address };
}

function toTrip(departure: string | null, arrival: string | null, line: string | null): Trip | null {
  return departure !== null && arrival !== null && line !== null ? { departure, arrival, line } : null;
}

// 行き・帰りの便が見つからない行は「この条件で使える便は見つかりませんでした」（該当なし）にする
function toOuting(item: RawOuting): Outing | null {
  const outbound = toTrip(item.outbound_departure, item.outbound_arrival, item.outbound_line);
  const back = toTrip(item.return_departure, item.return_arrival, item.return_line);
  if (item.status !== "available" || outbound === null || back === null) return null;
  return {
    originName: item.origin_name,
    destinationName: item.destination_name,
    outbound,
    return: back,
    nextReturn: toTrip(item.next_return_departure, item.next_return_arrival, item.next_return_line),
    outboundTripsPerDay: item.outbound_trips_per_day,
    returnTripsPerDay: item.return_trips_per_day,
    originDeparturesPerDay: item.origin_departures_per_day,
  };
}

function toDistrict(raw: RawDistrict, findSource: SourceLookup, today: string): DistrictData {
  const marketSource = findSource(raw.market.source_id);
  const market = Object.fromEntries(
    MARKET_CATEGORIES.map((category): [MarketCategory, DataState<MarketStat>] => {
      const stat = raw.market.items.find((item) => item.category === category);
      if (!marketSource || !stat) return [category, { status: "unavailable" }];
      // 件数0なら値を持たない（market_stats_value_iff_samples）
      if (stat.sample_count === 0 || stat.median_value === null) return [category, { status: "none", source: marketSource }];
      return [
        category,
        {
          status: "available",
          source: marketSource,
          value: {
            median: stat.median_value,
            p25: stat.p25_value,
            p75: stat.p75_value,
            sampleCount: stat.sample_count,
            periodFrom: stat.period_from,
            periodTo: stat.period_to,
          },
        },
      ];
    }),
  ) as Record<MarketCategory, DataState<MarketStat>>;

  const busSource = findSource(raw.bus_outing.source_id);
  const [busItem] = raw.bus_outing.items;
  // 時刻表の有効期間を過ぎたら、古い便を出さずに「データ未取得」にする（010）
  const busOuting: DataState<BusOuting> =
    !busSource || busItem === undefined || busItem.valid_until < today
      ? { status: "unavailable" }
      : busItem.destination_place_name === undefined || busItem.district_stop_count === undefined || busItem.reachable_stop_count === undefined
        ? { status: "unavailable" }
        : singleState(raw.bus_outing, findSource, (item) => ({
            dayType: item.day_type,
            serviceDate: item.service_date,
            validUntil: item.valid_until,
            destinationPlace: item.destination_place_name!,
            districtStopCount: item.district_stop_count!,
            reachableStopCount: item.reachable_stop_count!,
          }));

  const errands = raw.bus_errands;
  const busErrands: DataState<readonly BusErrand[]> =
    // 037 より前の版は行き先が4地区共通で、駅も入っているので出さない
    errands === undefined || errands.items.some((item) => item.valid_until < today || item.has_stop === undefined)
      ? { status: "unavailable" }
      : listState(errands, findSource, (item) => ({
          place: item.place_name,
          kind: item.kind,
          hasStop: item.has_stop!,
          officialUrl: item.official_url ?? null,
          dayType: item.day_type,
          serviceDate: item.service_date,
          districtStopCount: item.district_stop_count,
          reachableStopCount: item.reachable_stop_count,
          minTripsPerDay: item.min_trips_per_day,
          maxTripsPerDay: item.max_trips_per_day,
        }));

  return {
    id: raw.id as DistrictId,
    name: raw.name,
    areaDescription: raw.area_description,
    market,
    elementarySchoolDistricts: listState(raw.elementary_school_districts, findSource, (item) => item.school_name),
    juniorHighSchoolDistricts: listState(raw.junior_high_school_districts, findSource, (item) => item.school_name),
    schoolZones:
      raw.school_zones === undefined
        ? { status: "unavailable" }
        : listState(raw.school_zones, findSource, (item) => ({
            townName: item.town_name,
            elementarySchools: item.elementary_schools,
            juniorHighSchools: item.junior_high_schools,
            isPartial: item.is_partial,
          })),
    schools: listState(raw.facilities.schools, findSource, toFacility),
    childcare: listState(raw.facilities.childcare, findSource, toFacility),
    afterSchoolClubs: listState(raw.facilities.after_school_clubs, findSource, toFacility),
    evacuationSites: listState(raw.facilities.evacuation_sites, findSource, (item) => ({ ...toFacility(item), hazards: item.hazards })),
    publicFacilities: listState(raw.facilities.public_facilities, findSource, toFacility),
    busStops: listState(raw.facilities.bus_stops, findSource, toFacility),
    trainStations: listState(raw.facilities.train_stations, findSource, toFacility),
    trainDepartures: listState(raw.train_departures, findSource, (item) => ({
      stationName: item.station_name,
      direction: item.direction,
      tripsPerDay: item.trips_per_day,
      firstDeparture: item.first_departure,
      lastDeparture: item.last_departure,
    })),
    trainCounts: listState(raw.train_counts, findSource, (item) => ({
      stationName: item.station_name,
      direction: item.direction,
      tripsPerDay: item.trips_per_day,
    })),
    population: singleState(raw.population, findSource, (item) => ({
      asOf: item.as_of,
      total: item.total,
      age0to14: item.age_0_14,
      age15to64: item.age_15_64,
      age65plus: item.age_65_plus,
    })),
    housingTenure: singleState(raw.housing_tenure, findSource, (item) => ({
      asOf: item.as_of,
      householdsInHousing: item.households_in_housing,
      ownerOccupied: item.owner_occupied,
      privateRented: item.private_rented,
    })),
    busOuting,
    busErrands,
    clinicCount:
      raw.clinic_count === undefined
        ? { status: "unavailable" }
        : singleState(raw.clinic_count, findSource, (item) => ({ asOf: item.as_of, count: item.clinic_count })),
    trainOuting: singleState(raw.train_outing, findSource, toOuting),
    events: raw.events.map((event) => ({
      season: event.season,
      name: event.name,
      chushinArea: event.chushin_area,
      timingNote: event.timing_note,
      scope: event.scope,
      participation: event.participation,
      participationNote: event.participation_note,
      isForChildren: event.is_for_children,
      art: event.art,
      sourceNote: event.source_note,
      checkedOn: event.checked_on,
    })),
  };
}

// 公開済みの出典の一覧と、id から引く関数。地図のデータ（021 の map_data）も同じ形で出典を返すので共通にしている
export function parseSources(raw: readonly RawSource[]): { sources: SourceInfo[]; findSource: SourceLookup } {
  const sources: SourceInfo[] = raw.map((source) => ({
    id: source.id,
    name: source.name,
    publisher: source.publisher,
    url: source.source_url,
    license: source.license,
    credit: source.credit_text,
    periodLabel: source.period_label,
    checkedOn: source.checked_on,
    // 取得日時（timestamptz）は日本時間の日付にする
    fetchedOn: source.fetched_at === null ? null : japanDate(new Date(source.fetched_at)),
  }));
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  return { sources, findSource: (id) => sourceById.get(id) };
}

// 建て方ごとの行を1つにまとめる。民営借家全体の値がなければ取り込まれていないとみて「データ未取得」
function toRent(section: RawScreenData["rent"], findSource: SourceLookup): DataState<RentReference> {
  const source = findSource(section.source_id);
  const valueOf = (type: RawScreenData["rent"]["items"][number]["building_type"]) =>
    section.items.find((item) => item.building_type === type);
  const all = valueOf("all");
  if (!source || all === undefined) return { status: "unavailable" };
  return {
    status: "available",
    source,
    value: {
      asOf: all.as_of,
      all: all.average_rent,
      detached: valueOf("detached")?.average_rent ?? null,
      apartmentWooden: valueOf("apartment_wooden")?.average_rent ?? null,
      apartmentNonWooden: valueOf("apartment_non_wooden")?.average_rent ?? null,
    },
  };
}

// today は日本時間の今日（YYYY-MM-DD）。バスの時刻表の有効期限を見るのに使う
export function parseScreenData(raw: unknown, today: string): ScreenData {
  assertShape(raw);
  const { sources, findSource } = parseSources(raw.sources);

  const districts = raw.districts.map((district) => toDistrict(district, findSource, today));
  const missing = DISTRICT_IDS.filter((id) => !districts.some((district) => district.id === id));
  if (missing.length > 0) throw new ScreenDataFormatError(`地区が足りません：${missing.join("・")}`);

  return {
    generatedAt: raw.generated_at,
    sources,
    districtOrder: districts.map((district) => district.id),
    districts: Object.fromEntries(districts.map((district) => [district.id, district])) as Record<DistrictId, DistrictData>,
    marketSummary: singleState(raw.market_summary, findSource, (item) => ({
      periodFrom: item.period_from,
      periodTo: item.period_to,
      citywideCount: item.citywide_count,
      districtCount: item.district_count,
      excludedCount: item.excluded_count,
      mediationCount: item.mediation_count,
      relatedPartyCount: item.related_party_count,
      adjacentLandCount: item.adjacent_land_count,
    })),
    rent: toRent(raw.rent, findSource),
    supportPrograms: raw.support_programs.map((program) => ({
      name: program.name,
      summary: program.summary,
      category: program.category,
      officialUrl: program.official_url,
      checkedOn: program.checked_on,
    })),
    sceneTemplates: raw.scene_templates,
  };
}

const JAPAN_DATE = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" });

// 日本時間の日付（YYYY-MM-DD）。端末のタイムゾーンによらない
export function japanDate(date: Date): string {
  return JAPAN_DATE.format(date);
}
