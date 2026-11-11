import { describe, expect, it } from "vitest";
import { japanDate, parseScreenData, ScreenDataFormatError, type RawScreenData } from "./screen-data";

const section = (source_id: string, items: unknown[] = []) => ({ source_id, items });

const source = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  name: `${id} の名前`,
  publisher: "提供元",
  source_url: null,
  license: null,
  credit_text: null,
  period_label: null,
  checked_on: null,
  fetched_at: null,
  ...extra,
});

const outing = (extra: Record<string, unknown> = {}) => ({
  origin_name: "鼎公民館前",
  destination_name: "飯田駅前",
  status: "available",
  outbound_departure: "09:10",
  outbound_arrival: "09:30",
  outbound_line: "市民バス",
  return_departure: "12:15",
  return_arrival: "12:35",
  return_line: "市民バス",
  next_return_departure: null,
  next_return_arrival: null,
  next_return_line: null,
  outbound_trips_per_day: 5,
  return_trips_per_day: 6,
  origin_departures_per_day: 12,
  ...extra,
});

function district(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    name: id,
    area_description: "範囲",
    market: section("reinfolib_xit001"),
    elementary_school_districts: section("reinfolib_xkt004"),
    junior_high_school_districts: section("reinfolib_xkt005"),
    facilities: {
      schools: section("iida_education"),
      childcare: section("iida_childcare"),
      after_school_clubs: section("iida_childcare"),
      evacuation_sites: section("iida_evacuation"),
      public_facilities: section("iida_public_facilities"),
      bus_stops: section("gtfs_minamishinshu_bus"),
      train_stations: section("sena_iida_line_stations"),
    },
    train_departures: section("iida_jr_timetable"),
    train_counts: section("railway_honsu"),
    population: section("estat_census_small_area"),
    housing_tenure: section("estat_census_housing_tenure"),
    bus_outing: section("gtfs_minamishinshu_bus"),
    train_outing: section("iida_jr_timetable"),
    events: [],
    ...overrides,
  };
}

function raw(
  overrides: { sources?: unknown[]; kanae?: Record<string, unknown>; marketSummary?: unknown[]; rent?: unknown[] } = {},
): RawScreenData {
  return {
    generated_at: "2026-10-26T13:00:00+00:00",
    sources: overrides.sources ?? [],
    districts: ["kamisato", "kanae", "igara", "chushin"].map((id) => district(id, id === "kanae" ? overrides.kanae : {})),
    market_summary: section("reinfolib_xit001", overrides.marketSummary ?? []),
    rent: section("estat_housing_land_survey_rent", overrides.rent ?? []),
    support_programs: [],
    scene_templates: [],
  } as unknown as RawScreenData;
}

const TODAY = "2026-10-26";

describe("parseScreenData：家賃の参考値と借家の世帯数（034）", () => {
  const rentRows = [
    { building_type: "all", average_rent: 50043, as_of: "2023-10-01" },
    { building_type: "apartment_wooden", average_rent: 43392, as_of: "2023-10-01" },
    { building_type: "detached", average_rent: 51671, as_of: "2023-10-01" },
  ];
  const tenureRow = { as_of: "2020-10-01", households_in_housing: 5292, owner_occupied: 3549, private_rented: 1511 };

  it("建て方ごとの家賃を1つにまとめ、推計できなかった建て方は null にする", () => {
    const data = parseScreenData(
      raw({
        sources: [source("estat_housing_land_survey_rent"), source("estat_census_housing_tenure")],
        rent: rentRows,
        kanae: { housing_tenure: section("estat_census_housing_tenure", [tenureRow]) },
      }),
      TODAY,
    );
    expect(data.rent).toEqual({
      status: "available",
      source: expect.objectContaining({ id: "estat_housing_land_survey_rent" }),
      value: { asOf: "2023-10-01", all: 50043, detached: 51671, apartmentWooden: 43392, apartmentNonWooden: null },
    });
    expect(data.districts.kanae.housingTenure).toEqual({
      status: "available",
      source: expect.objectContaining({ id: "estat_census_housing_tenure" }),
      value: { asOf: "2020-10-01", householdsInHousing: 5292, ownerOccupied: 3549, privateRented: 1511 },
    });
  });

  it("出典が未公開か、民営借家全体の家賃がなければデータ未取得", () => {
    expect(parseScreenData(raw({ rent: rentRows }), TODAY).rent).toEqual({ status: "unavailable" });
    expect(
      parseScreenData(raw({ sources: [source("estat_housing_land_survey_rent")], rent: rentRows.slice(1) }), TODAY).rent,
    ).toEqual({ status: "unavailable" });
    expect(parseScreenData(raw({ kanae: { housing_tenure: section("estat_census_housing_tenure", [tenureRow]) } }), TODAY).districts.kanae.housingTenure).toEqual({
      status: "unavailable",
    });
  });
});

