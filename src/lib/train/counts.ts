// 全国鉄道運行本数データ（https://gtfs-gis.jp/railway_honsu/ ）の「事業者別・駅別発着本数」から、飯田線の駅ごと・向きごとの
// 1日の発車本数を取り出し、train_station_counts をそろえる SQL を書く（031）。通信とファイルの書き出しは scripts/build-train-counts-sql.mjs
import { parseCsv } from "../gtfs/csv.ts";
import { sqlLiteral } from "../sql.ts";

export const COUNTS_SOURCE_ID = "railway_honsu";

// データの版。新しい年の版が出たら URL と対象時点を直して npm run train-counts:sql を動かす（手順は docs/031_train-counts.md）
export const COUNTS_EDITION = {
  csvUrl: "https://gtfs-gis.jp/railway_honsu/data/unkohonsu2026_eki_sjis.csv",
  label: "2026年版",
  periodLabel: "2026年3月のダイヤ・平日",
} as const;

const OPERATOR = "JR東海";
const LINE = "飯田線";
// 1つの駅に通る路線の列は11まである（路線１_〜路線10、路線11）
const LINE_COLUMN_PREFIXES = ["路線１_", "路線２_", "路線３_", "路線４_", "路線５_", "路線６_", "路線７_", "路線８_", "路線９_", "路線10", "路線11"];

export type StationCount = { stationName: string; direction: "上り" | "下り"; departuresPerDay: number };

function count(value: string | undefined, at: string): number {
  const number = Number(value);
  if (value === undefined || value === "" || !Number.isInteger(number) || number < 0) throw new Error(`${at}：本数が数ではない: ${value}`);
  return number;
}

// 飯田線の駅だけを取り出す。向きの名前（上り・下り）はデータの列に書いてあるものを使い、知らない名前なら止める
export function parseLineCounts(text: string): StationCount[] {
  const records = parseCsv(text);
  if (records.length === 0 || !("事業者名" in records[0]) || !("路線１_路線名" in records[0])) {
    throw new Error("運行本数の CSV の見出しが思っていた形ではない（事業者名・路線１_路線名がない）");
  }
  const rows: StationCount[] = [];
  records.forEach((record, index) => {
    if (record["事業者名"] !== OPERATOR) return;
    const prefix = LINE_COLUMN_PREFIXES.find((p) => record[`${p}路線名`] === LINE);
    if (!prefix) return;
    const at = `運行本数の CSV ${index + 2}行目（${record["駅名"]}）`;
    for (const side of ["方向１", "方向２"]) {
      const direction = record[`${prefix}${side}`];
      if (direction !== "上り" && direction !== "下り") throw new Error(`${at}：向きが上り・下りではない: ${direction}`);
      rows.push({ stationName: record["駅名"], direction, departuresPerDay: count(record[`${prefix}${side}発数`], at) });
    }
  });
  if (rows.length === 0) throw new Error(`${OPERATOR}の${LINE}の駅が見つからない`);
  return rows.sort((a, b) => a.stationName.localeCompare(b.stationName, "ja") || a.direction.localeCompare(b.direction, "ja"));
}

export function buildTrainCountsSql({ rows, importedOn }: { rows: readonly StationCount[]; importedOn: string }): string {
  const values = rows
    .map((row) => `  (${sqlLiteral(LINE)}, ${sqlLiteral(row.stationName)}, ${sqlLiteral(row.direction)}, ${row.departuresPerDay}, ${sqlLiteral(COUNTS_SOURCE_ID)})`)
    .join(",\n");
  const credit =
    `出典：地域・交通データ研究所（西澤明）「全国鉄道運行本数データ」${COUNTS_EDITION.label}（https://gtfs-gis.jp/railway_honsu/ ）。` +
    "CC BY 4.0（https://creativecommons.org/licenses/by/4.0/deed.ja ）、ODbL（https://opendatacommons.org/licenses/odbl/ ）。" +
    `${LINE}の駅別の発車本数を取り出して作成`;
  return `-- 031 電車の本数：${OPERATOR}${LINE}の駅ごと・向きごとの1日の発車本数（npm run train-counts:sql が作成）

update public.data_sources
set
  credit_text = ${sqlLiteral(credit)},
  period_label = ${sqlLiteral(COUNTS_EDITION.periodLabel)},
  checked_on = ${sqlLiteral(importedOn)}::date,
  fetched_at = now()
where id = ${sqlLiteral(COUNTS_SOURCE_ID)};

delete from public.train_station_counts where source_id = ${sqlLiteral(COUNTS_SOURCE_ID)};

insert into public.train_station_counts (line_name, station_name, direction, departures_per_day, source_id)
values
${values};
`;
}
