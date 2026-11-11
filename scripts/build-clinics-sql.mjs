// 地区の診療所（クリニック）の数のマイグレーションを作る（チケット 037）。
// 使い方：npm run clinics:sql
//   1. 厚生労働省「医療情報ネット」のオープンデータから、診療所の施設票の ZIP を取る
//   2. 飯田市の診療所を住所で4地区に振り分けて数える（data/clinic_exclusions.csv のものは除く。対応表にない町名があれば止める）
//   3. supabase/migrations/<版番号>_clinic_counts_data.sql を書き出す。いちばん新しいものと中身が同じなら何もしない
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { unzipSync } from "fflate";
import {
  CLINIC_DOWNLOAD_URL,
  buildClinicSql,
  countClinicsByDistrict,
  parseClinicExclusionsCsv,
} from "../src/lib/medical/clinics.ts";
import { loadTownResolver, stopIfUnmapped, todayInJapan, writeMigrationIfChanged } from "./lib/city-open-data.mjs";
import { fetchWithRetry } from "./lib/geocode.mjs";

const root = join(import.meta.dirname, "..");

console.log(`取得：${CLINIC_DOWNLOAD_URL}`);
const zip = new Uint8Array(await (await fetchWithRetry(CLINIC_DOWNLOAD_URL)).arrayBuffer());
const files = Object.entries(unzipSync(zip, { filter: (file) => file.name.endsWith(".csv") }));
if (files.length !== 1) throw new Error(`ZIP の中の表が1つではない：${files.map(([name]) => name).join("、")}`);
const [[fileName, bytes]] = files;
console.log(`表：${fileName}`);

const exclusions = parseClinicExclusionsCsv(readFileSync(join(root, "data/clinic_exclusions.csv"), "utf8"));
const { counts, unmappedTowns } = countClinicsByDistrict(new TextDecoder("utf-8", { fatal: true }).decode(bytes), loadTownResolver(), exclusions);
stopIfUnmapped(unmappedTowns);

console.log("\n地区：数えた診療所（除いたもの）");
for (const c of counts) console.log(`  ${c.districtId}: ${c.clinicCount}（${c.excludedCount}）`);

writeMigrationIfChanged("_clinic_counts_data.sql", buildClinicSql(counts, todayInJapan()));
