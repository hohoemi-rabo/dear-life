// e-Stat「国勢調査 小地域集計」の年齢別人口から、4地区の人口と年齢構成をそろえるマイグレーションを作る（チケット 011）。
// 使い方：npm run population:sql
//   1. e-Stat から長野県の「年齢（5歳階級、4区分）別、男女別人口」の ZIP を取る（中身は Shift_JIS の CSV）
//   2. 飯田市の町丁・字等を data/iida_district_map.csv で地区に振り分けて合計する。人がいるのに地区を決められない町丁・字等があれば止める
//   3. supabase/migrations/<版番号>_population_data.sql を書き出す。いちばん新しいものと中身が同じなら何もしない
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { unzipSync } from "fflate";
import { CENSUS_DOWNLOAD_URL, CENSUS_NAME, buildDistrictPopulations, buildPopulationSql } from "../src/lib/population/census.ts";
import { parseTownMapCsv } from "../src/lib/town-district/csv.ts";
import { stopIfUnmapped, todayInJapan, writeMigrationIfChanged } from "./lib/city-open-data.mjs";
import { fetchWithRetry } from "./lib/geocode.mjs";

const root = join(import.meta.dirname, "..");

console.log(`取得：「${CENSUS_NAME}」${CENSUS_DOWNLOAD_URL}`);
const zip = new Uint8Array(await (await fetchWithRetry(CENSUS_DOWNLOAD_URL)).arrayBuffer());
const files = Object.entries(unzipSync(zip, { filter: (file) => file.name.endsWith(".txt") }));
if (files.length !== 1) throw new Error(`ZIP の中の表が1つではない：${files.map(([name]) => name).join("、")}`);
const [[fileName, bytes]] = files;
const csvText = new TextDecoder("shift_jis", { fatal: true }).decode(bytes);
console.log(`表：${fileName}`);

const townMap = parseTownMapCsv(readFileSync(join(root, "data/iida_district_map.csv"), "utf8"));
const { populations, unmappedTowns, skippedTowns } = buildDistrictPopulations(csvText, townMap);
stopIfUnmapped(unmappedTowns);
if (skippedTowns.length > 0) {
  console.log(`0人か、別の町丁・字等に合算されていて、地区を決めずに飛ばした町丁・字等：${skippedTowns.join("、")}`);
}

console.log("\n地区：総数／0〜14歳／15〜64歳／65歳以上（年齢不詳があるので3区分の合計は総数以下）");
for (const p of populations) {
  console.log(`  ${p.districtId}: ${p.total}／${p.age0to14}／${p.age15to64}／${p.age65plus}（${p.towns.length}町丁・字等）`);
}
writeMigrationIfChanged("_population_data.sql", buildPopulationSql(populations, todayInJapan()));
