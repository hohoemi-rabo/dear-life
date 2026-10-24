// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTownResolver } from "../../../src/lib/town-district/resolve";
import { CallBudget, createHttpClient } from "./http";
import type { JobContext } from "./job";
import {
  boundsOf,
  DISTRICT_TILES,
  nextStage,
  POINT_TILES,
  refreshStartsAt,
  schools,
  tilesOf,
  toChildcareRows,
  toSchoolRows,
  type ChildcareProperties,
  type PointFeature,
  type SchoolProperties,
} from "./jobs/schools";
import { RawJson, type SupabaseRest } from "./supabase";
import { toJstDate } from "./time";
import { UnmappedTownCollector } from "./towns";

const resolveTown = createTownResolver([
  { townName: "鼎", cityDistrict: "鼎", districtId: "kanae" },
  { townName: "今宮町", cityDistrict: "丸山", districtId: "chushin" },
  { townName: "宮ノ上", cityDistrict: "東野", districtId: "chushin" },
  { townName: "松尾", cityDistrict: "松尾", districtId: null },
]);

function point<P>(properties: P, coordinates: [number, number] = [137.82, 35.51]): PointFeature<P> {
  return { type: "Feature", geometry: { type: "Point", coordinates }, properties };
}

function school(overrides: Partial<SchoolProperties> = {}): PointFeature<SchoolProperties> {
  return point({
    P29_001: "20205",
    P29_002: "B120220500019",
    P29_003_name_ja: "小学校",
    P29_004_ja: "飯田市立丸山小学校",
    P29_005_ja: "長野県飯田市今宮町2-113-1",
    P29_006: 3,
    P29_007: 1,
    P29_008: "00",
    P29_009_ja: "",
    ...overrides,
  });
}

// 幼稚園・こども園（学校データ）と保育園（福祉施設データ）で項目が違う
function kindergarten(overrides: Partial<ChildcareProperties> = {}): PointFeature<ChildcareProperties> {
  return point({
    administrativeAreaCode: "20205",
    preSchoolName_ja: "幼保連携型認定こども園入舟幼稚園",
    location_ja: "長野県飯田市宮ノ上4730",
    administratorCode: 4,
    schoolCode: "A220320500018",
    schoolClassCode_name_ja: "幼保連携型認定こども園",
    closeSchoolCode: 0,
    ...overrides,
  });
}

function nursery(overrides: Partial<ChildcareProperties> = {}): PointFeature<ChildcareProperties> {
  return point({
    administrativeAreaCode: "20205",
    preSchoolName_ja: "入舟幼稚園・入舟保育園",
    location_ja: "宮ノ上4730",
    administratorCode: 4,
    schoolCode: "",
    welfareFacilityMinorClassCode: "050401",
    ...overrides,
  });
}

describe("タイル", () => {
  it("学校・保育施設は z13 の12タイル、学区は z11 の6タイルを取る", () => {
    expect(tilesOf(POINT_TILES)).toHaveLength(12);
    expect(tilesOf(DISTRICT_TILES)).toHaveLength(6);
    expect(tilesOf(DISTRICT_TILES)[0]).toEqual({ z: 11, x: 1807, y: 806 });
  });

  it("タイルの範囲の経度・緯度を出す。4地区（経度 137.78〜137.86・緯度 35.47〜35.53 あたり）をおおう", () => {
    const points = boundsOf(POINT_TILES);
    expect(points.west).toBeCloseTo(137.7246, 3);
    expect(points.east).toBeCloseTo(137.9004, 3);
    expect(points.south).toBeCloseTo(35.4607, 3);
    expect(points.north).toBeCloseTo(35.5679, 3);
    const districts = boundsOf(DISTRICT_TILES);
    expect(districts.west).toBeCloseTo(137.6367, 3);
    expect(districts.north).toBeCloseTo(35.7465, 3);
    expect(districts.south).toBeCloseTo(35.3174, 3);
  });
});

