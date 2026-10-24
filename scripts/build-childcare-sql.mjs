// 飯田市オープンデータ「子育て施設」から、市全体の子育て施設をそろえるマイグレーションを作る（チケット 009）。
// 使い方：npm run childcare:sql
//   1. 市のオープンデータのページから「子育て施設」の CSV の URL と更新日を探す（CSV は更新のたびに URL が変わる）
//   2. CSV の町名を data/iida_district_map.csv で地区に振り分ける（対応表にない町名があれば止める）
//   3. supabase/migrations/<版番号>_childcare_data.sql を書き出す。いちばん新しいものと中身が同じなら何もしない
import { CHILDCARE_DATASET_NAME, buildChildcareRows, buildChildcareSql } from "../src/lib/city/childcare.ts";
import { loadOpenDataset, loadTownResolver, printCounts, stopIfUnmapped, todayInJapan, writeMigrationIfChanged } from "./lib/city-open-data.mjs";

const { csvUrl, updatedOn, csvText } = await loadOpenDataset(CHILDCARE_DATASET_NAME);
const { rows, unmappedTowns, skipped } = buildChildcareRows(csvText, loadTownResolver());
stopIfUnmapped(unmappedTowns);
if (skipped > 0) console.log(`中身のない行を ${skipped} 行飛ばしました`);
printCounts(rows);
writeMigrationIfChanged("_childcare_data.sql", buildChildcareSql({ rows, csvUrl, updatedOn, usedOn: todayInJapan() }));
