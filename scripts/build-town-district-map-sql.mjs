// data/iida_district_map.csv から、town_district_map をそろえるマイグレーションを作る（チケット 004）。
// 使い方：npm run town-map:sql
// いちばん新しい *_town_district_map.sql と中身が同じなら何もしない。違えば新しい版番号で書き出す
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildTownMapSql, parseTownMapCsv } from "../src/lib/town-district/csv.ts";

const root = join(import.meta.dirname, "..");
const migrationsDir = join(root, "supabase/migrations");
const suffix = "_town_district_map.sql";

const sql = buildTownMapSql(parseTownMapCsv(readFileSync(join(root, "data/iida_district_map.csv"), "utf8")));

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
