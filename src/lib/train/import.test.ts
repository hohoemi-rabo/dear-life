import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { StopTown } from "../gtfs/import";
import type { TownMapEntry } from "../town-district/resolve";
import { buildDepartures, buildStations, buildTrainSql, parseStationsCsv, type SenaStation } from "./import";
import { buildTrainOutings, parseTrainOutingsCsv } from "./outing";
import { departuresAt, parseTimetableCsv } from "./timetable";

const ROOT = join(__dirname, "../../..");
const HEADER = "No,駅名,ふりがな,起点からの距離,所在市町村,郵便番号,住所,経度,緯度";

const station = (name: string, city: string, lat: number, lon = 137.82): SenaStation => ({ name, kana: "", kilometers: 1, city, lat, lon });

const TOWN_MAP: Record<string, TownMapEntry> = {
  鼎: { townName: "鼎", cityDistrict: "鼎", districtId: "kanae" },
  毛賀: { townName: "毛賀", cityDistrict: "松尾", districtId: null },
};
const resolveTown = (address: string) => Object.values(TOWN_MAP).find((entry) => address.startsWith(entry.townName)) ?? null;

describe("駅の CSV", () => {
  it("SENA の CSV（経度が先）を読む", () => {
    const csv = `${HEADER}\r\n58,鼎,かなえ,125.7km,長野県飯田市,395-0801,飯田市鼎中平,137.828383,35.506726\r\n`;
    expect(parseStationsCsv(csv)).toEqual([
      { name: "鼎", kana: "かなえ", kilometers: 125.7, city: "長野県飯田市", lat: 35.506726, lon: 137.828383 },
    ]);
  });

  it("見出しが違う・緯度経度が入れ替わっているときは止める", () => {
    expect(() => parseStationsCsv("駅名,緯度\n鼎,35.5\n")).toThrow("見出し");
    expect(() => parseStationsCsv(`${HEADER}\n58,鼎,かなえ,125.7km,長野県飯田市,,,35.506726,137.828383\n`)).toThrow("範囲にない");
  });
});

describe("駅の地区への振り分け", () => {
  const towns = new Map<string, StopTown>([
    ["35.5,137.82", { muniCode: "20205", townName: "鼎下山" }],
    ["35.48,137.82", { muniCode: "20205", townName: "毛賀" }],
    ["35.47,137.82", { muniCode: "20205", townName: "どこか" }],
  ]);

  it("飯田市内の4地区の駅だけを入れ、対象外の地区・市外の駅は入れない", () => {
    const result = buildStations(
      [station("鼎", "長野県飯田市", 35.5), station("毛賀", "長野県飯田市", 35.48), station("市田", "長野県高森町", 35.54)],
      towns,
      resolveTown,
    );
    expect(result.rows.map((row) => [row.name, row.townName, row.districtId])).toEqual([["鼎", "鼎下山", "kanae"]]);
    expect(result.missingCoordinates).toEqual([]);
  });

  it("町名にしていない位置と、対応表にない町名を返す", () => {
    const result = buildStations([station("A", "長野県飯田市", 35.47), station("B", "長野県飯田市", 35.46)], towns, resolveTown);
    expect(result.unmappedTowns).toEqual(["どこか"]);
    expect(result.missingCoordinates).toEqual(["35.46,137.82"]);
  });
});

