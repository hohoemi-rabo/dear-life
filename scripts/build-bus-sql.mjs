// GTFS データリポジトリから南信州のバスの GTFS-JP を取り、バス停とおでかけの便をそろえるマイグレーションを作る（チケット 010）。
// 使い方：npm run bus:sql
//   1. フィードごとに今の版の情報と zip を取る（ライセンスが CC BY 4.0 でなければ止める）
//   2. 乗り場の緯度経度を町名にする（国土地理院の逆ジオコーダ。結果は data/bus_stop_towns.csv にためて、新しい位置だけ問い合わせる）
//   3. 町名を data/iida_district_map.csv で地区に振り分ける（対応表にない町名があれば止める）
//   4. data/bus_outings.csv のおでかけの便と本数を計算する
//   5. supabase/migrations/<版番号>_bus_gtfs_data.sql を書き出す。いちばん新しいものと中身が同じなら何もしない
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { unzipSync } from "fflate";
import { REQUIRED_FILES, OPTIONAL_FILES, formatGtfsTime, parseFeed } from "../src/lib/gtfs/feed.ts";
import {
  BUS_FEEDS,
  EXPECTED_LICENSE,
  buildBusSql,
  buildBusStops,
  buildOutings,
  parseOutingsCsv,
} from "../src/lib/gtfs/import.ts";
import { parseTownMapCsv } from "../src/lib/town-district/csv.ts";
import { createTownResolver } from "../src/lib/town-district/resolve.ts";
import { fetchWithRetry, geocodeMissing, readTowns } from "./lib/geocode.mjs";

const root = join(import.meta.dirname, "..");
const migrationsDir = join(root, "supabase/migrations");
const suffix = "_bus_gtfs_data.sql";
const stopTownsPath = join(root, "data/bus_stop_towns.csv");

const API = "https://api.gtfs-data.jp/v2";

async function loadFeed({ organizationId, feedId }) {
  const detail = (await (await fetchWithRetry(`${API}/organizations/${organizationId}/feeds/${feedId}`)).json()).body;
  if (detail.feed_license !== EXPECTED_LICENSE) {
    throw new Error(`${feedId} のライセンスが ${EXPECTED_LICENSE} ではなくなった（${detail.feed_license}）。表記を確かめ直すまで取り込まない`);
  }
  if (detail.is_discontinued) throw new Error(`${feedId} は配布が終わっている（${detail.discontinued_date}）`);
  const current = detail.gtfs_files.find((file) => file.rid === "current");
  if (!current) throw new Error(`${feedId} に今の版（rid=current）がない`);

  const zip = new Uint8Array(await (await fetchWithRetry(current.gtfs_url)).arrayBuffer());
  const wanted = new Set([...REQUIRED_FILES, ...OPTIONAL_FILES]);
  const entries = unzipSync(zip, { filter: (file) => wanted.has(file.name.split("/").at(-1)) });
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const files = Object.fromEntries(Object.entries(entries).map(([name, data]) => [name.split("/").at(-1), decoder.decode(data)]));
  const feed = parseFeed(feedId, files);

  return {
    meta: {
      feedId,
      organizationId,
      feedName: detail.feed_name,
      license: detail.feed_license,
      fileUid: current.gtfs_file_uid,
      feedVersion: feed.version,
      publishedAt: current.published_at,
      fromDate: current.from_date,
      toDate: current.to_date,
    },
    feed,
  };
}

const feeds = [];
for (const target of BUS_FEEDS) {
  feeds.push(await loadFeed(target));
  console.log(`取得：${target.feedId}（${feeds.at(-1).meta.fromDate}〜${feeds.at(-1).meta.toDate}）`);
}

const townMap = parseTownMapCsv(readFileSync(join(root, "data/iida_district_map.csv"), "utf8"));
const resolveTown = createTownResolver(townMap);
const stopTowns = readTowns(stopTownsPath);

let stops = buildBusStops(feeds, stopTowns, resolveTown);
if (stops.missingCoordinates.length > 0) {
  await geocodeMissing(stopTownsPath, stopTowns, stops.missingCoordinates);
  stops = buildBusStops(feeds, stopTowns, resolveTown);
}
if (stops.unmappedTowns.length > 0) {
  console.error(`対応表にない町名があります。data/iida_district_map.csv に足して npm run town-map:sql で当ててから、もう一度動かしてください：\n  ${stops.unmappedTowns.join("、")}`);
  process.exit(1);
}

const outings = buildOutings(feeds, parseOutingsCsv(readFileSync(join(root, "data/bus_outings.csv"), "utf8")));
const sql = buildBusSql({ feeds: feeds.map((loaded) => loaded.meta), stops: stops.rows, outings, importedAt: new Date().toISOString() });

console.log("\n地区ごとのバス停の数：");
for (const district of ["kamisato", "kanae", "igara", "chushin"]) {
  console.log(`  ${district}: ${stops.rows.filter((row) => row.districtId === district).length}`);
}
const time = (trip) => (trip ? `${formatGtfsTime(trip.departure)}→${formatGtfsTime(trip.arrival)}` : "なし");
console.log("\nおでかけ：");
for (const outing of outings) {
  console.log(
    `  ${outing.districtId} ${outing.sortOrder} ${outing.origin}→${outing.destination} ${outing.serviceDate}（${outing.dayType}） ${outing.status}` +
      ` 行き ${time(outing.outbound)} 帰り ${time(outing.return)} 次 ${time(outing.nextReturn)}` +
      ` 直通 ${outing.outboundTripsPerDay}/${outing.returnTripsPerDay} 乗り場 ${outing.originDeparturesPerDay}`,
  );
}

// 取得日時・公開日時は毎回変わるので、比べるときは外す
const withoutTimestamps = (text) => text.replace(/'\d{4}-\d{2}-\d{2}T[^']*'::timestamptz/g, "''");
const latest = readdirSync(migrationsDir).filter((f) => f.endsWith(suffix)).sort().at(-1);
if (latest && withoutTimestamps(readFileSync(join(migrationsDir, latest), "utf8")) === withoutTimestamps(sql)) {
  console.log(`\n変更なし（${latest} と同じ中身です）`);
  process.exit(0);
}

// 版番号は Supabase と同じ UTC の YYYYMMDDHHMMSS。当てたあと list_migrations の番号に合わせて名前を直す
const version = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
const file = `${version}${suffix}`;
writeFileSync(join(migrationsDir, file), sql);
console.log(`\nsupabase/migrations/${file} を書き出しました。npm test を通してから Supabase MCP の apply_migration で当ててください`);
