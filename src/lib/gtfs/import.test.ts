import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { TownMapEntry } from "../town-district/resolve";
import {
  buildBusSql,
  buildBusStops,
  buildCreditText,
  buildOutings,
  buildPeriodLabel,
  coordinateKey,
  parseOutingsCsv,
  type FeedMeta,
  type LoadedFeed,
  type StopTown,
} from "./import";
import { buildTestFeed } from "./test-feed";

const ROOT = join(__dirname, "../../..");
const HEADER = "地区,並び順,曜日,乗り場,行き先,行きの時刻以降,帰りの時刻以降";

const meta = (feedId: string, toDate = "2027-03-31"): FeedMeta => ({
  feedId,
  organizationId: "minamishinshu",
  feedName: ` ${feedId} の路線 `,
  license: "CC BY 4.0",
  fileUid: `${feedId}-uid`,
  feedVersion: "v1",
  publishedAt: "2026-09-03T13:41:28+09:00",
  fromDate: "2026-04-01",
  toDate,
});

describe("parseOutingsCsv", () => {
  it("本物の data/bus_outings.csv を読める", () => {
    const configs = parseOutingsCsv(readFileSync(join(ROOT, "data/bus_outings.csv"), "utf8"));
    expect(new Set(configs.map((config) => config.districtId))).toEqual(new Set(["kamisato", "kanae", "igara", "chushin"]));
    for (const districtId of ["kamisato", "kanae", "igara", "chushin"]) {
      expect(configs.some((config) => config.districtId === districtId && config.sortOrder === 1)).toBe(true);
    }
  });

  it("時刻を HH:MM にそろえる", () => {
    expect(parseOutingsCsv(`${HEADER}\n鼎,1,土曜,A,B,9:00,12:30\n`)[0]).toMatchObject({
      districtId: "kanae",
      dayType: "土曜",
      departAfter: "09:00",
      returnAfter: "12:30",
    });
  });

  it.each([
    ["松尾,1,土曜,A,B,9:00,12:00", "4地区"],
    ["鼎,0,土曜,A,B,9:00,12:00", "並び順"],
    ["鼎,1,祝日,A,B,9:00,12:00", "曜日"],
    ["鼎,1,土曜,,B,9:00,12:00", "乗り場と行き先"],
    ["鼎,1,土曜,A,B,9時,12:00", "H:MM"],
  ])("おかしい行は止める：%s", (line, message) => {
    expect(() => parseOutingsCsv(`${HEADER}\n${line}\n`)).toThrow(message);
  });

  it("同じ地区の並び順の重複と、見出しの違いを止める", () => {
    expect(() => parseOutingsCsv(`${HEADER}\n鼎,1,土曜,A,B,9:00,12:00\n鼎,1,平日,A,B,9:00,12:00\n`)).toThrow("重複");
    expect(() => parseOutingsCsv("地区,曜日\n鼎,土曜\n")).toThrow("見出し");
  });
});

describe("buildBusStops", () => {
  // 乗り場の位置は buildTestFeed が並び順で決める（35.5{i}, 137.8{i}）
  const feed = buildTestFeed({
    feedId: "f1",
    stops: { E1: "駅前", E2: "駅前", K1: "境橋", K2: "境橋", O1: "隣村", N1: "新町", U1: "使われない", M1: "毛賀" },
    trips: [
      {
        id: "t",
        service: "土曜",
        stops: ["E1", "E2", "K1", "K2", "O1", "N1", "M1"].map((stop, index) => ({ stop, time: `09:0${index}:00` })),
      },
    ],
  });
  const position = (index: number) => coordinateKey(Number(`35.5${index}`), Number(`137.8${index}`));
  const towns = new Map<string, StopTown>([
    [position(0), { muniCode: "20205", townName: "上飯田" }],
    [position(1), { muniCode: "20205", townName: "上飯田" }],
    [position(2), { muniCode: "20205", townName: "東中央通五丁目" }],
    [position(3), { muniCode: "20205", townName: "上郷別府" }],
    [position(4), { muniCode: "20413", townName: "平岡" }],
    [position(5), { muniCode: "20205", townName: "新しい町" }],
    [position(6), { muniCode: "20205", townName: "上飯田" }],
    [position(7), { muniCode: "20205", townName: "毛賀" }],
  ]);
  const entries: Record<string, TownMapEntry> = {
    上飯田: { townName: "上飯田", cityDistrict: "中心市街地", districtId: "chushin" },
    東中央通: { townName: "東中央通", cityDistrict: "中心市街地", districtId: "chushin" },
    上郷別府: { townName: "上郷別府", cityDistrict: "上郷", districtId: "kamisato" },
    毛賀: { townName: "毛賀", cityDistrict: "松尾", districtId: null },
  };
  const resolve = (town: string) => Object.values(entries).find((entry) => town.startsWith(entry.townName)) ?? null;
  const loaded: LoadedFeed[] = [{ meta: meta("f1"), feed }];

  it("同じ名前・同じ地区の乗り場を1つのバス停にまとめ、地区の境のバス停は両方の地区に数える", () => {
    const result = buildBusStops(loaded, towns, resolve);
    expect(result.rows.map((row) => `${row.name}/${row.districtId}/${row.townName}`).sort()).toEqual(
      ["境橋/kamisato/上郷別府", "境橋/chushin/東中央通五丁目", "駅前/chushin/上飯田"].sort(),
    );
    const station = result.rows.find((row) => row.name === "駅前")!;
    expect(station.stopIds).toEqual(["f1:E1", "f1:E2"]);
    expect(station.lat).toBeCloseTo(35.505);
    expect(station.routeNames).toEqual(["R1線"]);
  });

  it("飯田市外・対象外の地区の乗り場と、便の止まらない乗り場は入れない。対応表にない町名を返す", () => {
    const result = buildBusStops(loaded, towns, resolve);
    expect(result.rows.some((row) => ["隣村", "使われない", "毛賀"].includes(row.name))).toBe(false);
    expect(result.unmappedTowns).toEqual(["新しい町"]);
    expect(result.missingCoordinates).toEqual([]);
  });

  it("町名がまだわからない乗り場の位置を返す", () => {
    const partial = new Map(towns);
    partial.delete(position(0));
    expect(buildBusStops(loaded, partial, resolve).missingCoordinates).toEqual([position(0)]);
  });
});

