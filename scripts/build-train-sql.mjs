// JR飯田線の駅（SENA）と時刻（data/jr_iida_line_*.csv）から、4地区の駅と発車時刻をそろえるマイグレーションを作る（チケット 026）。
// 使い方：npm run train:sql
//   1. SENA の駅の CSV を取る（Shift_JIS）
//   2. 飯田市内の駅の緯度経度を町名にする（国土地理院の逆ジオコーダ。結果は data/station_towns.csv にためて、新しい位置だけ問い合わせる）
//   3. 町名を data/iida_district_map.csv で地区に振り分ける（対応表にない町名があれば止める）
//   4. 時刻の CSV から、4地区の駅を発車する列車と、data/train_outings.csv のおでかけの便と本数を出す
//   5. supabase/migrations/<版番号>_train_data.sql を書き出す。いちばん新しいものと中身が同じなら何もしない
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { STATIONS_CSV_URL, buildDepartures, buildStations, buildTrainSql, parseStationsCsv } from "../src/lib/train/import.ts";
import { buildTrainOutings, parseTrainOutingsCsv } from "../src/lib/train/outing.ts";
import { parseTimetableCsv } from "../src/lib/train/timetable.ts";
import { formatGtfsTime } from "../src/lib/gtfs/feed.ts";
import { parseTownMapCsv } from "../src/lib/town-district/csv.ts";
import { createTownResolver } from "../src/lib/town-district/resolve.ts";
import { fetchWithRetry, geocodeMissing, readTowns } from "./lib/geocode.mjs";

const root = join(import.meta.dirname, "..");
const migrationsDir = join(root, "supabase/migrations");
const suffix = "_train_data.sql";
const stationTownsPath = join(root, "data/station_towns.csv");

const stationsBytes = await (await fetchWithRetry(STATIONS_CSV_URL)).arrayBuffer();
const sena = parseStationsCsv(new TextDecoder("shift_jis", { fatal: true }).decode(stationsBytes));
console.log(`駅の CSV：${sena.length}駅`);

const resolveTown = createTownResolver(parseTownMapCsv(readFileSync(join(root, "data/iida_district_map.csv"), "utf8")));
const stationTowns = readTowns(stationTownsPath);
let stations = buildStations(sena, stationTowns, resolveTown);
if (stations.missingCoordinates.length > 0) {
  await geocodeMissing(stationTownsPath, stationTowns, stations.missingCoordinates);
  stations = buildStations(sena, stationTowns, resolveTown);
}
if (stations.unmappedTowns.length > 0) {
  console.error(`対応表にない町名があります。data/iida_district_map.csv に足して npm run town-map:sql で当ててから、もう一度動かしてください：\n  ${stations.unmappedTowns.join("、")}`);
  process.exit(1);
}

const timetables = [
  parseTimetableCsv(readFileSync(join(root, "data/jr_iida_line_up.csv"), "utf8"), "上り"),
  parseTimetableCsv(readFileSync(join(root, "data/jr_iida_line_down.csv"), "utf8"), "下り"),
];
const departures = buildDepartures(stations.rows, timetables);

console.log("\n4地区の駅と1日の本数：");
for (const station of stations.rows) {
  const summary = ["上り", "下り"].map((direction) => {
    const times = departures.filter((d) => d.station === station.name && d.direction === direction).map((d) => d.departure);
    return `${direction} ${times.length}本（${times.at(0)}〜${times.at(-1)}）`;
  });
  console.log(`  ${station.districtId} ${station.name}（${station.townName}） ${summary.join(" ")}`);
}

const outings = buildTrainOutings(timetables, parseTrainOutingsCsv(readFileSync(join(root, "data/train_outings.csv"), "utf8")));
const time = (trip) => (trip ? `${formatGtfsTime(trip.departure)}→${formatGtfsTime(trip.arrival)}（${trip.trainType}）` : "なし");
console.log("\nおでかけ（特急を除く）：");
for (const outing of outings) {
  console.log(
    `  ${outing.districtId} ${outing.sortOrder} ${outing.origin}→${outing.destination} ${outing.status}` +
      ` 行き ${time(outing.outbound)} 帰り ${time(outing.return)} 次 ${time(outing.nextReturn)}` +
      ` 直通 ${outing.outboundTripsPerDay}/${outing.returnTripsPerDay} 乗る駅 ${outing.originDeparturesPerDay}`,
  );
}

const importedOn = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
const sql = buildTrainSql({ stations: stations.rows, departures, outings, importedOn });

// 確認日は毎回変わるので、比べるときは外す
const withoutDates = (text) => text.replace(/checked_on = '[^']*'::date/g, "");
const latest = readdirSync(migrationsDir).filter((f) => f.endsWith(suffix)).sort().at(-1);
if (latest && withoutDates(readFileSync(join(migrationsDir, latest), "utf8")) === withoutDates(sql)) {
  console.log(`\n変更なし（${latest} と同じ中身です）`);
  process.exit(0);
}

// 版番号は Supabase と同じ UTC の YYYYMMDDHHMMSS。当てたあと list_migrations の番号に合わせて名前を直す
const version = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
const file = `${version}${suffix}`;
writeFileSync(join(migrationsDir, file), sql);
console.log(`\nsupabase/migrations/${file} を書き出しました。npm test を通してから Supabase MCP の apply_migration で当ててください`);
