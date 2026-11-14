// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { CallBudget, createHttpClient } from "./http";
import type { JobContext } from "./job";
import {
  CITY_FETCHES_PER_RUN,
  cityTransactions,
  planCityFetches,
  toCityTransactionRow,
  type CityCode,
  type CityFetch,
  type CityTransactionRow,
} from "./jobs/city-transactions";
import type { Xit001Row } from "./jobs/transactions";
import type { SupabaseRest } from "./supabase";
import { toJstDate } from "./time";
import { UnmappedTownCollector } from "./towns";

function apiRow(overrides: Partial<Xit001Row> = {}): Xit001Row {
  return {
    PriceCategory: "成約価格情報",
    Type: "宅地(土地と建物)",
    DistrictName: "生麦",
    DistrictCode: "141010010",
    TradePrice: "45000000",
    UnitPrice: "",
    Area: "80",
    BuildingYear: "2012年",
    Use: "住宅",
    Period: "2025年第1四半期",
    Remarks: "",
    ...overrides,
  };
}

describe("toCityTransactionRow", () => {
  it("相場の計算に使う列だけにし、数の読み方・除外は飯田と同じ", () => {
    expect(toCityTransactionRow(apiRow({ Remarks: "関係者間取引" }))).toEqual<CityTransactionRow>({
      trade_year: 2025,
      trade_quarter: 1,
      property_type: "宅地(土地と建物)",
      trade_price: 45000000,
      unit_price_per_sqm: null,
      area_sqm: 80,
      building_year: 2012,
      use: "住宅",
      is_excluded: true,
    });
    expect(toCityTransactionRow(apiRow({ Type: "宅地(土地)", UnitPrice: "520000", BuildingYear: "", Use: "" }))).toMatchObject({
      unit_price_per_sqm: 520000,
      building_year: null,
      use: null,
    });
  });

  it("中古マンション・農地などは残さない", () => {
    expect(toCityTransactionRow(apiRow({ Type: "中古マンション等" }))).toBeNull();
    expect(toCityTransactionRow(apiRow({ Type: "農地" }))).toBeNull();
  });
});

const LATEST = { year: 2026, quarter: 2 } as const;
const OLDEST = { year: 2021, quarter: 2 } as const;
const YEARS = [2021, 2022, 2023, 2024, 2025, 2026];
const codes = (n: number, city = "tokyo"): CityCode[] =>
  Array.from({ length: n }, (_, i) => ({ city_id: city, reinfolib_code: String(13101 + i) }));
const fetched = (code: string, years: number[], known = "2026Q2"): CityFetch[] =>
  years.map((trade_year) => ({ reinfolib_code: code, trade_year, known_latest: known }));

describe("planCityFetches", () => {
  it("初回の83コード×6年は1回の上限に収まるところまでコード単位で取り、残りを数える。上限を超えない", () => {
    const all = [...codes(23), ...codes(18, "yokohama").map((c, i) => ({ ...c, reinfolib_code: String(14101 + i) }))];
    const { plan, remaining, total } = planCityFetches(all, [], OLDEST, LATEST, CITY_FETCHES_PER_RUN);
    const planned = plan.reduce((sum, item) => sum + item.years.length, 0);
    expect(planned).toBeLessThanOrEqual(CITY_FETCHES_PER_RUN);
    expect(planned).toBe(150);
    expect(plan[0]).toEqual({ code: "13101", years: YEARS });
    expect(total).toBe(41 * 6);
    expect(remaining).toBe(total - 150);
  });

  it("上限の日を何日か重ねると、すべて取り終える（初回の83コードは4日）", () => {
    const all: CityCode[] = Array.from({ length: 83 }, (_, i) => ({ city_id: "x", reinfolib_code: String(10000 + i) }));
    let done: CityFetch[] = [];
    let days = 0;
    for (;;) {
      const { plan, remaining } = planCityFetches(all, done, OLDEST, LATEST, CITY_FETCHES_PER_RUN);
      if (plan.length === 0) break;
      days += 1;
      done = [...done, ...plan.flatMap((item) => fetched(item.code, item.years))];
      if (remaining === 0) break;
    }
    expect(days).toBe(4);
    expect(planCityFetches(all, done, OLDEST, LATEST, CITY_FETCHES_PER_RUN).total).toBe(0);
  });

  it("取り終えたあとは、新しい四半期が出た年からだけを取り直す", () => {
    const done = fetched("13101", YEARS, "2026Q1");
    expect(planCityFetches(codes(1), done, OLDEST, LATEST, 150).plan).toEqual([{ code: "13101", years: [2026] }]);
    // 年をまたいで新しい四半期が出たら（2025Q4 まで取ってあり、最新が 2026Q2）、新しい年だけ
    const beforeNewYear = fetched("13101", [2021, 2022, 2023, 2024, 2025], "2025Q4");
    expect(planCityFetches(codes(1), beforeNewYear, OLDEST, LATEST, 150).plan).toEqual([{ code: "13101", years: [2026] }]);
    expect(planCityFetches(codes(1), fetched("13101", YEARS), OLDEST, LATEST, 150).plan).toEqual([]);
  });
});

