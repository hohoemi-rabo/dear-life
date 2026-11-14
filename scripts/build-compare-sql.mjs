// data/compare/*.csv（いまの街と。041）から、比べる都市・取引のコード・指標の値をそろえるマイグレーションを作る。
// 使い方：npm run compare:sql
// いちばん新しい *_compare_data.sql と中身が同じなら何もしない。違えば新しい版番号で書き出す
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildCompareSql, parseCompareCitiesCsv, parseCompareCityCodesCsv, parseCompareStatsCsv } from "../src/lib/compare-city/csv.ts";

const root = join(import.meta.dirname, "..");
const migrationsDir = join(root, "supabase/migrations");
const suffix = "_compare_data.sql";
const read = (name) => readFileSync(join(root, "data/compare", name), "utf8");

const cities = parseCompareCitiesCsv(read("cities.csv"));
const codes = parseCompareCityCodesCsv(read("city_codes.csv"), cities);
const stats = parseCompareStatsCsv(read("stats.csv"), cities);
const sql = buildCompareSql(cities, codes, stats);

const filled = stats.filter((row) => row.value !== null).length;
console.log(`都市 ${cities.length}・取引のコード ${codes.length}・値 ${filled}/${stats.length}（空は「データ未取得」）`);

const latest = readdirSync(migrationsDir).filter((f) => f.endsWith(suffix)).sort().at(-1);
if (latest && readFileSync(join(migrationsDir, latest), "utf8") === sql) {
  console.log(`変更なし（${latest} と同じ中身です）`);
  process.exit(0);
}

// 版番号は Supabase と同じ UTC の YYYYMMDDHHMMSS。当てたあと list_migrations の番号に合わせて名前を直す
const version = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
const file = `${version}${suffix}`;
writeFileSync(join(migrationsDir, file), sql);
console.log(`supabase/migrations/${file} を書き出しました。Supabase MCP の apply_migration で当ててください`);
