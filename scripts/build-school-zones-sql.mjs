// 町名ごとに通う公立の小学校・中学校のマイグレーションを作る（チケット 039）。
// 使い方：npm run school-zones:sql
//   1. 飯田市の例規集から「飯田市立小学校及び中学校の通学区域に関する規則」のページを取り、別表を読む
//   2. 町名ごとの1行にして地区を付け（対応表にない町名があれば止める）、data/school_zones.csv を書く
//   3. CSV から supabase/migrations/<版番号>_school_zones_data.sql を書き出す。いちばん新しいものと中身が同じなら何もしない
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  SCHOOL_ZONE_RULE_URL,
  assignCityDistricts,
  buildSchoolZonesCsv,
  buildSchoolZonesSql,
  parseEnforcementLabel,
  parseSchoolZoneTable,
  parseSchoolZonesCsv,
  toTownSchoolZones,
} from "../src/lib/school-zones/rules.ts";
import { TARGET_DISTRICT_IDS } from "../src/lib/town-district/csv.ts";
import { loadTownResolver, stopIfUnmapped, todayInJapan, writeMigrationIfChanged } from "./lib/city-open-data.mjs";
import { fetchWithRetry } from "./lib/geocode.mjs";

const root = join(import.meta.dirname, "..");
const csvPath = join(root, "data/school_zones.csv");

console.log(`取得：${SCHOOL_ZONE_RULE_URL}`);
const html = new TextDecoder("utf-8", { fatal: true }).decode(await (await fetchWithRetry(SCHOOL_ZONE_RULE_URL)).arrayBuffer());
const enforcementLabel = parseEnforcementLabel(html);
console.log(`規則：${enforcementLabel}`);

const { zones, unmappedTowns } = assignCityDistricts(toTownSchoolZones(parseSchoolZoneTable(html)), loadTownResolver());
stopIfUnmapped(unmappedTowns);
writeFileSync(csvPath, buildSchoolZonesCsv(zones));
console.log(`data/school_zones.csv を書きました（市全体 ${zones.length} 町）`);

const fromCsv = parseSchoolZonesCsv(readFileSync(csvPath, "utf8"));
console.log("\n4地区の町の数と学校：");
for (const district of Object.keys(TARGET_DISTRICT_IDS)) {
  const towns = fromCsv.filter((zone) => zone.cityDistrict === district);
  const schools = new Set(towns.flatMap((zone) => [...zone.elementarySchools, ...zone.juniorHighSchools]));
  console.log(`  ${district}: ${towns.length} 町（${[...schools].join("、")}）`);
}

writeMigrationIfChanged("_school_zones_data.sql", buildSchoolZonesSql(fromCsv, enforcementLabel, todayInJapan()));