// 2026-11-15（日）03:00 JST
const TODAY = toJstDate(Date.parse("2026-11-14T18:00:00Z"));

function fakeWorld(options: { iidaLatest: { trade_year: number; trade_quarter: number } | null; codes: CityCode[]; fetches?: CityFetch[] }) {
  const apiRequests: { year: string | null; city: string | null }[] = [];
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input));
    apiRequests.push({ year: url.searchParams.get("year"), city: url.searchParams.get("city") });
    const year = url.searchParams.get("year");
    const data = [
      apiRow({ Period: `${year}年第1四半期` }),
      apiRow({ Period: `${year}年第1四半期`, Type: "中古マンション等" }),
    ];
    return new Response(JSON.stringify({ status: "OK", data }), { status: 200 });
  });
  const replaced: { p_code: string; p_years: number[]; p_known_latest: string; p_rows: CityTransactionRow[] }[] = [];
  const refreshed: unknown[] = [];
  const db: SupabaseRest = {
    async select<T>(table: string) {
      if (table === "compare_cities") return [{ id: "tokyo", sort_order: 1 }, { id: "nagano", sort_order: 5 }] as T[];
      if (table === "compare_city_codes") return options.codes as T[];
      if (table === "compare_city_fetches") return (options.fetches ?? []) as T[];
      throw new Error(`想定していない select：${table}`);
    },
    insert: async () => [],
    update: async () => [],
    async rpc<T>(fn: string, args: Record<string, unknown>) {
      if (fn === "real_estate_transaction_quarters") return (options.iidaLatest ? [{ ...options.iidaLatest, row_count: 1 }] : []) as T;
      if (fn === "replace_compare_city_transactions") {
        const call = args as (typeof replaced)[number];
        replaced.push(call);
        return call.p_rows.length as T;
      }
      if (fn === "refresh_compare_city_market_stats") {
        refreshed.push(args);
        return 3 as T;
      }
      throw new Error(`想定していない rpc：${fn}`);
    },
  };
  const context: JobContext = {
    env: { SUPABASE_URL: "https://db.example.com", SUPABASE_SERVICE_ROLE_KEY: "service-key", REINFOLIB_API_KEY: "api-key" },
    today: TODAY,
    external: createHttpClient({ budget: new CallBudget(), maxRetries: 0, fetch: fetchMock as unknown as typeof fetch }),
    db,
    townResolver: async () => {
      throw new Error("都市の取引では町名の対応表を使わない");
    },
    unmappedTowns: new UnmappedTownCollector(),
    previousProgress: async () => null,
  };
  return { context, apiRequests, replaced, refreshed };
}

describe("city_transactions", () => {
  it("飯田の最新の四半期から期間を決め、都市の並びの順にコードごとに取り、土地・戸建てだけを入れ直して集計する", async () => {
    const world = fakeWorld({
      iidaLatest: { trade_year: 2026, trade_quarter: 2 },
      codes: [{ city_id: "nagano", reinfolib_code: "20201" }, { city_id: "tokyo", reinfolib_code: "13101" }],
    });
    const result = await cityTransactions.run(world.context);

    expect(world.apiRequests.map((r) => `${r.city}/${r.year}`)).toEqual([
      ...YEARS.map((y) => `13101/${y}`),
      ...YEARS.map((y) => `20201/${y}`),
    ]);
    expect(world.replaced.map((r) => [r.p_code, r.p_years, r.p_known_latest, r.p_rows.length])).toEqual([
      ["13101", YEARS, "2026Q2", 6],
      ["20201", YEARS, "2026Q2", 6],
    ]);
    expect(world.refreshed).toEqual([{ p_period_from: "2021Q2", p_period_to: "2026Q2" }]);
    expect(result).toEqual({ rowsWritten: 12, progress: null });
  });

  it("取り終えていなければ、進み具合を残す", async () => {
    const world = fakeWorld({ iidaLatest: { trade_year: 2026, trade_quarter: 2 }, codes: codes(30) });
    const result = await cityTransactions.run(world.context);
    expect(world.apiRequests).toHaveLength(150);
    expect(result.progress).toEqual({ period_to: "2026Q2", fetched: 150, remaining: 30 });
  });

  it("飯田の取引がまだなければ、何も取らない", async () => {
    const world = fakeWorld({ iidaLatest: null, codes: codes(1) });
    expect(await cityTransactions.run(world.context)).toEqual({ rowsWritten: 0, progress: null });
    expect(world.apiRequests).toEqual([]);
    expect(world.refreshed).toEqual([]);
  });
});
