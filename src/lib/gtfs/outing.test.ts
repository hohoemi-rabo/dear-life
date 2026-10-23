import { describe, expect, it } from "vitest";
import { formatGtfsTime, parseClock } from "./feed";
import { countDepartures, findDirectTrips, planOuting, winterReferenceDate, withoutOvertakenTrips, type DirectTrip } from "./outing";
import { buildTestFeed } from "./test-feed";

const SATURDAY = "20270116";
const WEEKDAY = "20270115";

// 駅前 → 病院 → 団地 の路線（行き）と、その逆（帰り）。乗り場は向きごとに分かれている
const feed = buildTestFeed({
  stops: { S1: "駅前", S2: "駅前", H1: "病院", H2: "病院", D1: "団地", D2: "団地" },
  trips: [
    { id: "out-0900", service: "土曜", stops: [{ stop: "D1", time: "09:00:00" }, { stop: "H1", time: "09:10:00" }, { stop: "S1", time: "09:20:00" }] },
    { id: "out-1100", service: "土曜", stops: [{ stop: "D1", time: "11:00:00" }, { stop: "H1", time: "11:10:00" }, { stop: "S1", time: "11:20:00" }] },
    // 団地では乗れない便（降車専用）
    { id: "out-1000-noboard", service: "土曜", stops: [{ stop: "D1", time: "10:00:00", pickup: "1" }, { stop: "S1", time: "10:20:00" }] },
    // 駅前で降りられない便（乗車専用）
    { id: "out-1030-noalight", service: "土曜", stops: [{ stop: "D1", time: "10:30:00" }, { stop: "S1", time: "10:50:00", dropOff: "1" }] },
    { id: "back-1300", service: "土曜", stops: [{ stop: "S2", time: "13:00:00" }, { stop: "H2", time: "13:10:00" }, { stop: "D2", time: "13:20:00" }] },
    { id: "back-1500", service: "土曜", stops: [{ stop: "S2", time: "15:00:00" }, { stop: "D2", time: "15:20:00" }] },
    { id: "back-1700", service: "土曜", stops: [{ stop: "S2", time: "17:00:00" }, { stop: "D2", time: "17:20:00" }] },
    // 平日だけの便
    { id: "out-weekday", service: "平日", stops: [{ stop: "D1", time: "08:00:00" }, { stop: "S1", time: "08:20:00" }] },
    // 日付をまたぐ便（土曜の運行日の 24:30 発）
    { id: "back-late", service: "土曜", stops: [{ stop: "S2", time: "24:30:00" }, { stop: "D2", time: "24:50:00" }] },
  ],
});

const times = (trips: DirectTrip[]) => trips.map((trip) => `${formatGtfsTime(trip.departure)}-${formatGtfsTime(trip.arrival)}`);

describe("findDirectTrips", () => {
  it("その日に走る、乗れる停留所から降りられる停留所への便だけを、発車の順に返す", () => {
    expect(times(findDirectTrips([feed], "団地", "駅前", SATURDAY))).toEqual(["09:00-09:20", "11:00-11:20"]);
    expect(times(findDirectTrips([feed], "団地", "駅前", WEEKDAY))).toEqual(["08:00-08:20"]);
  });

  it("向きの違う乗り場も同じ名前のバス停として探し、逆向きの便は使わない", () => {
    expect(times(findDirectTrips([feed], "駅前", "団地", SATURDAY))).toEqual(["13:00-13:20", "15:00-15:20", "17:00-17:20", "24:30-24:50"]);
    expect(times(findDirectTrips([feed], "病院", "団地", SATURDAY))).toEqual(["13:10-13:20"]);
  });

  it("循環線のように同じバス停を2回通る便では、降りる所の手前で最後に乗れる所から乗る", () => {
    const loop = buildTestFeed({
      stops: { A: "病院前", B: "駅前", C: "団地" },
      trips: [
        {
          id: "loop",
          service: "土曜",
          stops: [
            { stop: "A", time: "09:00:00", dropOff: "1" },
            { stop: "B", time: "09:05:00" },
            { stop: "C", time: "09:20:00" },
            { stop: "B", time: "09:35:00" },
            { stop: "A", time: "09:40:00", pickup: "1" },
          ],
        },
      ],
    });
    expect(times(findDirectTrips([loop], "駅前", "病院前", SATURDAY))).toEqual(["09:35-09:40"]);
    expect(times(findDirectTrips([loop], "病院前", "駅前", SATURDAY))).toEqual(["09:00-09:05"]);
  });

  it("複数のフィードの便をまとめて探す", () => {
    const other = buildTestFeed({
      feedId: "other",
      stops: { X: "団地", Y: "駅前" },
      trips: [{ id: "x", service: "土曜", stops: [{ stop: "X", time: "10:15:00" }, { stop: "Y", time: "10:40:00" }] }],
    });
    const trips = findDirectTrips([feed, other], "団地", "駅前", SATURDAY);
    expect(times(trips)).toEqual(["09:00-09:20", "10:15-10:40", "11:00-11:20"]);
    expect(trips[1].feedId).toBe("other");
  });

  it("有効期間の外の日には便がない", () => {
    expect(findDirectTrips([feed], "団地", "駅前", "20270403")).toEqual([]);
  });
});