describe("parseScreenData：データ未取得と該当なし（F-09）", () => {
  it("出典が公開されていなければ、中身にかかわらずデータ未取得", () => {
    const data = parseScreenData(raw({ kanae: { facilities: { ...district("kanae").facilities, schools: section("iida_education", [{ name: "鼎小学校", subkind: "小学校", address: null }]) } } }), TODAY);
    expect(data.districts.kanae.schools).toEqual({ status: "unavailable" });
    expect(data.districts.kanae.market.land).toEqual({ status: "unavailable" });
    expect(data.districts.kanae.population).toEqual({ status: "unavailable" });
  });

  it("出典が公開済みで一覧が空なら該当なし、中身があれば出典つきで返す", () => {
    const data = parseScreenData(
      raw({
        sources: [source("sena_iida_line_stations"), source("iida_evacuation", { period_label: "2025年12月19日更新", checked_on: "2026-10-26" })],
        kanae: {
          facilities: {
            ...district("kanae").facilities,
            evacuation_sites: section("iida_evacuation", [{ name: "鼎中学校", subkind: "指定緊急避難場所", address: "鼎", hazards: ["flood"] }]),
          },
        },
      }),
      TODAY,
    );
    const kanae = data.districts.kanae;
    expect(kanae.trainStations).toEqual({ status: "none", source: expect.objectContaining({ id: "sena_iida_line_stations" }) });
    expect(kanae.evacuationSites).toEqual({
      status: "available",
      value: [{ name: "鼎中学校", subkind: "指定緊急避難場所", address: "鼎", hazards: ["flood"] }],
      source: expect.objectContaining({ id: "iida_evacuation", periodLabel: "2025年12月19日更新", checkedOn: "2026-10-26" }),
    });
  });

  it("相場は件数0なら該当なし、行がなければデータ未取得", () => {
    const data = parseScreenData(
      raw({
        sources: [source("reinfolib_xit001")],
        kanae: {
          market: section("reinfolib_xit001", [
            { category: "land", median_value: 24000, p25_value: 17000, p75_value: 30000, sample_count: 96, period_from: "2021Q1", period_to: "2026Q1" },
            { category: "house_built_within_20y", median_value: null, p25_value: null, p75_value: null, sample_count: 0, period_from: "2021Q1", period_to: "2026Q1" },
          ]),
        },
      }),
      TODAY,
    );
    const { market } = data.districts.kanae;
    expect(market.land).toEqual({
      status: "available",
      value: { median: 24000, p25: 17000, p75: 30000, sampleCount: 96, periodFrom: "2021Q1", periodTo: "2026Q1" },
      source: expect.objectContaining({ id: "reinfolib_xit001" }),
    });
    expect(market.house_built_within_20y.status).toBe("none");
    expect(market.house_built_over_20y.status).toBe("unavailable");
  });
});

describe("parseScreenData：相場の集計で外した取引の件数（022）", () => {
  const summary = {
    period_from: "2021Q1",
    period_to: "2026Q1",
    citywide_count: 1313,
    district_count: 792,
    excluded_count: 7,
    mediation_count: 6,
    related_party_count: 1,
    adjacent_land_count: 0,
  };

  it("相場の出典が公開済みなら件数を返し、未公開ならデータ未取得", () => {
    expect(parseScreenData(raw({ sources: [source("reinfolib_xit001")], marketSummary: [summary] }), TODAY).marketSummary).toEqual({
      status: "available",
      value: {
        periodFrom: "2021Q1",
        periodTo: "2026Q1",
        citywideCount: 1313,
        districtCount: 792,
        excludedCount: 7,
        mediationCount: 6,
        relatedPartyCount: 1,
        adjacentLandCount: 0,
      },
      source: expect.objectContaining({ id: "reinfolib_xit001" }),
    });
    expect(parseScreenData(raw({ marketSummary: [summary] }), TODAY).marketSummary).toEqual({ status: "unavailable" });
  });

  it("まだ集計していなければデータ未取得", () => {
    expect(parseScreenData(raw({ sources: [source("reinfolib_xit001")] }), TODAY).marketSummary).toEqual({ status: "unavailable" });
  });

  it("欄がない応答（関数が古い）は形の違いとして失敗する", () => {
    const old: Partial<RawScreenData> = raw();
    delete old.market_summary;
    expect(() => parseScreenData(old, TODAY)).toThrow(ScreenDataFormatError);
  });
});