describe("取り直しの時期", () => {
  const day = (iso: string) => toJstDate(Date.parse(`${iso}T03:00:00+09:00`));

  it("日本時間の6月1日を境に、その年の取り直しが始まる", () => {
    expect(refreshStartsAt(day("2026-10-24"))).toBe(Date.parse("2026-06-01T00:00:00+09:00"));
    expect(refreshStartsAt(day("2027-05-31"))).toBe(Date.parse("2026-06-01T00:00:00+09:00"));
    expect(refreshStartsAt(day("2027-06-01"))).toBe(Date.parse("2027-06-01T00:00:00+09:00"));
  });

  const sources = (fetched: Partial<Record<"xkt004" | "xkt005" | "xkt006" | "xkt007", string>>) =>
    (["xkt004", "xkt005", "xkt006", "xkt007"] as const).map((id) => ({ id: `reinfolib_${id}`, fetched_at: fetched[id] ?? null }));

  it("学校 → 保育施設 → 学区の順に、取り直しが要るものを1つ選ぶ", () => {
    const today = day("2026-10-24");
    expect(nextStage(sources({}), today)).toBe("schools");
    expect(nextStage(sources({ xkt006: "2026-10-24T18:00:00Z" }), today)).toBe("childcare");
    expect(nextStage(sources({ xkt006: "2026-10-24T18:00:00Z", xkt007: "2026-10-25T18:00:00Z" }), today)).toBe("school_districts");
    expect(
      nextStage(sources({ xkt006: "2026-10-24T18:00:00Z", xkt007: "2026-10-25T18:00:00Z", xkt004: "2026-10-26T18:00:00Z" }), today),
    ).toBe("school_districts");
    const all = { xkt004: "2026-10-26T18:00:00Z", xkt005: "2026-10-26T18:00:00Z", xkt006: "2026-10-24T18:00:00Z", xkt007: "2026-10-25T18:00:00Z" };
    expect(nextStage(sources(all), today)).toBeNull();
    // 翌年の6月1日を過ぎると、また学校から取り直す
    expect(nextStage(sources(all), day("2027-05-31"))).toBeNull();
    expect(nextStage(sources(all), day("2027-06-01"))).toBe("schools");
  });
});

describe("toSchoolRows", () => {
  it("飯田市の学校を住所の町名で4地区に振り分け、タイルの境目で重なった学校は1つにする", () => {
    const unmapped = new UnmappedTownCollector();
    const rows = toSchoolRows([school(), school(), school({ P29_008: "02", P29_009_ja: "分校" })], resolveTown, unmapped);
    expect(rows).toEqual([
      {
        kind: "school",
        subkind: "小学校",
        name: "飯田市立丸山小学校",
        address: "長野県飯田市今宮町2-113-1",
        town_name: "今宮町",
        district_id: "chushin",
        latitude: 35.51,
        longitude: 137.82,
        source_key: "B120220500019-00",
        attributes: { school_code: "B120220500019", administrator_code: 3, closed_code: 1 },
      },
      expect.objectContaining({ source_key: "B120220500019-02", attributes: expect.objectContaining({ note: "分校" }) }),
    ]);
    expect(unmapped.size).toBe(0);
  });

  it("ほかの市町村の学校と4地区の外の学校は入れず、対応表にない町名は出典を付けて記録する", async () => {
    const unmapped = new UnmappedTownCollector();
    const rows = toSchoolRows(
      [
        school({ P29_001: "20407", P29_002: "B1", P29_005_ja: "長野県下伊那郡阿智村駒場1" }),
        school({ P29_002: "B2", P29_005_ja: "長野県飯田市松尾城3800-1" }),
        school({ P29_002: "B3", P29_005_ja: "長野県飯田市南信濃和田1165" }),
      ],
      resolveTown,
      unmapped,
    );
    expect(rows).toEqual([]);
    const rpc = vi.fn(async () => null);
    await unmapped.flush({ rpc } as unknown as SupabaseRest, null);
    expect(rpc).toHaveBeenCalledWith("record_unmapped_towns", { p_source_id: "reinfolib_xkt006", p_town_names: ["南信濃和田"] });
  });

  it("位置が点でなければ止める", () => {
    const broken = { ...school(), geometry: { type: "Polygon", coordinates: [] } };
    expect(() => toSchoolRows([broken], resolveTown, new UnmappedTownCollector())).toThrow(/位置が点になっていない/);
  });
});

