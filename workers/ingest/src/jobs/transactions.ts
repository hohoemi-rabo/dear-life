// 不動産取引価格の取り込み（006・要件 5章-1〜3）。不動産情報ライブラリ API XIT001 から飯田市の取引を取り、
// 町名を地区に振り分けて real_estate_transactions に年ごとに入れ直す。
// 毎日、次の四半期が公開されたかだけを確かめ（呼び出し1回）、出ていたらその年を取り直す
import { HttpRequestError } from "../http";
import type { Job, JobContext } from "../job";
import { addQuarters, compareQuarters, parsePeriod, quarterLabel, quarterOf, type Quarter } from "../quarter";
import type { TownResolver } from "../towns";

export const XIT001_URL = "https://www.reinfolib.mlit.go.jp/ex-api/external/XIT001";
export const IIDA_CITY_CODE = "20205";
export const SOURCE_ID = "reinfolib_xit001";

// 最新の四半期から何四半期前までを取り込んでおくか。5.1 の対象期間（2021年第1四半期〜2026年第1四半期）が収まるようにする。
// 集計に使う期間は 007 の SQL 関数が決める（取り込みは年単位なので、これより古い四半期も同じ年の分は入る）
export const QUARTERS_KEPT_BEFORE_LATEST = 20;

// 次の四半期を探すときに確かめる最大の数。初回は今の四半期の1つ前からさかのぼる
const MAX_PROBES = 4;

// 相場を歪める特殊な取引（要件 5章-3）。行は残し、is_excluded を立てる
export const EXCLUDED_CIRCUMSTANCES: ReadonlySet<string> = new Set(["調停・競売等", "関係者間取引", "隣地の購入"]);

// XIT001 の1行（API マニュアルの項目のうち、使うもの。値はすべて文字列で、ないときは空文字）
export type Xit001Row = {
  PriceCategory: string;
  Type: string;
  Period: string;
  DistrictName: string;
  DistrictCode: string;
  TradePrice: string;
  UnitPrice: string;
  Area: string;
  BuildingYear: string;
  Use: string;
  Remarks: string;
  [field: string]: string;
};

type Xit001Response = { status: string; data: Xit001Row[] };

// real_estate_transactions の1行（replace_real_estate_transactions に渡す形）
export type TransactionRow = {
  trade_year: number;
  trade_quarter: number;
  price_category: string;
  property_type: string;
  town_name: string;
  district_code: string | null;
  district_id: string | null;
  trade_price: number | null;
  unit_price_per_sqm: number | null;
  area_sqm: number | null;
  building_year: number | null;
  use: string | null;
  circumstances: string | null;
  is_excluded: boolean;
  raw: Xit001Row;
};

function blankToNull(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}

// 「2000㎡以上」のような数でない値は null にする（aggregate_iida.py の to_numeric(errors="coerce") と同じ）
function parseNumber(value: string | undefined): number | null {
  const trimmed = value?.trim() ?? "";
  return /^\d+(\.\d+)?$/.test(trimmed) ? Number(trimmed) : null;
}

// 「1994年」→ 1994。「戦前」や空は不明（null）
function parseBuildingYear(value: string | undefined): number | null {
  const match = /^(\d{4})年$/.exec(value?.trim() ?? "");
  return match ? Number(match[1]) : null;
}

// 取引の事情等は「、」で複数並ぶことがあるので、どれか1つでも除外の対象なら除外する
export function isExcludedCircumstance(remarks: string | undefined): boolean {
  return (remarks ?? "").split("、").some((part) => EXCLUDED_CIRCUMSTANCES.has(part.trim()));
}

// API の1行を保存する形にする。町名が対応表になければ unmapped を true にする（集計から外れ、管理者に知らせる）
export function toTransactionRow(row: Xit001Row, resolveTown: TownResolver): { row: TransactionRow; unmapped: boolean } {
  const period = parsePeriod(row.Period ?? "");
  if (!period) throw new Error(`XIT001 の取引時期が読めない：${JSON.stringify(row.Period)}`);
  const townName = row.DistrictName?.trim() ?? "";
  const entry = townName === "" ? null : resolveTown(townName);
  const area = parseNumber(row.Area);
  return {
    row: {
      trade_year: period.year,
      trade_quarter: period.quarter,
      price_category: row.PriceCategory?.trim() ?? "",
      property_type: row.Type?.trim() ?? "",
      town_name: townName,
      district_code: blankToNull(row.DistrictCode),
      district_id: entry?.districtId ?? null,
      trade_price: parseNumber(row.TradePrice),
      unit_price_per_sqm: parseNumber(row.UnitPrice),
      area_sqm: area !== null && area > 0 ? area : null,
      building_year: parseBuildingYear(row.BuildingYear),
      use: blankToNull(row.Use),
      circumstances: blankToNull(row.Remarks),
      is_excluded: isExcludedCircumstance(row.Remarks),
      raw: row,
    },
    unmapped: entry === null,
  };
}

