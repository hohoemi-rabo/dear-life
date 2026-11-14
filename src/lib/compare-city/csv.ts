// 地区くらべ「いまの街と」（041）の手入力データ（data/compare/*.csv）を読み、マイグレーションの SQL を作る。
// CSV が唯一の情報源で、SQL は scripts/build-compare-sql.mjs（npm run compare:sql）が作る（手で書かない）。
// 「#」で始まる行はまさゆきさん向けの説明なので読み飛ばす。Node から直接読み込むので、相対パスの import は拡張子つき
import { parseCsv, type CsvRecord } from "../gtfs/csv.ts";
import { sqlLiteral } from "../sql.ts";
import { COMPARE_METRICS, type CompareMetricKey } from "./metrics.ts";

export type CompareCityRow = {
  id: string;
  name: string;
  censusCode: string;
  jmaStation: string;
  sortOrder: number;
  isPublished: boolean;
};

export type CompareCityCodeRow = { cityId: string; code: string; name: string };

export type CompareStatRow = {
  cityId: string;
  metricKey: CompareMetricKey;
  value: number | null;
  unit: string;
  periodLabel: string | null;
  sourceId: string;
  checkedOn: string | null;
  note: string | null;
};

const CITY_HEADER = ["id", "表示名", "国勢調査コード", "気象官署", "並び順", "公開"];
const CODE_HEADER = ["city_id", "code", "名前"];
const STAT_HEADER = ["city_id", "都市名", "metric_key", "指標名", "値", "単位", "対象期間", "確認日", "備考"];

function readTable(text: string, header: readonly string[], file: string): { lineNo: number; record: CsvRecord }[] {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  // 説明の行を消しても行番号がずれないように、元の行番号を覚えておく
  const kept = lines.map((line, index) => ({ line, lineNo: index + 1 })).filter(({ line }) => !line.startsWith("#") && line.trim() !== "");
  const [head, ...body] = kept;
  if (!head) throw new Error(`${file}：見出しの行がありません`);
  if (head.line.split(",").map((cell) => cell.trim()).join(",") !== header.join(",")) {
    throw new Error(`${file}：見出しが ${header.join(",")} ではありません: ${head.line}`);
  }
  const records = parseCsv([head.line, ...body.map((row) => row.line)].join("\n"));
  return records.map((record, index) => ({ lineNo: body[index].lineNo, record }));
}

function fail(file: string, lineNo: number, message: string): never {
  throw new Error(`${file} ${lineNo}行目：${message}`);
}

export function parseCompareCitiesCsv(text: string): CompareCityRow[] {
  const file = "cities.csv";
  const seen = new Set<string>();
  const orders = new Set<number>();
  return readTable(text, CITY_HEADER, file).map(({ lineNo, record }) => {
    const id = record["id"];
    if (!/^[a-z0-9_]+$/.test(id)) fail(file, lineNo, `id は英小文字・数字・_ だけ: ${id}`);
    if (seen.has(id)) fail(file, lineNo, `id「${id}」が重複しています`);
    seen.add(id);
    const name = record["表示名"];
    const jmaStation = record["気象官署"];
    if (!name || !jmaStation) fail(file, lineNo, "表示名・気象官署は必須です");
    const censusCode = record["国勢調査コード"];
    if (!/^\d{5}$/.test(censusCode)) fail(file, lineNo, `国勢調査コードは5桁: ${censusCode}`);
    const sortOrder = Number(record["並び順"]);
    if (!Number.isInteger(sortOrder) || orders.has(sortOrder)) fail(file, lineNo, `並び順は重ならない整数: ${record["並び順"]}`);
    orders.add(sortOrder);
    const published = record["公開"];
    if (published !== "true" && published !== "false") fail(file, lineNo, `公開は true か false: ${published}`);
    return { id, name, censusCode, jmaStation, sortOrder, isPublished: published === "true" };
  });
}

export function parseCompareCityCodesCsv(text: string, cities: readonly CompareCityRow[]): CompareCityCodeRow[] {
  const file = "city_codes.csv";
  const cityIds = new Set(cities.map((city) => city.id));
  const seen = new Set<string>();
  return readTable(text, CODE_HEADER, file).map(({ lineNo, record }) => {
    const cityId = record["city_id"];
    const code = record["code"];
    if (!cityIds.has(cityId)) fail(file, lineNo, `cities.csv にない都市: ${cityId}`);
    if (!/^\d{5}$/.test(code)) fail(file, lineNo, `code は5桁: ${code}`);
    if (seen.has(code)) fail(file, lineNo, `code「${code}」が重複しています`);
    seen.add(code);
    return { cityId, code, name: record["名前"] };
  });
}

// 値は「1,234」のようなカンマを付けずに書く。空欄は「データ未取得」
function parseValue(raw: string, file: string, lineNo: number): number | null {
  if (raw === "") return null;
  if (!/^\d+(\.\d+)?$/.test(raw)) fail(file, lineNo, `値は 0 以上の数（カンマなし）か空欄: ${raw}`);
  return Number(raw);
}

