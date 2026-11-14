// いまの街と（041）：比べる6都市の不動産取引を XIT001 から取り、都市の相場を飯田の地区と同じ期間・同じ決まりで集計する。
//
// XIT001 は政令市の市のコード（例：横浜市 14100）を受け付けない（2026-11-14 に試して「検索結果がありません」）ので、
// 区のコードごとに年単位で取る（compare_city_codes。東京23区・横浜・名古屋・大阪の区と、長野市・松本市の計83コード）。
// 対象期間は飯田の取り込み（transactions）が見つけた最新の四半期から決める。初回は 83コード×6年 で約500回の呼び出しになるので、
// 1回の実行で取るのを CITY_FETCHES_PER_RUN 回までにし、数日に分けて取る。取り終えていない都市の相場は出さない（データ未取得）。
// 新しい四半期が出たら、その年からを取り直す（飯田と同じ）
import type { Job, JobContext } from "../job";
import { addQuarters, compareQuarters, parsePeriod, quarterCode, type Quarter } from "../quarter";
import { fetchXit001, isExcludedCircumstance, parseBuildingYear, parseNumber, QUARTERS_KEPT_BEFORE_LATEST, SOURCE_ID, type Xit001Row } from "./transactions";

// 1回の実行で XIT001 を呼ぶ回数の上限。呼び出しの上限（SUBREQUEST_LIMIT＝400）は Supabase への書き込みや、
// 6月の学区の取り直し（1日に最大160回ほど）と分け合うので、残りで足りるように決めた。1回の実行は 150回×1.5秒＝4分ほど
export const CITY_FETCHES_PER_RUN = 150;

// 相場の計算に使う種類だけを残す（マンション・農地などは使わない。件数の多い都市で容量を食わないように）
const KEPT_TYPES: ReadonlySet<string> = new Set(["宅地(土地)", "宅地(土地と建物)"]);

export type CityCode = { city_id: string; reinfolib_code: string };
export type CityFetch = { reinfolib_code: string; trade_year: number; known_latest: string };

// compare_city_transactions の1行（replace_compare_city_transactions に渡す形）
export type CityTransactionRow = {
  trade_year: number;
  trade_quarter: number;
  property_type: string;
  trade_price: number | null;
  unit_price_per_sqm: number | null;
  area_sqm: number | null;
  building_year: number | null;
  use: string | null;
  is_excluded: boolean;
};

// API の1行を保存する形にする。相場に使わない種類は null。数の読み方・除外の決め方は飯田（toTransactionRow）と同じ関数を使う
export function toCityTransactionRow(row: Xit001Row): CityTransactionRow | null {
  const propertyType = row.Type?.trim() ?? "";
  if (!KEPT_TYPES.has(propertyType)) return null;
  const period = parsePeriod(row.Period ?? "");
  if (!period) throw new Error(`XIT001 の取引時期が読めない：${JSON.stringify(row.Period)}`);
  const area = parseNumber(row.Area);
  const use = row.Use?.trim() ?? "";
  return {
    trade_year: period.year,
    trade_quarter: period.quarter,
    property_type: propertyType,
    trade_price: parseNumber(row.TradePrice),
    unit_price_per_sqm: parseNumber(row.UnitPrice),
    area_sqm: area !== null && area > 0 ? area : null,
    building_year: parseBuildingYear(row.BuildingYear),
    use: use === "" ? null : use,
    is_excluded: isExcludedCircumstance(row.Remarks),
  };
}

function parseQuarterCode(code: string): Quarter | null {
  const match = /^(\d{4})Q([1-4])$/.exec(code);
  return match ? { year: Number(match[1]), quarter: Number(match[2]) as Quarter["quarter"] } : null;
}

export type FetchPlan = { code: string; years: number[] }[];

