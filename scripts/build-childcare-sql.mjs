// 飯田市オープンデータ「子育て施設」から、4地区の子育て施設をそろえるマイグレーションを作る（チケット 009）。
// 使い方：npm run childcare:sql
//   1. 市のオープンデータのページから「子育て施設」の CSV の URL と更新日を探す（CSV は更新のたびに URL が変わる）
//   2. CSV の町名を data/iida_district_map.csv で地区に振り分ける（対応表にない町名があれば止める）
//   3. supabase/migrations/<版番号>_childcare_data.sql を書き出す。いちばん新しいものと中身が同じなら何もしない
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  CHILDCARE_DATASET_NAME,
  OPEN_DATA_PAGE_URL,
  buildChildcareRows,
  buildChildcareSql,
  findOpenDataset,
} from "../src/lib/city/childcare.ts";
import { parseTownMapCsv } from "../src/lib/town-district/csv.ts";
import { createTownResolver } from "../src/lib/town-district/resolve.ts";
import { fetchWithRetry } from "./lib/geocode.mjs";

const root = join(import.meta.dirname, "..");
const migrationsDir = join(root, "supabase/migrations");
const suffix = "_childcare_data.sql";

const decoder = new TextDecoder("utf-8", { fatal: true });
const page = decoder.decode(await (await fetchWithRetry(OPEN_DATA_PAGE_URL)).arrayBuffer());
const { csvUrl, updatedOn } = findOpenDataset(page, CHILDCARE_DATASET_NAME, OPEN_DATA_PAGE_URL);
console.log(`取得：「${CHILDCARE_DATASET_NAME}」${csvUrl}（${updatedOn ?? "更新日の記載なし"}）`);
const csvText = decoder.decode(await (await fetchWithRetry(csvUrl)).arrayBuffer()).replace(/^﻿/, "");

const resolveTown = createTownResolver(parseTownMapCsv(readFileSync(join(root, "data/iida_district_map.csv"), "utf8")));
const { rows, unmappedTowns, skipped } = buildChildcareRows(csvText, resolveTown);
if (unmappedTowns.length > 0) {
  console.error(`対応表にない町名があります。data/iida_district_map.csv に足して npm run town-map:sql で当ててから、もう一度動かしてください：\n  ${unmappedTowns.join("、")}`);
  process.exit(1);
}
if (skipped > 0) console.log(`中身のない行を ${skipped} 行飛ばしました`);

console.log("\n地区・種別ごとの数：");
const counts = new Map();
for (const row of rows) counts.set(`${row.districtId} ${row.subkind}`, (counts.get(`${row.districtId} ${row.subkind}`) ?? 0) + 1);
for (const [key, count] of [...counts].sort()) console.log(`  ${key}: ${count}`);

// 取り込んだ日は SQL に入るので、比べるときは外す
const usedOn = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
const sql = buildChildcareSql({ rows, csvUrl, updatedOn, usedOn });
const withoutUsedOn = (text) => text.replace(/\d{4}年\d{1,2}月\d{1,2}日に利用/g, "").replace(/'\d{4}-\d{2}-\d{2}'::date/g, "''");
const latest = readdirSync(migrationsDir).filter((f) => f.endsWith(suffix)).sort().at(-1);
if (latest && withoutUsedOn(readFileSync(join(migrationsDir, latest), "utf8")) === withoutUsedOn(sql)) {
  console.log(`\n変更なし（${latest} と同じ中身です）`);
  process.exit(0);
}

// 版番号は Supabase と同じ UTC の YYYYMMDDHHMMSS。当てたあと list_migrations の番号に合わせて名前を直す
const version = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
const file = `${version}${suffix}`;
writeFileSync(join(migrationsDir, file), sql);
console.log(`\nsupabase/migrations/${file} を書き出しました。npm test を通してから Supabase MCP の apply_migration で当ててください`);
