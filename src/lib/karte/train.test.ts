import { describe, expect, it } from "vitest";
import { sourceFixture } from "@/test/screen-data-fixture";
import { busiestStation, hasServiceTimes, trainTrips } from "./train";

const counts = { status: "available", value: [{ stationName: "鼎", direction: "上り", tripsPerDay: 19 }], source: sourceFixture("railway_honsu") } as const;

describe("trainTrips", () => {
  it("時刻が公開されていれば時刻から数えた本数、されていなければ運行本数データ（031）", () => {
    const departures = {
      status: "available",
      value: [{ stationName: "鼎", direction: "上り", tripsPerDay: 20, firstDeparture: "06:00", lastDeparture: "23:00" }],
      source: sourceFixture("iida_jr_timetable"),
    } as const;
    expect(trainTrips({ trainDepartures: departures, trainCounts: counts })).toBe(departures);
    expect(trainTrips({ trainDepartures: { status: "unavailable" }, trainCounts: counts })).toBe(counts);
    expect(hasServiceTimes(departures.value)).toBe(true);
    expect(hasServiceTimes(counts.value)).toBe(false);
  });
});

describe("busiestStation", () => {
  it("上り・下りの合計がいちばん多い駅。いちばん多い駅が2つ以上なら tied、駅がなければ null", () => {
    expect(
      busiestStation([
        { stationName: "切石", direction: "上り", tripsPerDay: 19 },
        { stationName: "切石", direction: "下り", tripsPerDay: 19 },
        { stationName: "鼎", direction: "上り", tripsPerDay: 20 },
        { stationName: "鼎", direction: "下り", tripsPerDay: 18 },
        { stationName: "下山村", direction: "上り", tripsPerDay: 19 },
      ]),
    ).toEqual({ stationName: "切石", trips: 38, tied: true, stationCount: 3 });
    expect(
      busiestStation([
        { stationName: "伊那上郷", direction: "上り", tripsPerDay: 20 },
        { stationName: "伊那上郷", direction: "下り", tripsPerDay: 18 },
      ]),
    ).toEqual({ stationName: "伊那上郷", trips: 38, tied: false, stationCount: 1 });
    expect(busiestStation([])).toBeNull();
  });
});