describe("buildOutings", () => {
  const feed = buildTestFeed({
    stops: { A: "団地", B: "駅前" },
    trips: [
      { id: "out", service: "土曜", stops: [{ stop: "A", time: "09:30:00" }, { stop: "B", time: "09:50:00" }] },
      { id: "back", service: "土曜", stops: [{ stop: "B", time: "13:00:00" }, { stop: "A", time: "13:20:00" }] },
    ],
    validTo: "20270331",
  });
  const loaded: LoadedFeed[] = [{ meta: meta("f"), feed }];

  it("冬のその曜日の日で便を決め、データの有効期間の終わりを付ける", () => {
    const [row] = buildOutings(loaded, parseOutingsCsv(`${HEADER}\n鼎,1,土曜,団地,駅前,9:00,12:00\n`));
    expect(row).toMatchObject({ serviceDate: "2027-01-16", status: "available", validUntil: "2027-03-31", outboundTripsPerDay: 1 });
    expect(row.return?.tripId).toBe("back");
  });

  it("フィードにないバス停の名前は、書き間違いとして止める", () => {
    expect(() => buildOutings(loaded, parseOutingsCsv(`${HEADER}\n鼎,1,土曜,団地,駅まえ,9:00,12:00\n`))).toThrow("駅まえ");
  });
});

describe("buildBusSql", () => {
  it("クレジットに提供元・データ名・ライセンス・加工したことを書き、期間はどのフィードも有効な終わりの日にする", () => {
    const feeds = [meta("A"), meta("B", "2027-02-28")];
    expect(buildCreditText(feeds)).toBe(
      "出典：南信州地域交通問題協議会「A の路線」「B の路線」（GTFSデータリポジトリ）。CC BY 4.0（https://creativecommons.org/licenses/by/4.0/deed.ja）。時刻表から、乗り場と行き先の間の便と本数を抜き出して作成",
    );
    expect(buildPeriodLabel(feeds)).toBe("2027年2月28日まで有効なダイヤ");
  });

  it("中身が空なら、今あるデータを消さないよう SQL を作らない", () => {
    expect(() => buildBusSql({ feeds: [meta("A")], stops: [], outings: [], importedAt: "2026-10-23T00:00:00Z" })).toThrow("空");
  });
});

describe("リポジトリのマイグレーション", () => {
  it("いちばん新しい *_bus_gtfs_data.sql に、bus_outings.csv のおでかけがすべて入っている（CSV を変えたら npm run bus:sql を流す）", () => {
    const dir = join(ROOT, "supabase/migrations");
    const latest = readdirSync(dir).filter((file) => file.endsWith("_bus_gtfs_data.sql")).sort().at(-1);
    expect(latest).toBeDefined();
    const sql = readFileSync(join(dir, latest!), "utf8");
    const configs = parseOutingsCsv(readFileSync(join(ROOT, "data/bus_outings.csv"), "utf8"));
    for (const config of configs) {
      const prefix = `('${config.districtId}', ${config.sortOrder}, '${config.dayType}', `;
      const line = sql.split("\n").find((row) => row.trimStart().startsWith(prefix));
      expect(line, `${config.districtId} ${config.sortOrder}`).toBeDefined();
      expect(line).toContain(`'${config.origin}', '${config.destination}', '${config.departAfter}', '${config.returnAfter}'`);
    }
    expect(sql.match(/^ {2}\('(kamisato|kanae|igara|chushin)', \d+, /gm)).toHaveLength(configs.length);
  });
});