describe("SQL", () => {
  const timetable = parseTimetableCsv(["駅,T1", "種別,普通", "鼎,6:00", "飯田,6:10"].join("\n"), "上り");
  const stations = buildStations([station("鼎", "長野県飯田市", 35.5)], new Map([["35.5,137.82", { muniCode: "20205", townName: "鼎" }]]), resolveTown).rows;

  const back = parseTimetableCsv(["駅,T2", "種別,普通", "飯田,12:00", "鼎,12:10"].join("\n"), "下り");
  const outings = buildTrainOutings(
    [timetable, back],
    parseTrainOutingsCsv("地区,並び順,乗る駅,行き先,行きの時刻以降,帰りの時刻以降\n鼎,1,鼎,飯田,05:00,11:00\n"),
  );

  it("駅・発車時刻・おでかけを、出典ごとに消して入れ直す", () => {
    const sql = buildTrainSql({ stations, departures: buildDepartures(stations, [timetable]), outings, importedOn: "2026-10-23" });
    expect(sql).toContain("delete from public.facilities where source_id = 'sena_iida_line_stations';");
    expect(sql).toContain("('train_station'::public.facility_kind, '鼎', '鼎', 'kanae', 35.5, 137.82, 'sena_iida_line_stations', '鼎',");
    expect(sql).toContain("delete from public.train_departures where source_id = 'iida_jr_timetable';");
    expect(sql).toContain("  ('kanae', '鼎', '上り', '06:00', '普通', 'T1', 'iida_jr_timetable');");
    expect(sql).toContain("period_label = '2026年3月14日改正のダイヤ'");
    expect(sql).toContain("delete from public.train_outings where source_id = 'iida_jr_timetable';");
    expect(sql).toContain(
      "  ('kanae', 1, '鼎', '飯田', '05:00', '11:00', 'available', '06:00', '06:10', '普通', '12:00', '12:10', '普通', null, null, null, 1, 1, 1, 'iida_jr_timetable');",
    );
  });

  it("中身が空なら、今あるデータを消さないよう SQL を作らない", () => {
    expect(() => buildTrainSql({ stations, departures: [], outings, importedOn: "2026-10-23" })).toThrow("空");
    expect(() => buildTrainSql({ stations, departures: buildDepartures(stations, [timetable]), outings: [], importedOn: "2026-10-23" })).toThrow("空");
  });
});

describe("リポジトリのマイグレーション", () => {
  it("いちばん新しい *_train_data.sql の発車時刻が、時刻の CSV と合っている（CSV を変えたら npm run train:sql を流す）", () => {
    const dir = join(ROOT, "supabase/migrations");
    const latest = readdirSync(dir).filter((file) => file.endsWith("_train_data.sql")).sort().at(-1);
    expect(latest).toBeDefined();
    const sql = readFileSync(join(dir, latest!), "utf8");
    const timetables = [
      parseTimetableCsv(readFileSync(join(ROOT, "data/jr_iida_line_up.csv"), "utf8"), "上り"),
      parseTimetableCsv(readFileSync(join(ROOT, "data/jr_iida_line_down.csv"), "utf8"), "下り"),
    ];
    const rows = [...sql.matchAll(/^ {2}\('\w+', '([^']+)', '(上り|下り)', '(\d{2}:\d{2})', /gm)].map((m) => `${m[1]} ${m[2]} ${m[3]}`);
    const stationNames = [...new Set(rows.map((row) => row.split(" ")[0]))];
    expect(stationNames.length).toBeGreaterThan(0);
    const expected = stationNames.flatMap((name) =>
      timetables.flatMap((timetable) => departuresAt(timetable, name).map((d) => `${name} ${d.direction} ${d.departure}`)),
    );
    expect(rows.sort()).toEqual(expected.sort());
  });

  it("いちばん新しい *_train_data.sql に、train_outings.csv のおでかけがすべて入っている", () => {
    const dir = join(ROOT, "supabase/migrations");
    const latest = readdirSync(dir).filter((file) => file.endsWith("_train_data.sql")).sort().at(-1);
    const sql = readFileSync(join(dir, latest!), "utf8");
    const configs = parseTrainOutingsCsv(readFileSync(join(ROOT, "data/train_outings.csv"), "utf8"));
    for (const config of configs) {
      const prefix = `  ('${config.districtId}', ${config.sortOrder}, '${config.origin}', '${config.destination}', '${config.departAfter}', '${config.returnAfter}', `;
      expect(sql.split("\n").some((row) => row.startsWith(prefix)), `${config.districtId} ${config.sortOrder}`).toBe(true);
    }
    expect(sql.match(/^ {2}\('(kamisato|kanae|igara|chushin)', \d+, /gm)).toHaveLength(configs.length);
  });
});