describe("withoutOvertakenTrips", () => {
  const trip = (departure: string, arrival: string, tripId: string): DirectTrip => ({
    feedId: "f",
    tripId,
    routeName: "R",
    headsign: "",
    fromStopId: "a",
    toStopId: "b",
    departure: parseClock(departure),
    arrival: parseClock(arrival),
  });

  it("後に出て先に着く便がある遠回りの便を除く", () => {
    const trips = [trip("9:30", "10:16", "loop-long"), trip("9:40", "9:50", "loop-short"), trip("10:00", "10:30", "next")];
    expect(withoutOvertakenTrips(trips).map((t) => t.tripId)).toEqual(["loop-short", "next"]);
  });

  it("同じ時刻に出て遅く着く便を除き、発車も到着も同じ便は1本にする", () => {
    const trips = [trip("9:00", "9:30", "a"), trip("9:00", "9:40", "b"), trip("9:00", "9:30", "c")];
    expect(withoutOvertakenTrips([trips[0], trips[2], trips[1]]).map((t) => t.tripId)).toEqual(["c"]);
  });
});

describe("countDepartures", () => {
  it("そのバス停から乗れる便を、行き先を問わず数える。終点で降りるだけの便と乗れない便は数えない", () => {
    // 駅前：帰りの4本（out-* は駅前が終点）。団地：out-0900・out-1100・out-1030-noalight（out-1000-noboard は乗れない）
    expect(countDepartures([feed], "駅前", SATURDAY)).toBe(4);
    expect(countDepartures([feed], "団地", SATURDAY)).toBe(3);
  });
});

describe("planOuting", () => {
  const plan = (departAfter: string, returnAfter: string, date = SATURDAY) =>
    planOuting([feed], { origin: "団地", destination: "駅前", date, departAfter: parseClock(departAfter), returnAfter: parseClock(returnAfter) });

  it("行きは指定の時刻以降の最初の便、帰りは指定の時刻以降の便とその次の便。本数も返す", () => {
    const result = plan("9:00", "14:00");
    expect(result.status).toBe("available");
    expect(result.outbound?.tripId).toBe("out-0900");
    expect(result.return?.tripId).toBe("back-1500");
    expect(result.nextReturn?.tripId).toBe("back-1700");
    expect(result.outboundTripsPerDay).toBe(2);
    expect(result.returnTripsPerDay).toBe(4);
    expect(result.originDeparturesPerDay).toBe(3);
  });

  it("帰りは行きの到着より後の便にする", () => {
    const result = plan("11:00", "9:00");
    expect(result.outbound?.tripId).toBe("out-1100");
    expect(result.return?.tripId).toBe("back-1300");
  });

  it("次の便がなければ null。24時を超える便も、その運行日の便として扱う", () => {
    const result = plan("9:00", "17:30");
    expect(result.return?.tripId).toBe("back-late");
    expect(formatGtfsTime(result.return!.departure)).toBe("24:30");
    expect(result.nextReturn).toBeNull();
  });

  it("行きの便がない・帰りの便がないことを区別する", () => {
    expect(plan("12:00", "13:00").status).toBe("no_outbound");
    const noReturn = plan("9:00", "25:00");
    expect(noReturn.status).toBe("no_return");
    expect(noReturn.outbound?.tripId).toBe("out-0900");
    expect(noReturn.return).toBeNull();
  });
});

describe("winterReferenceDate", () => {
  it("1月15日以降で、その曜日に当たる最初の日を返す", () => {
    expect(winterReferenceDate([feed], "平日")).toBe("20270115");
    expect(winterReferenceDate([feed], "土曜")).toBe("20270116");
    expect(winterReferenceDate([feed], "日曜")).toBe("20270117");
  });

  it("どのフィードも有効な期間から選び、冬が入っていなければ null（データ未取得の扱い）", () => {
    const later = buildTestFeed({ stops: { A: "A" }, trips: [], validFrom: "20270120", validTo: "20280331" });
    expect(winterReferenceDate([later], "土曜")).toBe("20270123");
    expect(winterReferenceDate([feed, later], "土曜")).toBe("20270123");
    const summer = buildTestFeed({ stops: { A: "A" }, trips: [], validFrom: "20270401", validTo: "20271130" });
    expect(winterReferenceDate([summer], "土曜")).toBeNull();
    expect(winterReferenceDate([feed, summer], "土曜")).toBeNull();
  });
});
