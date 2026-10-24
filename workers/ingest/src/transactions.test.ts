// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTownResolver } from "../../../src/lib/town-district/resolve";
import { CallBudget, createHttpClient } from "./http";
import type { JobContext } from "./job";
import { toTransactionRow, transactions, type TransactionRow, type Xit001Row } from "./jobs/transactions";
import type { SupabaseRest } from "./supabase";
import { toJstDate } from "./time";
import { UnmappedTownCollector } from "./towns";

const resolveTown = createTownResolver([
  { townName: "鼎", cityDistrict: "鼎", districtId: "kanae" },
  { townName: "大瀬木", cityDistrict: "伊賀良", districtId: "igara" },
  { townName: "松尾", cityDistrict: "松尾", districtId: null },
]);

// API の1行。値はすべて文字列で、ないときは空文字（実際の応答と同じ形）
function apiRow(overrides: Partial<Xit001Row> = {}): Xit001Row {
  return {
    PriceCategory: "不動産取引価格情報",
    Type: "宅地(土地と建物)",
    Region: "住宅地",
    MunicipalityCode: "20205",
    Prefecture: "長野県",
    Municipality: "飯田市",
    DistrictName: "大瀬木",
    DistrictCode: "202050150",
    TradePrice: "15000000",
    PricePerUnit: "",
    UnitPrice: "",
    Area: "250",
    BuildingYear: "1994年",
    Use: "住宅",
    Period: "2026年第1四半期",
    Remarks: "",
    ...overrides,
  };
}

describe("toTransactionRow", () => {
  it("数を読み、地区を振り分ける", () => {
    expect(toTransactionRow(apiRow(), resolveTown)).toEqual({
      row: {
        trade_year: 2026,
        trade_quarter: 1,
        price_category: "不動産取引価格情報",
        property_type: "宅地(土地と建物)",
        town_name: "大瀬木",
        district_code: "202050150",
        district_id: "igara",
        trade_price: 15000000,
        unit_price_per_sqm: null,
        area_sqm: 250,
        building_year: 1994,
        use: "住宅",
        circumstances: null,
        is_excluded: false,
        raw: apiRow(),
      },
      unmapped: false,
    });
  });

  it("建築年が「戦前」や空なら不明、面積が「2000㎡以上」なら空にする。空の用途は null（住宅に含める側）", () => {
    const { row } = toTransactionRow(
      apiRow({ BuildingYear: "戦前", Area: "2000㎡以上", Use: "", UnitPrice: "33000" }),
      resolveTown,
    );
    expect(row).toMatchObject({ building_year: null, area_sqm: null, use: null, unit_price_per_sqm: 33000 });
  });

  it.each([
    ["調停・競売等", true],
    ["関係者間取引", true],
    ["隣地の購入", true],
    ["私道を含む取引、隣地の購入", true],
    ["私道を含む取引", false],
    ["", false],
  ])("取引の事情等が「%s」なら除外は %s（行は残す）", (remarks, excluded) => {
    const { row } = toTransactionRow(apiRow({ Remarks: remarks }), resolveTown);
    expect(row.is_excluded).toBe(excluded);
    expect(row.circumstances).toBe(remarks === "" ? null : remarks);
  });

  it("対象外の地区は振り分け済み（地区なし）、対応表にない町名は unmapped にする", () => {
    expect(toTransactionRow(apiRow({ DistrictName: "松尾" }), resolveTown)).toMatchObject({
      row: { district_id: null },
      unmapped: false,
    });
    expect(toTransactionRow(apiRow({ DistrictName: "南信濃和田" }), resolveTown)).toMatchObject({
      row: { district_id: null, town_name: "南信濃和田" },
      unmapped: true,
    });
  });

  it("取引時期が読めなければ止める", () => {
    expect(() => toTransactionRow(apiRow({ Period: "" }), resolveTown)).toThrow(/取引時期が読めない/);
  });
});

// 2026-10-23（金）03:00 JST
const TODAY = toJstDate(Date.parse("2026-10-22T18:00:00Z"));

type ApiRequest = { year: string | null; quarter: string | null; city: string | null; priceClassification: string | null };

