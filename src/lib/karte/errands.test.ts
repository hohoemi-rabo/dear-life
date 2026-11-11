import { describe, expect, it } from "vitest";
import type { BusErrand } from "@/lib/data/screen-data";
import { sourceFixture } from "@/test/screen-data-fixture";
import { errandsOf, errandStation, highSchoolNames } from "./errands";

const UNAVAILABLE = { status: "unavailable" } as const;
const counts = {
  status: "available",
  value: [
    { stationName: "鼎", direction: "上り", tripsPerDay: 19 },
    { stationName: "鼎", direction: "下り", tripsPerDay: 18 },
    { stationName: "切石", direction: "上り", tripsPerDay: 30 },
  ],
  source: sourceFixture("railway_honsu"),
} as const;

describe("errandStation（037）", () => {
  it("地区の駅を出る電車の上り・下りの本数と合計。ほかの駅は数えない", () => {
    expect(errandStation({ id: "kanae", trainDepartures: UNAVAILABLE, trainCounts: counts })).toEqual({
      status: "trips",
      stationName: "鼎",
      total: 37,
      up: 19,
      down: 18,
      withTimes: false,
    });
  });

  it("伊賀良は駅がない。本数のデータがなければ、その状態を返す", () => {
    expect(errandStation({ id: "igara", trainDepartures: UNAVAILABLE, trainCounts: counts })).toEqual({ status: "none" });
    expect(errandStation({ id: "kanae", trainDepartures: UNAVAILABLE, trainCounts: UNAVAILABLE })).toEqual({
      status: "missing",
      stationName: "鼎",
      state: UNAVAILABLE,
    });
    // 指定の駅がデータにない（駅名が変わったなど）ときは、別の駅の本数で埋めない
    expect(errandStation({ id: "kamisato", trainDepartures: UNAVAILABLE, trainCounts: counts })).toMatchObject({ status: "missing" });
  });
});

describe("highSchoolNames・errandsOf（037）", () => {
  it("高校だけの名前。学校がなければ空、データ未取得なら null", () => {
    const source = sourceFixture("iida_education");
    const schools = {
      status: "available",
      value: [
        { name: "鼎中学校", subkind: "中学校", address: null },
        { name: "下伊那農業高等学校", subkind: "高等学校", address: null },
      ],
      source,
    } as const;
    expect(highSchoolNames({ schools })).toEqual(["下伊那農業高等学校"]);
    expect(highSchoolNames({ schools: { status: "none", source } })).toEqual([]);
    expect(highSchoolNames({ schools: UNAVAILABLE })).toBeNull();
  });

  it("種類ごとのまとまりに分ける（並びはそのまま）", () => {
    const errand = (place: string, kind: BusErrand["kind"]): BusErrand => ({
      place,
      kind,
      hasStop: true,
      officialUrl: null,
      dayType: "平日",
      serviceDate: "2027-01-15",
      districtStopCount: 1,
      reachableStopCount: 1,
      minTripsPerDay: 1,
      maxTripsPerDay: 1,
    });
    const errands = [errand("市役所", "市役所"), errand("中学校", "中学校"), errand("病院", "病院"), errand("小学校", "小学校"), errand("店", "店")];
    expect(errandsOf(errands, "office").map((e) => e.place)).toEqual(["市役所", "病院"]);
    expect(errandsOf(errands, "school").map((e) => e.place)).toEqual(["中学校", "小学校"]);
    expect(errandsOf(errands, "store").map((e) => e.place)).toEqual(["店"]);
  });
});
