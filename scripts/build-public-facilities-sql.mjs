// 飯田市オープンデータ「公共施設一覧」から、市全体の暮らしに関係する公共施設をそろえるマイグレーションを作る（チケット 009）。
// 使い方：npm run public-facilities:sql
//   1. 市のオープンデータのページから「公共施設一覧」の CSV の URL と更新日を探す（CSV は更新のたびに URL が変わる）
//   2. 載せる種類だけを選ぶ（src/lib/city/public-facilities.ts。決まっていない種類があれば止める）
//   3. CSV の町名を data/iida_district_map.csv で地区に振り分ける。町字が空の行は、緯度経度を国土地理院の逆ジオコーダで町名にする
//      （結果は data/city_facility_towns.csv にためる）。対応表にない町名があれば止める
//   4. supabase/migrations/<版番号>_public_facilities_data.sql を書き出す。いちばん新しいものと中身が同じなら何もしない
import { join } from "node:path";
import { PUBLIC_FACILITIES_DATASET_NAME, buildPublicFacilitiesSql, buildPublicFacilityRows } from "../src/lib/city/public-facilities.ts";
import { loadOpenDataset, loadTownResolver, printCounts, stopIfUnmapped, todayInJapan, writeMigrationIfChanged } from "./lib/city-open-data.mjs";
import { geocodeMissing, readTowns } from "./lib/geocode.mjs";

const townsPath = join(import.meta.dirname, "../data/city_facility_towns.csv");
const { csvUrl, updatedOn, csvText } = await loadOpenDataset(PUBLIC_FACILITIES_DATASET_NAME);
const resolveTown = loadTownResolver();
const towns = readTowns(townsPath);
let result = buildPublicFacilityRows(csvText, resolveTown, towns);
if (result.missingCoordinates.length > 0) {
  await geocodeMissing(townsPath, towns, result.missingCoordinates);
  result = buildPublicFacilityRows(csvText, resolveTown, towns);
}
const { rows, unmappedTowns, excluded } = result;
stopIfUnmapped(unmappedTowns);
console.log(`載せない種類の行を ${excluded} 行飛ばしました`);
printCounts(rows);
writeMigrationIfChanged("_public_facilities_data.sql", buildPublicFacilitiesSql({ rows, csvUrl, updatedOn, usedOn: todayInJapan() }));