describe("toChildcareRows", () => {
  it("学校データと福祉施設データで所在地が同じ施設は1つにまとめ、学校データの名前と種類を使う", () => {
    const rows = toChildcareRows([nursery(), kindergarten(), kindergarten()], resolveTown, new UnmappedTownCollector());
    expect(rows).toEqual([
      {
        kind: "childcare",
        subkind: "幼保連携型認定こども園",
        name: "幼保連携型認定こども園入舟幼稚園",
        address: "長野県飯田市宮ノ上4730",
        town_name: "宮ノ上",
        district_id: "chushin",
        latitude: 35.51,
        longitude: 137.82,
        source_key: "A220320500018",
        attributes: { administrator_code: 4, school_code: "A220320500018", closed_code: 0, other_names: ["入舟幼稚園・入舟保育園"] },
      },
    ]);
  });

  it("福祉施設データだけの保育園は、小分類コードから種類を出す。ほかの市町村のものは入れない", () => {
    const rows = toChildcareRows(
      [
        nursery({ preSchoolName_ja: "認定こども園鼎あかり保育園", location_ja: "鼎中平2010-1", welfareFacilityMinorClassCode: "050403" }),
        nursery({ administrativeAreaCode: "20407", preSchoolName_ja: "清内路保育園", location_ja: "鼎1" }),
      ],
      resolveTown,
      new UnmappedTownCollector(),
    );
    expect(rows).toEqual([
      expect.objectContaining({
        subkind: "保育所型認定こども園",
        name: "認定こども園鼎あかり保育園",
        town_name: "鼎中平",
        district_id: "kanae",
        source_key: "050403:鼎中平2010-1",
        attributes: { administrator_code: 4, welfare_class_code: "050403" },
      }),
    ]);
  });
});

// 2026-10-25（日）03:00 JST
const TODAY = toJstDate(Date.parse("2026-10-24T18:00:00Z"));

type Fetched = Partial<Record<"reinfolib_xkt004" | "reinfolib_xkt005" | "reinfolib_xkt006" | "reinfolib_xkt007", string | null>>;

// 不動産情報ライブラリと Supabase の代わり
function fakeWorld(options: { fetched: Fetched; tileBody?: (api: string, x: number, y: number) => unknown }) {
  const requests: URL[] = [];
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input));
    requests.push(url);
    const api = url.pathname.split("/").pop() ?? "";
    const body = options.tileBody?.(api, Number(url.searchParams.get("x")), Number(url.searchParams.get("y"))) ?? {
      type: "FeatureCollection",
      features: [],
    };
    return new Response(JSON.stringify(body), { status: 200 });
  });

  const rpcs: { fn: string; args: Record<string, unknown> | RawJson }[] = [];
  const updates: { table: string; filter: string; patch: Record<string, unknown> }[] = [];
  const db: SupabaseRest = {
    async select<T>() {
      return Object.entries({ reinfolib_xkt004: null, reinfolib_xkt005: null, reinfolib_xkt006: null, reinfolib_xkt007: null, ...options.fetched }).map(
        ([id, fetched_at]) => ({ id, fetched_at }),
      ) as T[];
    },
    insert: async () => [],
    async update<T>(table: string, filter: string, patch: Record<string, unknown>) {
      updates.push({ table, filter, patch });
      return [] as T[];
    },
    async rpc<T>(fn: string, args: Record<string, unknown> | RawJson) {
      rpcs.push({ fn, args });
      return 3 as T;
    },
  };

  const context: JobContext = {
    env: { SUPABASE_URL: "https://db.example.com", SUPABASE_SERVICE_ROLE_KEY: "service-key", REINFOLIB_API_KEY: "api-key" },
    today: TODAY,
    external: createHttpClient({ budget: new CallBudget(), maxRetries: 0, fetch: fetchMock as unknown as typeof fetch }),
    db,
    townResolver: async () => resolveTown,
    unmappedTowns: new UnmappedTownCollector(),
    previousProgress: async () => null,
  };
  return { context, requests, rpcs, updates };
}

