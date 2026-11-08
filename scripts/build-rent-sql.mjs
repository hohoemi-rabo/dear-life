// 借りて住むときの参考になる国の統計から、マイグレーションを作る（チケット 034）。
// 使い方：npm run rent:sql（.env.local に e-Stat API のアプリケーションID ESTAT_APP_ID を置いておく）
//   1. e-Stat から長野県の「住宅の所有の関係別一般世帯数」（国勢調査 小地域集計）の ZIP を取り、飯田市の町丁・字等を4地区に合計する
//   2. e-Stat API で、住宅・土地統計調査の飯田市の民営借家の家賃の平均を取る
//   3. supabase/migrations/<版番号>_rent_data.sql を書き出す。いちばん新しいものと中身が同じなら何もしない
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { unzipSync } from "fflate";
import {
  TENURE_CENSUS_NAME,
  TENURE_DOWNLOAD_URL,
  RENT_STATS_DATA_ID,
  buildDistrictTenures,
  buildRentSql,
  parseRentAverages,
  rentApiUrl,
} from "../src/lib/housing/import.ts";
import { parseTownMapCsv } from "../src/lib/town-district/csv.ts";
import { stopIfUnmapped, todayInJapan, writeMigrationIfChanged } from "./lib/city-open-data.mjs";
import { fetchWithRetry } from "./lib/geocode.mjs";

const root = join(import.meta.dirname, "..");
const envFile = join(root, ".env.local");
if (existsSync(envFile)) process.loadEnvFile(envFile);
const appId = process.env.ESTAT_APP_ID;
if (!appId) throw new Error(".env.local に ESTAT_APP_ID（e-Stat API のアプリケーションID）がない");

console.log(`取得：「${TENURE_CENSUS_NAME}」${TENURE_DOWNLOAD_URL}`);
const zip = new Uint8Array(await (await fetchWithRetry(TENURE_DOWNLOAD_URL)).arrayBuffer());
const files = Object.entries(unzipSync(zip, { filter: (file) => file.name.endsWith(".txt") }));
if (files.length !== 1) throw new Error(`ZIP の中の表が1つではない：${files.map(([name]) => name).join("、")}`);
const [[fileName, bytes]] = files;
console.log(`表：${fileName}`);
const townMap = parseTownMapCsv(readFileSync(join(root, "data/iida_district_map.csv"), "utf8"));
const { tenures, unmappedTowns, skippedTowns } = buildDistrictTenures(
  new TextDecoder("shift_jis", { fatal: true }).decode(bytes),
  townMap,
);
stopIfUnmapped(unmappedTowns);
if (skippedTowns.length > 0) console.log(`世帯がないか、別の町丁・字等に合算されていて、地区を決めずに飛ばした町丁・字等：${skippedTowns.join("、")}`);
console.log("\n地区：住宅に住む一般世帯／持ち家／民営借家（割合）");
for (const t of tenures) {
  const share = ((t.privateRented / t.householdsInHousing) * 100).toFixed(1);
  console.log(`  ${t.districtId}: ${t.householdsInHousing}／${t.ownerOccupied}／${t.privateRented}（${share}%。${t.towns.length}町丁・字等）`);
}

// アプリケーションID が出力に出ないよう、URL は表示しない
console.log(`\n取得：e-Stat API 統計表ID ${RENT_STATS_DATA_ID}`);
const rents = parseRentAverages(await (await fetchWithRetry(rentApiUrl(appId))).json());
console.log("飯田市の民営借家の家賃の平均（家賃0円を含まない）：");
for (const r of rents) console.log(`  ${r.buildingType}: ${r.averageRent.toLocaleString("ja-JP")}円`);

writeMigrationIfChanged("_rent_data.sql", buildRentSql(tenures, rents, todayInJapan()));
