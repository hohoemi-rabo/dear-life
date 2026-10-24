// 飯田市オープンデータ「教育機関一覧」から、市全体の学校をそろえるマイグレーションを作る（チケット 009・008）。
// 使い方：npm run education:sql
//   1. 市のオープンデータのページから「教育機関一覧」の CSV の URL を探す（CSV は更新のたびに URL が変わる）
//   2. CSV の町名を data/iida_district_map.csv で地区に振り分ける（対応表にない町名があれば止める）
//   3. supabase/migrations/<版番号>_education_data.sql を書き出す。いちばん新しいものと中身が同じなら何もしない
import { EDUCATION_DATASET_NAME, buildEducationSql, buildSchoolRows } from "../src/lib/city/education.ts";
import { loadOpenDataset, loadTownResolver, printCounts, stopIfUnmapped, todayInJapan, writeMigrationIfChanged } from "./lib/city-open-data.mjs";

const { csvUrl, updatedOn, csvText } = await loadOpenDataset(EDUCATION_DATASET_NAME);
const { rows, unmappedTowns, abolished } = buildSchoolRows(csvText, loadTownResolver());
stopIfUnmapped(unmappedTowns);
if (abolished.length > 0) console.log(`廃止された学校は入れませんでした：${abolished.join("、")}`);
printCounts(rows);
writeMigrationIfChanged("_education_data.sql", buildEducationSql({ rows, csvUrl, updatedOn, usedOn: todayInJapan() }));