beforeEach(() => {
  vi.useFakeTimers({ now: Date.parse("2026-10-24T18:00:00Z"), toFake: ["Date", "setTimeout"] });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// 呼び出しの間隔（1.5秒）を待たずに進める
async function runJob(context: JobContext) {
  const promise = schools.run(context);
  await vi.runAllTimersAsync();
  return promise;
}

describe("schools", () => {
  it("初回は学校だけを取り、12タイルの点を4地区に振り分けて入れ直し、取得日時を記録する", async () => {
    const world = fakeWorld({ fetched: {}, tileBody: (api, x, y) => (x === 7232 && y === 3230 ? { features: [school()] } : { features: [] }) });
    const result = await runJob(world.context);

    expect(world.requests).toHaveLength(12);
    expect(world.requests.every((url) => url.pathname.endsWith("/XKT006") && url.searchParams.get("z") === "13")).toBe(true);
    expect(world.rpcs).toEqual([
      { fn: "replace_facilities", args: { p_source_id: "reinfolib_xkt006", p_rows: [expect.objectContaining({ name: "飯田市立丸山小学校" })] } },
    ]);
    expect(world.updates).toEqual([
      { table: "data_sources", filter: "id=in.(reinfolib_xkt006)", patch: { fetched_at: "2026-10-24T18:00:00.000Z" } },
    ]);
    expect(result).toEqual({ rowsWritten: 3 });
  });

  it("学校のあとの日は保育施設を取る", async () => {
    const world = fakeWorld({ fetched: { reinfolib_xkt006: "2026-10-23T18:00:00Z" } });
    await runJob(world.context);
    expect(world.requests.every((url) => url.pathname.endsWith("/XKT007"))).toBe(true);
    expect(world.rpcs.map((call) => call.fn)).toEqual(["replace_facilities"]);
  });

  it("学区は飯田市にしぼって6タイルずつ取り、応答を読まずにつなげて小学校区・中学校区の順に渡す", async () => {
    const world = fakeWorld({
      fetched: { reinfolib_xkt006: "2026-10-23T18:00:00Z", reinfolib_xkt007: "2026-10-24T00:00:00Z" },
      tileBody: (api, x, y) => ({ type: "FeatureCollection", name: `${api}-${x}-${y}`, features: [] }),
    });
    const result = await runJob(world.context);

    expect(world.requests).toHaveLength(12);
    expect(world.requests.every((url) => url.searchParams.get("administrativeAreaCode") === "20205" && url.searchParams.get("z") === "11")).toBe(true);
    expect(world.rpcs.map((call) => call.fn)).toEqual(["replace_school_districts", "replace_school_districts"]);
    const bodies = world.rpcs.map((call) => JSON.parse((call.args as RawJson).text));
    expect(bodies[0]).toMatchObject({ p_level: "elementary", p_source_id: "reinfolib_xkt004", p_bounds: boundsOf(DISTRICT_TILES) });
    expect(bodies[0].p_tiles.map((tile: { name: string }) => tile.name)).toEqual([
      "XKT004-1807-806",
      "XKT004-1807-807",
      "XKT004-1807-808",
      "XKT004-1808-806",
      "XKT004-1808-807",
      "XKT004-1808-808",
    ]);
    expect(bodies[1]).toMatchObject({ p_level: "junior_high", p_source_id: "reinfolib_xkt005" });
    expect(world.updates).toEqual([
      { table: "data_sources", filter: "id=in.(reinfolib_xkt004,reinfolib_xkt005)", patch: { fetched_at: "2026-10-24T18:00:00.000Z" } },
    ]);
    expect(result).toEqual({ rowsWritten: 6 });
  });

  it("全部が今年の6月1日より後に取ったものなら、API を呼ばない", async () => {
    const fresh = "2026-07-01T00:00:00Z";
    const world = fakeWorld({
      fetched: { reinfolib_xkt004: fresh, reinfolib_xkt005: fresh, reinfolib_xkt006: fresh, reinfolib_xkt007: fresh },
    });
    expect(await runJob(world.context)).toEqual({ rowsWritten: 0 });
    expect(world.requests).toHaveLength(0);
    expect(world.rpcs).toHaveLength(0);
  });

  it("応答の形が違えば、入れ直さずに失敗する", async () => {
    const world = fakeWorld({ fetched: {}, tileBody: () => ({ message: "error" }) });
    const promise = schools.run(world.context);
    const assertion = expect(promise).rejects.toThrow(/XKT006 の応答の形が想定と違う/);
    await vi.runAllTimersAsync();
    await assertion;
    expect(world.rpcs).toHaveLength(0);
  });
});
