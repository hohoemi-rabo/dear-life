import { describe, expect, it } from "vitest";
import { formatGtfsTime, isServiceActive, parseClock, parseFeed, parseGtfsTime, weekdayIndex } from "./feed";
import { buildTestFeed } from "./test-feed";

describe("時刻", () => {
  it("24時を超える時刻を、運行日の 0:00 からの秒として読む", () => {
    expect(parseGtfsTime("07:05:00")).toBe(7 * 3600 + 5 * 60);
    expect(parseGtfsTime("7:05:00")).toBe(7 * 3600 + 5 * 60);
    expect(parseGtfsTime("25:10:30")).toBe(25 * 3600 + 10 * 60 + 30);
    expect(formatGtfsTime(parseGtfsTime("25:10:30"))).toBe("25:10");
    expect(formatGtfsTime(parseGtfsTime("09:05:00"))).toBe("09:05");
  });

  it("形のおかしい時刻は止める", () => {
    expect(() => parseGtfsTime("7:5")).toThrow("H:MM:SS");
    expect(() => parseGtfsTime("07:60:00")).toThrow();
    expect(() => parseClock("9時")).toThrow("H:MM");
    expect(parseClock("9:00")).toBe(9 * 3600);
  });
});

describe("運行日", () => {
  const feed = buildTestFeed({
    stops: { A: "A" },
    trips: [],
    calendars: { 平日: "1111100", 土曜: "0000010" },
    exceptions: { 平日: { "20270111": 2 }, 土曜: { "20270111": 1 } },
    validFrom: "20260401",
    validTo: "20270331",
  });

  it("曜日を月曜 0 〜日曜 6 で返す", () => {
    expect(weekdayIndex("20270111")).toBe(0);
    expect(weekdayIndex("20270116")).toBe(5);
    expect(weekdayIndex("20270117")).toBe(6);
  });

  it("calendar の曜日で決め、calendar_dates の追加・運休を優先する（祝日の月曜を土曜ダイヤにするなど）", () => {
    expect(isServiceActive(feed, "平日", "20270112")).toBe(true);
    expect(isServiceActive(feed, "平日", "20270116")).toBe(false);
    expect(isServiceActive(feed, "土曜", "20270116")).toBe(true);
    expect(isServiceActive(feed, "平日", "20270111")).toBe(false);
    expect(isServiceActive(feed, "土曜", "20270111")).toBe(true);
  });

  it("データの有効期間の外の日は、calendar_dates で追加されていても運行日と見なさない", () => {
    expect(isServiceActive(feed, "平日", "20270401")).toBe(false);
    expect(isServiceActive(feed, "平日", "20260331")).toBe(false);
    const extended = buildTestFeed({ stops: { A: "A" }, trips: [], exceptions: { 平日: { "20270405": 1 } }, validTo: "20270331" });
    expect(isServiceActive(extended, "平日", "20270405")).toBe(false);
  });

  it("calendar にない service_id は走らない", () => {
    expect(isServiceActive(feed, "日曜", "20270117")).toBe(false);
  });
});

describe("parseFeed", () => {
  it("乗り降りの制限を読む。1（不可）と 2・3（予約・申し出）は乗れない・降りられないとみなす", () => {
    const feed = buildTestFeed({
      stops: { A: "A", B: "B", C: "C", D: "D" },
      trips: [
        {
          id: "t1",
          service: "平日",
          stops: [
            { stop: "A", time: "08:00:00", dropOff: "1" },
            { stop: "B", time: "08:10:00", pickup: "2" },
            { stop: "C", time: "08:20:00", dropOff: "3" },
            { stop: "D", time: "08:30:00", pickup: "1" },
          ],
        },
      ],
    });
    expect(feed.trips[0].stopTimes.map((s) => [s.stopId, s.canBoard, s.canAlight])).toEqual([
      ["A", true, false],
      ["B", false, true],
      ["C", true, false],
      ["D", false, true],
    ]);
    expect(feed.validTo).toBe("20270331");
    expect(feed.version).toBe("v1");
  });

  it("必要なファイルや、stops にない停留所があれば止める", () => {
    expect(() => parseFeed("f", { "stops.txt": "stop_id,stop_name,stop_lat,stop_lon\n" })).toThrow("routes.txt");
    expect(() =>
      buildTestFeed({ stops: { A: "A" }, trips: [{ id: "t", service: "平日", stops: [{ stop: "X", time: "08:00:00" }] }] }),
    ).toThrow("X");
  });

  it("stop_sequence の順に並べる", () => {
    const feed = parseFeed("f", {
      "stops.txt": "stop_id,stop_name,stop_lat,stop_lon\nA,A,35,137\nB,B,35,137",
      "routes.txt": "route_id,route_long_name\nR,R線",
      "trips.txt": "route_id,service_id,trip_id\nR,平日,t",
      "stop_times.txt": "trip_id,arrival_time,departure_time,stop_id,stop_sequence\nt,08:10:00,08:10:00,B,20\nt,08:00:00,08:00:00,A,3",
    });
    expect(feed.trips[0].stopTimes.map((s) => s.stopId)).toEqual(["A", "B"]);
    expect(feed.validTo).toBeNull();
  });
});
