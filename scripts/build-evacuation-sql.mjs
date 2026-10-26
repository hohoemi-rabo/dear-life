// 飯田市オープンデータ「指定緊急避難場所一覧」から、市全体の避難場所をそろえるマイグレーションを作る（チケット 009）。
// 使い方：npm run evacuation:sql
//   1. 市のオープンデータのページから「指定緊急避難場所一覧」の CSV の URL と更新日を探す（CSV は更新のたびに URL が変わる）
//   2. CSV の町名を data/iida_district_map.csv で地区に振り分ける。町字が空の行は、緯度経度を国土地理院の逆ジオコーダで町名にする
//      （結果は data/city_facility_towns.csv にためる）。対応表にない町名があれば止める
//   3. supabase/migrations/<版番号>_evacuation_data.sql を書き出す。いちばん新しいものと中身が同じなら何もしない
import { join } from "node:path";
import { EVACUATION_DATASET_NAME, buildEvacuationRows, buildEvacuationSql } from "../src/lib/city/evacuation.ts";
import { loadOpenDataset, loadTownResolver, printCounts, stopIfUnmapped, todayInJapan, writeMigrationIfChanged } from "./lib/city-open-data.mjs";
import { geocodeMissing, readTowns } from "./lib/geocode.mjs";

const townsPath = join(import.meta.dirname, "../data/city_facility_towns.csv");
const { csvUrl, updatedOn, csvText } = await loadOpenDataset(EVACUATION_DATASET_NAME);
const resolveTown = loadTownResolver();
const towns = readTowns(townsPath);
let result = buildEvacuationRows(csvText, resolveTown, towns);
if (result.missingCoordinates.length > 0) {
  await geocodeMissing(townsPath, towns, result.missingCoordinates);
  result = buildEvacuationRows(csvText, resolveTown, towns);
}
const { rows, unmappedTowns, skipped } = result;
stopIfUnmapped(unmappedTowns);
if (skipped > 0) console.log(`中身のない行を ${skipped} 行飛ばしました`);
const withoutCoordinates = rows.filter((row) => row.lat === null);
if (withoutCoordinates.length > 0) console.log(`緯度経度のない避難場所（地図には出さない）：${withoutCoordinates.map((row) => row.name).join("、")}`);
printCounts(rows);
writeMigrationIfChanged("_evacuation_data.sql", buildEvacuationSql({ rows, csvUrl, updatedOn, usedOn: todayInJapan() }));