// XIT001 と Supabase の代わり。published の四半期だけ取引があるとして答える
function fakeWorld(options: { published: string[]; stored?: { trade_year: number; trade_quarter: number }[]; apiBody?: unknown }) {
  const apiRequests: ApiRequest[] = [];
  const apiHeaders: (HeadersInit | undefined)[] = [];
  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const year = url.searchParams.get("year");
    const quarter = url.searchParams.get("quarter");
    apiRequests.push({ year, quarter, city: url.searchParams.get("city"), priceClassification: url.searchParams.get("priceClassification") });
    apiHeaders.push(init?.headers);
    if (options.apiBody !== undefined) return new Response(JSON.stringify(options.apiBody), { status: 200 });
    const quarters = options.published.filter((q) => q.startsWith(`${year}Q`) && (quarter === null || q === `${year}Q${quarter}`));
    if (quarters.length === 0) return new Response('{"message":"検索結果がありません。"}', { status: 404 });
    const data = quarters.map((q) => apiRow({ Period: `${q.slice(0, 4)}年第${q.slice(5)}四半期`, DistrictName: q === "2026Q1" ? "南信濃和田" : "鼎" }));
    return new Response(JSON.stringify({ status: "OK", data }), { status: 200 });
  });

  const replaced: { p_year: number; p_rows: TransactionRow[] }[] = [];
  const refreshed: { p_period_from: string; p_period_to: string }[] = [];
  const updates: { table: string; filter: string; patch: Record<string, unknown> }[] = [];
  const db: SupabaseRest = {
    select: async () => [],
    insert: async () => [],
    async update<T>(table: string, filter: string, patch: Record<string, unknown>) {
      updates.push({ table, filter, patch });
      return [] as T[];
    },
    async rpc<T>(fn: string, args: Record<string, unknown>) {
      if (fn === "real_estate_transaction_quarters") {
        return (options.stored ?? []).map((q) => ({ ...q, row_count: 1 })) as T;
      }
      if (fn === "replace_real_estate_transactions") {
        const call = args as { p_year: number; p_rows: TransactionRow[] };
        replaced.push(call);
        return call.p_rows.length as T;
      }
      if (fn === "refresh_market_stats") {
        refreshed.push(args as { p_period_from: string; p_period_to: string });
        return 12 as T;
      }
      throw new Error(`想定していない rpc：${fn}`);
    },
  };

  const unmappedTowns = new UnmappedTownCollector();
  const addSpy = vi.spyOn(unmappedTowns, "add");
  const context: JobContext = {
    env: { SUPABASE_URL: "https://db.example.com", SUPABASE_SERVICE_ROLE_KEY: "service-key", REINFOLIB_API_KEY: "api-key" },
    today: TODAY,
    external: createHttpClient({ budget: new CallBudget(), maxRetries: 0, fetch: fetchMock as unknown as typeof fetch }),
    db,
    townResolver: async () => resolveTown,
    unmappedTowns,
    previousProgress: async () => null,
  };
  return { context, apiRequests, apiHeaders, replaced, refreshed, updates, addSpy };
}

const ALL_YEARS = (to: { year: number; quarter: number }) => {
  const stored: { trade_year: number; trade_quarter: number }[] = [];
  for (let year = 2021; year <= to.year; year += 1) {
    for (let quarter = 1; quarter <= (year === to.year ? to.quarter : 4); quarter += 1) stored.push({ trade_year: year, trade_quarter: quarter });
  }
  return stored;
};

const PUBLISHED_UNTIL_2026Q1 = ALL_YEARS({ year: 2026, quarter: 1 }).map((q) => `${q.trade_year}Q${q.trade_quarter}`);