describe("parseScreenData：おでかけの便（010・026）", () => {
  const BUS_ITEM = {
    day_type: "土曜",
    service_date: "2027-01-16",
    valid_until: "2027-03-31",
    destination_place_name: "飯田駅",
    district_stop_count: 25,
    reachable_stop_count: 20,
  };
  const withBus = (item: Record<string, unknown>) =>
    raw({
      sources: [source("gtfs_minamishinshu_bus")],
      kanae: { bus_outing: section("gtfs_minamishinshu_bus", [{ ...BUS_ITEM, ...item }]) },
    });

  it("バスは行き先の呼び方と、地区のバス停のうち乗りかえなしで行ける数だけを返す（バス停の名前と時刻は持たない。036）", () => {
    const state = parseScreenData(withBus({}), TODAY).districts.kanae.busOuting;
    expect(state).toEqual({
      status: "available",
      source: expect.objectContaining({ id: "gtfs_minamishinshu_bus" }),
      value: {
        dayType: "土曜",
        serviceDate: "2027-01-16",
        validUntil: "2027-03-31",
        destinationPlace: "飯田駅",
        districtStopCount: 25,
        reachableStopCount: 20,
      },
    });
  });

  it("036 より前の形（圏外用に端末に残った古いデータ）は、データ未取得にする", () => {
    const old = { destination_place_name: undefined, district_stop_count: undefined, reachable_stop_count: undefined };
    expect(parseScreenData(withBus(old), TODAY).districts.kanae.busOuting).toEqual({ status: "unavailable" });
  });

  it("用事の場所は行き先ごとの数と本数の幅を返す。古い形の RPC と有効期間切れはデータ未取得（036）", () => {
    const item = {
      place_name: "飯田市役所",
      kind: "市役所",
      day_type: "平日",
      service_date: "2027-01-15",
      valid_until: "2027-03-31",
      district_stop_count: 25,
      reachable_stop_count: 18,
      min_trips_per_day: 4,
      max_trips_per_day: 14,
    };
    const withErrands = (extra: Record<string, unknown>) =>
      raw({ sources: [source("gtfs_minamishinshu_bus")], kanae: { bus_errands: section("gtfs_minamishinshu_bus", [{ ...item, ...extra }]) } });
    expect(parseScreenData(withErrands({}), TODAY).districts.kanae.busErrands).toMatchObject({
      status: "available",
      value: [{ place: "飯田市役所", kind: "市役所", dayType: "平日", districtStopCount: 25, reachableStopCount: 18, minTripsPerDay: 4, maxTripsPerDay: 14 }],
    });
    expect(parseScreenData(withErrands({ valid_until: "2026-10-25" }), TODAY).districts.kanae.busErrands).toEqual({ status: "unavailable" });
    expect(parseScreenData(withBus({}), TODAY).districts.kanae.busErrands).toEqual({ status: "unavailable" });
  });

  it("時刻表の有効期間を過ぎたらデータ未取得。最終日までは使う", () => {
    expect(parseScreenData(withBus({ valid_until: "2026-10-25" }), TODAY).districts.kanae.busOuting).toEqual({ status: "unavailable" });
    expect(parseScreenData(withBus({ valid_until: TODAY }), TODAY).districts.kanae.busOuting.status).toBe("available");
  });

  it("電車は出典が非公開のあいだデータ未取得", () => {
    const data = parseScreenData(raw({ kanae: { train_outing: section("iida_jr_timetable", [outing()]) } }), TODAY);
    expect(data.districts.kanae.trainOuting).toEqual({ status: "unavailable" });
  });

  it("電車の本数（031）は時刻とは別の出典で、時刻が非公開でも返す", () => {
    const data = parseScreenData(
      raw({
        sources: [source("railway_honsu")],
        kanae: {
          train_departures: section("iida_jr_timetable", [{ station_name: "鼎", direction: "上り", trips_per_day: 19, first_departure: "06:00", last_departure: "23:00" }]),
          train_counts: section("railway_honsu", [{ station_name: "鼎", direction: "上り", trips_per_day: 19 }]),
        },
      }),
      TODAY,
    );
    expect(data.districts.kanae.trainDepartures).toEqual({ status: "unavailable" });
    expect(data.districts.kanae.trainCounts).toMatchObject({
      status: "available",
      value: [{ stationName: "鼎", direction: "上り", tripsPerDay: 19 }],
      source: { id: "railway_honsu" },
    });
  });
});

describe("parseScreenData：全体", () => {
  it("地区を地区マスタの順に並べ、取得日時は日本時間の日付にする", () => {
    const data = parseScreenData(raw({ sources: [source("reinfolib_xit001", { fetched_at: "2026-10-22T18:30:00+00:00" })] }), TODAY);
    expect(data.districtOrder).toEqual(["kamisato", "kanae", "igara", "chushin"]);
    expect(data.sources[0].fetchedOn).toBe("2026-10-23");
  });

  it.each([
    ["オブジェクトでない", null],
    ["地区が足りない", { ...raw(), districts: raw().districts.slice(1) }],
    ["知らない地区", { ...raw(), districts: [...raw().districts, district("matsuo")] }],
    ["欄が足りない", { ...raw(), districts: raw().districts.map((d) => ({ ...d, market: undefined })) }],
  ])("形が違えば ScreenDataFormatError（%s）", (_, value) => {
    expect(() => parseScreenData(value, TODAY)).toThrow(ScreenDataFormatError);
  });
});

describe("japanDate", () => {
  it("端末のタイムゾーンによらず日本時間の日付を返す", () => {
    expect(japanDate(new Date("2026-10-25T15:00:00Z"))).toBe("2026-10-26");
    expect(japanDate(new Date("2026-10-25T14:59:59Z"))).toBe("2026-10-25");
  });
});