export function parseCompareStatsCsv(text: string, cities: readonly CompareCityRow[]): CompareStatRow[] {
  const file = "stats.csv";
  const cityById = new Map(cities.map((city) => [city.id, city]));
  const seen = new Set<string>();
  const rows = readTable(text, STAT_HEADER, file).map(({ lineNo, record }): CompareStatRow => {
    const city = cityById.get(record["city_id"]);
    if (!city) fail(file, lineNo, `cities.csv にない都市: ${record["city_id"]}`);
    // 都市名・指標名・単位は手で入れるときの目印。行をずらして貼ったときに気づけるよう、正しいかを確かめる
    if (record["都市名"] !== city.name) fail(file, lineNo, `都市名が「${city.name}」ではありません: ${record["都市名"]}`);
    const metric = COMPARE_METRICS.find((item) => item.key === record["metric_key"]);
    if (!metric) fail(file, lineNo, `知らない metric_key: ${record["metric_key"]}`);
    if (record["指標名"] !== metric.label) fail(file, lineNo, `指標名が「${metric.label}」ではありません: ${record["指標名"]}`);
    if (record["単位"] !== metric.unit) fail(file, lineNo, `単位が「${metric.unit}」ではありません: ${record["単位"]}`);
    const key = `${city.id}/${metric.key}`;
    if (seen.has(key)) fail(file, lineNo, `${key} が重複しています`);
    seen.add(key);

    const value = parseValue(record["値"], file, lineNo);
    const periodLabel = record["対象期間"] || null;
    const checkedOn = record["確認日"] || null;
    if (checkedOn !== null && !/^\d{4}-\d{2}-\d{2}$/.test(checkedOn)) fail(file, lineNo, `確認日は 2026-11-14 の形: ${checkedOn}`);
    // すべての数字に出典・対象時点・確認日を付ける（要件 7.2）
    if (value !== null && (periodLabel === null || checkedOn === null)) fail(file, lineNo, "値を入れたら、対象期間と確認日も入れてください");
    if (metric.key === "under15_ratio" && value !== null && value > 100) fail(file, lineNo, `割合は 100 以下: ${value}`);
    return { cityId: city.id, metricKey: metric.key, value, unit: metric.unit, periodLabel, sourceId: metric.sourceId, checkedOn, note: record["備考"] || null };
  });
  // 都市×指標がそろっていないと、画面で行が抜ける
  for (const city of cities) {
    for (const metric of COMPARE_METRICS) {
      if (!seen.has(`${city.id}/${metric.key}`)) throw new Error(`${file}：${city.id} の ${metric.key} の行がありません`);
    }
  }
  return rows;
}

// compare_cities・compare_city_codes・compare_city_stats を CSV と同じ中身にそろえる SQL。何度当てても同じ結果になる
export function buildCompareSql(cities: readonly CompareCityRow[], codes: readonly CompareCityCodeRow[], stats: readonly CompareStatRow[]): string {
  const cityValues = cities
    .map((city) =>
      `  (${[sqlLiteral(city.id), sqlLiteral(city.name), sqlLiteral(city.censusCode), sqlLiteral(city.jmaStation), city.sortOrder, city.isPublished].join(", ")})`,
    )
    .join(",\n");
  const cityIds = cities.map((city) => sqlLiteral(city.id)).join(", ");
  const codeValues = codes.map((row) => `  (${sqlLiteral(row.cityId)}, ${sqlLiteral(row.code)})`).join(",\n");
  const statValues = stats
    .map((row) =>
      `  (${[
        sqlLiteral(row.cityId),
        sqlLiteral(row.metricKey),
        row.value === null ? "null" : String(row.value),
        sqlLiteral(row.unit),
        sqlLiteral(row.periodLabel),
        sqlLiteral(row.sourceId),
        row.checkedOn === null ? "null" : `${sqlLiteral(row.checkedOn)}::date`,
        sqlLiteral(row.note),
      ].join(", ")})`,
    )
    .join(",\n");
  const sourceIds = [...new Set(COMPARE_METRICS.map((metric) => metric.sourceId))].map(sqlLiteral).join(", ");

  return `-- 041 いまの街と：比べる都市・取引のコード・指標の値を data/compare/*.csv にそろえる。
-- このファイルは npm run compare:sql で作る。手で編集しない（値の入れ方は docs/041_kurabe-city-compare.md）

-- CSV から消した都市は消す（指標の値・取引のコードも一緒に消える）
delete from public.compare_cities where id not in (${cityIds});

insert into public.compare_cities (id, name, census_code, jma_station, sort_order, is_published) values
${cityValues}
on conflict (id) do update set
  name = excluded.name,
  census_code = excluded.census_code,
  jma_station = excluded.jma_station,
  sort_order = excluded.sort_order,
  is_published = excluded.is_published
where (compare_cities.name, compare_cities.census_code, compare_cities.jma_station, compare_cities.sort_order, compare_cities.is_published)
  is distinct from (excluded.name, excluded.census_code, excluded.jma_station, excluded.sort_order, excluded.is_published);

delete from public.compare_city_codes;
insert into public.compare_city_codes (city_id, reinfolib_code) values
${codeValues};

insert into public.compare_city_stats (city_id, metric_key, value, unit, period_label, source_id, checked_on, note) values
${statValues}
on conflict (city_id, metric_key) do update set
  value = excluded.value,
  unit = excluded.unit,
  period_label = excluded.period_label,
  source_id = excluded.source_id,
  checked_on = excluded.checked_on,
  note = excluded.note
where (compare_city_stats.value, compare_city_stats.unit, compare_city_stats.period_label, compare_city_stats.source_id,
       compare_city_stats.checked_on, compare_city_stats.note)
  is distinct from (excluded.value, excluded.unit, excluded.period_label, excluded.source_id, excluded.checked_on, excluded.note);

-- 出典の確認日は、その出典の値をいちばん最近確かめた日（値がまだなければ空のまま）
update public.data_sources as s set checked_on = (
  select max(v.checked_on) from public.compare_city_stats as v where v.source_id = s.id and v.value is not null
)
where s.id in (${sourceIds});
`;
}