beforeEach(() => {
  vi.useFakeTimers({ now: Date.parse("2026-10-22T18:00:00Z"), toFake: ["Date"] });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("transactions（初回）", () => {
  it("今の四半期の1つ前からさかのぼって最新の四半期を見つけ、対象期間の年をすべて取り込む", async () => {
    const world = fakeWorld({ published: PUBLISHED_UNTIL_2026Q1 });
    const result = await transactions.run(world.context);

    // 2026Q3 → 2026Q2 は未公開、2026Q1 で見つかる。そのあと 2021〜2026 年を年ごとに取る
    expect(world.apiRequests.map((r) => `${r.year}${r.quarter ? `Q${r.quarter}` : ""}`)).toEqual([
      "2026Q3",
      "2026Q2",
      "2026Q1",
      "2021",
      "2022",
      "2023",
      "2024",
      "2025",
      "2026",
    ]);
    expect(world.replaced.map((r) => r.p_year)).toEqual([2021, 2022, 2023, 2024, 2025, 2026]);
    expect(result.rowsWritten).toBe(21);
    // 相場は取り込んだあとに、5.1 と同じ21四半期で集計する
    expect(world.refreshed).toEqual([{ p_period_from: "2021Q1", p_period_to: "2026Q1" }]);
    expect(world.updates).toEqual([
      {
        table: "data_sources",
        filter: "id=eq.reinfolib_xit001",
        patch: { fetched_at: "2026-10-22T18:00:00.000Z", period_label: "2021年第1四半期〜2026年第1四半期" },
      },
    ]);
  });

  it("飯田市を指定し、価格情報区分は指定しない（取引価格と成約価格の両方）。API キーはヘッダーで送る", async () => {
    const world = fakeWorld({ published: PUBLISHED_UNTIL_2026Q1 });
    await transactions.run(world.context);

    expect(world.apiRequests.every((r) => r.city === "20205" && r.priceClassification === null)).toBe(true);
    expect(world.apiHeaders[0]).toEqual({ "Ocp-Apim-Subscription-Key": "api-key" });
  });

  it("対応表にない町名を集める", async () => {
    const world = fakeWorld({ published: PUBLISHED_UNTIL_2026Q1 });
    await transactions.run(world.context);

    expect(world.addSpy.mock.calls).toEqual([["南信濃和田"]]);
  });

  it("直近の四半期がどれも返ってこなければ失敗にする", async () => {
    const world = fakeWorld({ published: [] });
    await expect(transactions.run(world.context)).rejects.toThrow(/1件も返ってこなかった/);
    expect(world.replaced).toEqual([]);
    expect(world.refreshed).toEqual([]);
  });
});

describe("transactions（毎日）", () => {
  it("次の四半期が出ていなければ、確かめる1回だけで取引は書かない。相場は同じ期間で集計し直す", async () => {
    const world = fakeWorld({ published: PUBLISHED_UNTIL_2026Q1, stored: ALL_YEARS({ year: 2026, quarter: 1 }) });
    const result = await transactions.run(world.context);

    expect(world.apiRequests).toEqual([{ year: "2026", quarter: "2", city: "20205", priceClassification: null }]);
    expect(world.replaced).toEqual([]);
    expect(world.updates).toEqual([]);
    expect(world.refreshed).toEqual([{ p_period_from: "2021Q1", p_period_to: "2026Q1" }]);
    expect(result.rowsWritten).toBe(0);
  });

  it("次の四半期が出たら、その年を取り直して対象期間を1つ進める", async () => {
    const world = fakeWorld({
      published: [...PUBLISHED_UNTIL_2026Q1, "2026Q2"],
      stored: ALL_YEARS({ year: 2026, quarter: 1 }),
    });
    await transactions.run(world.context);

    expect(world.apiRequests.map((r) => `${r.year}${r.quarter ? `Q${r.quarter}` : ""}`)).toEqual(["2026Q2", "2026Q3", "2026"]);
    expect(world.replaced.map((r) => [r.p_year, r.p_rows.length])).toEqual([[2026, 2]]);
    expect(world.updates[0].patch).toMatchObject({ period_label: "2021年第2四半期〜2026年第2四半期" });
    expect(world.refreshed).toEqual([{ p_period_from: "2021Q2", p_period_to: "2026Q2" }]);
  });

  it("年が変わって第1四半期が出たら、新しい年だけを取る", async () => {
    const world = fakeWorld({
      published: [...PUBLISHED_UNTIL_2026Q1, "2026Q2", "2026Q3", "2026Q4", "2027Q1"],
      stored: ALL_YEARS({ year: 2026, quarter: 4 }),
    });
    await transactions.run(world.context);

    expect(world.replaced.map((r) => r.p_year)).toEqual([2027]);
  });

  it("対象期間に抜けている年があれば、次の四半期が出ていなくても取り込む（途中で失敗した初回の続き）", async () => {
    const world = fakeWorld({
      published: PUBLISHED_UNTIL_2026Q1,
      stored: ALL_YEARS({ year: 2026, quarter: 1 }).filter((q) => q.trade_year !== 2023),
    });
    await transactions.run(world.context);

    expect(world.replaced.map((r) => r.p_year)).toEqual([2023]);
  });
});

describe("transactions（設定・応答の異常）", () => {
  it("API キーが登録されていなければ、呼ばずに失敗にする", async () => {
    const world = fakeWorld({ published: PUBLISHED_UNTIL_2026Q1 });
    world.context.env.REINFOLIB_API_KEY = undefined;
    await expect(transactions.run(world.context)).rejects.toThrow(/REINFOLIB_API_KEY が登録されていない/);
    expect(world.apiRequests).toEqual([]);
  });

  it("応答の形が想定と違えば失敗にする", async () => {
    const world = fakeWorld({ published: PUBLISHED_UNTIL_2026Q1, apiBody: { status: "OK", items: [] } });
    await expect(transactions.run(world.context)).rejects.toThrow(/応答の形が想定と違う/);
  });
});
