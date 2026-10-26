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
    population: section("estat_census_small_area"),
    bus_outing: section("gtfs_minamishinshu_bus"),
    train_outing: section("iida_jr_timetable"),
    events: [],
    ...overrides,
  };
}

function raw(overrides: { sources?: unknown[]; kanae?: Record<string, unknown> } = {}): RawScreenData {
  return {
    generated_at: "2026-10-26T13:00:00+00:00",
    sources: overrides.sources ?? [],
    districts: ["kamisato", "kanae", "igara", "chushin"].map((id) => district(id, id === "kanae" ? overrides.kanae : {})),
    support_programs: [],
    scene_templates: [],
  } as unknown as RawScreenData;
}

const TODAY = "2026-10-26";

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

describe("parseScreenData：おでかけの便（010・026）", () => {
  const withBus = (item: Record<string, unknown>) =>
    raw({
      sources: [source("gtfs_minamishinshu_bus")],
      kanae: { bus_outing: section("gtfs_minamishinshu_bus", [outing({ day_type: "土曜", service_date: "2027-01-16", valid_until: "2027-03-31", ...item })]) },
    });

  it("行き・帰りの便を返し、次の便がなければ null にする", () => {
    const state = parseScreenData(withBus({}), TODAY).districts.kanae.busOuting;
    expect(state).toEqual({
      status: "available",
      source: expect.objectContaining({ id: "gtfs_minamishinshu_bus" }),
      value: {
        originName: "鼎公民館前",
        destinationName: "飯田駅前",
        outbound: { departure: "09:10", arrival: "09:30", line: "市民バス" },
        return: { departure: "12:15", arrival: "12:35", line: "市民バス" },
        nextReturn: null,
        outboundTripsPerDay: 5,
        returnTripsPerDay: 6,
        originDeparturesPerDay: 12,
        dayType: "土曜",
        serviceDate: "2027-01-16",
        validUntil: "2027-03-31",
      },
    });
  });

  it("便が見つからない行は該当なし（この条件で使える便は見つかりませんでした）", () => {
    const state = parseScreenData(
      withBus({ status: "no_return", return_departure: null, return_arrival: null, return_line: null }),
      TODAY,
    ).districts.kanae.busOuting;
    expect(state.status).toBe("none");
  });

  it("時刻表の有効期間を過ぎたらデータ未取得。最終日までは使う", () => {
    expect(parseScreenData(withBus({ valid_until: "2026-10-25" }), TODAY).districts.kanae.busOuting).toEqual({ status: "unavailable" });
    expect(parseScreenData(withBus({ valid_until: TODAY }), TODAY).districts.kanae.busOuting.status).toBe("available");
  });

  it("電車は出典が非公開のあいだデータ未取得", () => {
    const data = parseScreenData(raw({ kanae: { train_outing: section("iida_jr_timetable", [outing()]) } }), TODAY);
    expect(data.districts.kanae.trainOuting).toEqual({ status: "unavailable" });
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
