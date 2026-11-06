// 全国鉄道運行本数データから、飯田線の駅ごと・向きごとの1日の発車本数をそろえるマイグレーションを作る（チケット 031）。
// 使い方：npm run train-counts:sql
//   1. 「事業者別・駅別発着本数」の CSV（Shift_JIS）を取る
//   2. JR東海の飯田線の駅だけを取り出し、4地区の駅の本数を表示する（市の時刻表から数えた本数と見比べる）
//   3. supabase/migrations/<版番号>_train_counts_data.sql を書き出す。いちばん新しいものと中身が同じなら何もしない
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { COUNTS_EDITION, buildTrainCountsSql, parseLineCounts } from "../src/lib/train/counts.ts";
import { fetchWithRetry } from "./lib/geocode.mjs";

const root = join(import.meta.dirname, "..");
const migrationsDir = join(root, "supabase/migrations");
const suffix = "_train_counts_data.sql";
// 4地区の駅（026 の facilities）。本数を見比べるために表示するだけで、地区との結びつけは screen_data() がする
const DISTRICT_STATIONS = ["伊那上郷", "切石", "鼎", "下山村", "飯田", "桜町", "伊那八幡"];

const bytes = await (await fetchWithRetry(COUNTS_EDITION.csvUrl)).arrayBuffer();
const rows = parseLineCounts(new TextDecoder("shift_jis", { fatal: true }).decode(bytes));
console.log(`飯田線の駅：${new Set(rows.map((row) => row.stationName)).size}駅`);

console.log("\n4地区の駅の1日の発車本数（平日・特急を除く）：");
for (const name of DISTRICT_STATIONS) {
  const of = (direction) => rows.find((row) => row.stationName === name && row.direction === direction)?.departuresPerDay;
  const up = of("上り");
  const down = of("下り");
  if (up === undefined || down === undefined) {
    console.error(`  ${name}：データにありません。駅名が変わっていないか確かめてください`);
    process.exit(1);
  }
  console.log(`  ${name} 上り ${up}本 下り ${down}本 合計 ${up + down}本`);
}

const importedOn = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
const sql = buildTrainCountsSql({ rows, importedOn });

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
