// 飯田市オープンデータの取り込みスクリプトで共通に使う処理（009）：最新の CSV を探して取る・マイグレーションを書き出す
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { OPEN_DATA_PAGE_URL, findOpenDataset } from "../../src/lib/city/open-data.ts";
import { parseTownMapCsv } from "../../src/lib/town-district/csv.ts";
import { createTownResolver } from "../../src/lib/town-district/resolve.ts";
import { fetchWithRetry } from "./geocode.mjs";

const root = join(import.meta.dirname, "../..");
const migrationsDir = join(root, "supabase/migrations");
const decoder = new TextDecoder("utf-8", { fatal: true });

// 市のオープンデータのページからデータ名の行を探し、CSV を取る（CSV は更新のたびに URL が変わる）
export async function loadOpenDataset(datasetName) {
  const page = decoder.decode(await (await fetchWithRetry(OPEN_DATA_PAGE_URL)).arrayBuffer());
  const { csvUrl, updatedOn } = findOpenDataset(page, datasetName, OPEN_DATA_PAGE_URL);
  console.log(`取得：「${datasetName}」${csvUrl}（${updatedOn ?? "更新日の記載なし"}）`);
  const csvText = decoder.decode(await (await fetchWithRetry(csvUrl)).arrayBuffer()).replace(/^﻿/, "");
  return { csvUrl, updatedOn, csvText };
}

export function loadTownResolver() {
  return createTownResolver(parseTownMapCsv(readFileSync(join(root, "data/iida_district_map.csv"), "utf8")));
}

export function stopIfUnmapped(unmappedTowns) {
  if (unmappedTowns.length === 0) return;
  console.error(`対応表にない町名があります。data/iida_district_map.csv に足して npm run town-map:sql で当ててから、もう一度動かしてください：\n  ${unmappedTowns.join("、")}`);
  process.exit(1);
}

export function printCounts(rows) {
  console.log("\n地区・種別ごとの数（地区なし＝4地区の外）：");
  const counts = new Map();
  for (const row of rows) {
    const key = `${row.districtId ?? "地区なし"} ${row.subkind}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const [key, count] of [...counts].sort()) console.log(`  ${key}: ${count}`);
}

// 取り込んだ日（日本時間）
export function todayInJapan() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// いちばん新しい同じ種類のマイグレーションと、取り込んだ日以外が同じなら何もしない
export function writeMigrationIfChanged(suffix, sql) {
  const withoutUsedOn = (text) => text.replace(/\d{4}年\d{1,2}月\d{1,2}日に利用/g, "").replace(/'\d{4}-\d{2}-\d{2}'::date/g, "''");
  const latest = readdirSync(migrationsDir).filter((f) => f.endsWith(suffix)).sort().at(-1);
  if (latest && withoutUsedOn(readFileSync(join(migrationsDir, latest), "utf8")) === withoutUsedOn(sql)) {
    console.log(`\n変更なし（${latest} と同じ中身です）`);
    return;
  }
  // 版番号は Supabase と同じ UTC の YYYYMMDDHHMMSS。当てたあと list_migrations の番号に合わせて名前を直す
  const version = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const file = `${version}${suffix}`;
  writeFileSync(join(migrationsDir, file), sql);
  console.log(`\nsupabase/migrations/${file} を書き出しました。npm test を通してから Supabase MCP の apply_migration で当ててください`);
}