function isXit001Response(body: unknown): body is Xit001Response {
  return typeof body === "object" && body !== null && Array.isArray((body as { data?: unknown }).data);
}

// XIT001 を呼ぶ。quarter を省くとその年の公開済みの四半期をまとめて返す。
// 価格情報区分は指定しない（取引価格と成約価格の両方。5.1 の基準の CSV と同じ）。該当がないと 404 が返るので空にする
export async function fetchXit001(context: JobContext, params: { year: number; quarter?: number }): Promise<Xit001Row[]> {
  const apiKey = context.env.REINFOLIB_API_KEY;
  if (!apiKey) throw new Error("REINFOLIB_API_KEY が登録されていないので、取引価格を取得できない");
  const url = new URL(XIT001_URL);
  url.searchParams.set("year", String(params.year));
  if (params.quarter !== undefined) url.searchParams.set("quarter", String(params.quarter));
  url.searchParams.set("city", IIDA_CITY_CODE);

  let response: Response;
  try {
    response = await context.external.request(url.toString(), { headers: { "Ocp-Apim-Subscription-Key": apiKey } });
  } catch (error) {
    if (error instanceof HttpRequestError && error.status === 404) return [];
    throw error;
  }
  const body: unknown = await response.json();
  if (!isXit001Response(body)) {
    throw new Error(`XIT001 の応答の形が想定と違う（${params.year}年${params.quarter ? `第${params.quarter}四半期` : ""}）`);
  }
  return body.data;
}

type StoredQuarter = { trade_year: number; trade_quarter: number; row_count: number };

// 公開済みの最新の四半期を探す。取り込み済みがあればその次から先へ、なければ今の四半期の1つ前からさかのぼる
async function findLatestPublished(context: JobContext, latestStored: Quarter | null): Promise<Quarter> {
  if (latestStored) {
    let latest = latestStored;
    for (let i = 0; i < MAX_PROBES; i += 1) {
      const next = addQuarters(latest, 1);
      const rows = await fetchXit001(context, next);
      if (rows.length === 0) break;
      latest = next;
    }
    return latest;
  }
  let candidate = addQuarters(quarterOf(context.today), -1);
  for (let i = 0; i < MAX_PROBES; i += 1) {
    if ((await fetchXit001(context, candidate)).length > 0) return candidate;
    candidate = addQuarters(candidate, -1);
  }
  throw new Error(`直近${MAX_PROBES}四半期の取引が XIT001 から1件も返ってこなかった`);
}

export const transactions: Job = {
  name: "transactions",
  sourceId: SOURCE_ID,
  shouldRun: () => true,
  async run(context) {
    const stored = await context.db.rpc<StoredQuarter[]>("real_estate_transaction_quarters", {});
    const storedYears = new Set(stored.map((q) => q.trade_year));
    const latestStored = stored
      .map((q): Quarter => ({ year: q.trade_year, quarter: q.trade_quarter as Quarter["quarter"] }))
      .reduce<Quarter | null>((max, q) => (max === null || compareQuarters(q, max) > 0 ? q : max), null);

    const latest = await findLatestPublished(context, latestStored);
    const oldest = addQuarters(latest, -QUARTERS_KEPT_BEFORE_LATEST);
    // 新しい四半期が出た年は取り直す（同じ年の前の四半期の訂正も入る）。対象期間で抜けている年も取る
    const firstNewYear = latestStored && compareQuarters(latest, latestStored) > 0 ? addQuarters(latestStored, 1).year : null;
    const years: number[] = [];
    for (let year = oldest.year; year <= latest.year; year += 1) {
      if (!storedYears.has(year) || (firstNewYear !== null && year >= firstNewYear)) years.push(year);
    }
    if (years.length === 0) return { rowsWritten: 0 };

    const resolveTown = await context.townResolver();
    let rowsWritten = 0;
    for (const year of years) {
      const rows = (await fetchXit001(context, { year })).map((apiRow) => {
        const converted = toTransactionRow(apiRow, resolveTown);
        if (converted.unmapped) context.unmappedTowns.add(converted.row.town_name);
        return converted.row;
      });
      rowsWritten += await context.db.rpc<number>("replace_real_estate_transactions", { p_year: year, p_rows: rows });
    }

    await context.db.update("data_sources", `id=eq.${SOURCE_ID}`, {
      fetched_at: new Date().toISOString(),
      period_label: `${quarterLabel(oldest)}〜${quarterLabel(latest)}`,
    });
    return { rowsWritten };
  },
};