// 取るコード×年を決める。まだ取っていない年と、取ったあとに新しい四半期が出た年（その四半期の年から後ろ）を取る。
// コードの並び（都市の並び→コード）のまま、上限に収まるところまでをコード単位で選ぶ（1つのコードの年は1回で入れ直す）
export function planCityFetches(
  codes: readonly CityCode[],
  fetches: readonly CityFetch[],
  oldest: Quarter,
  latest: Quarter,
  limit: number,
): { plan: FetchPlan; remaining: number; total: number } {
  const done = new Map(fetches.map((f) => [`${f.reinfolib_code}/${f.trade_year}`, f]));
  const needed: FetchPlan = [];
  for (const { reinfolib_code: code } of codes) {
    const years: number[] = [];
    for (let year = oldest.year; year <= latest.year; year += 1) {
      const record = done.get(`${code}/${year}`);
      const known = record ? parseQuarterCode(record.known_latest) : null;
      const stale = known !== null && compareQuarters(latest, known) > 0 && year >= addQuarters(known, 1).year;
      if (!record || known === null || stale) years.push(year);
    }
    if (years.length > 0) needed.push({ code, years });
  }
  const total = needed.reduce((sum, item) => sum + item.years.length, 0);
  const plan: FetchPlan = [];
  let used = 0;
  for (const item of needed) {
    if (used + item.years.length > limit) break;
    plan.push(item);
    used += item.years.length;
  }
  return { plan, remaining: total - used, total };
}

type StoredQuarter = { trade_year: number; trade_quarter: number };

async function latestIidaQuarter(context: JobContext): Promise<Quarter | null> {
  const stored = await context.db.rpc<StoredQuarter[]>("real_estate_transaction_quarters", {});
  return stored
    .map((q): Quarter => ({ year: q.trade_year, quarter: q.trade_quarter as Quarter["quarter"] }))
    .reduce<Quarter | null>((max, q) => (max === null || compareQuarters(q, max) > 0 ? q : max), null);
}

export const cityTransactions: Job = {
  name: "city_transactions",
  sourceId: SOURCE_ID,
  shouldRun: () => true,
  async run(context) {
    // 飯田の取り込みが先に動き、最新の四半期を決める。飯田の取引がまだなければ、期間が決まらないので何もしない
    const latest = await latestIidaQuarter(context);
    if (latest === null) return { rowsWritten: 0, progress: null };
    const oldest = addQuarters(latest, -QUARTERS_KEPT_BEFORE_LATEST);

    // 都市の並び（cities.csv の並び順）→コードの順に取る。先に並ぶ都市から取り終わる
    const cities = await context.db.select<{ id: string; sort_order: number }>("compare_cities", "select=id,sort_order");
    const order = new Map(cities.map((city) => [city.id, city.sort_order]));
    const codes = (await context.db.select<CityCode>("compare_city_codes", "select=city_id,reinfolib_code")).sort(
      (a, b) => (order.get(a.city_id) ?? 0) - (order.get(b.city_id) ?? 0) || a.reinfolib_code.localeCompare(b.reinfolib_code),
    );
    const fetches = await context.db.select<CityFetch>("compare_city_fetches", "select=reinfolib_code,trade_year,known_latest");
    const { plan, remaining, total } = planCityFetches(codes, fetches, oldest, latest, CITY_FETCHES_PER_RUN);

    let rowsWritten = 0;
    for (const { code, years } of plan) {
      const rows: CityTransactionRow[] = [];
      for (const year of years) {
        for (const apiRow of await fetchXit001(context, { year, city: code })) {
          const row = toCityTransactionRow(apiRow);
          if (row) rows.push(row);
        }
      }
      rowsWritten += await context.db.rpc<number>("replace_compare_city_transactions", {
        p_code: code,
        p_years: years,
        p_known_latest: quarterCode(latest),
        p_rows: rows,
      });
    }

    // 取り終えた都市だけ、飯田の地区と同じ期間で集計する（取り込みがなかった日も、期間が進んだときのために毎日）
    await context.db.rpc<number>("refresh_compare_city_market_stats", {
      p_period_from: quarterCode(oldest),
      p_period_to: quarterCode(latest),
    });
    // 取り終えるまでは、進み具合を ingest_runs.progress に残す（取り終えたら null）
    return { rowsWritten, progress: remaining === 0 ? null : { period_to: quarterCode(latest), fetched: total - remaining, remaining } };
  },
};
