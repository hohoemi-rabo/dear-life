import { describe, expect, it } from "vitest";
import { DEFAULT_CONDITIONS } from "@/lib/conditions/model";
import { planScene, type Season } from "@/lib/conditions/scene";
import type { DistrictData, DistrictEvent } from "@/lib/data/screen-data";
import { availableFixture, screenDataFixture, sourceFixture } from "@/test/screen-data-fixture";
import { gofreelyHref } from "./gofreely";
import { karteHref } from "./links";
import { scenePictureLayers } from "./picture";
import { parseSeason } from "./season";

describe("parseSeason", () => {
  it("URL の季節を読む。値なし・知らない値は春", () => {
    expect(parseSeason("winter")).toBe("冬");
    expect(parseSeason("autumn")).toBe("秋");
    expect(parseSeason(null)).toBe("春");
    expect(parseSeason("冬")).toBe("春");
    expect(parseSeason("constructor")).toBe("春");
  });
});

describe("karteHref", () => {
  const conditions = { ...DEFAULT_CONDITIONS, district: "kanae" as const, car: 0 as const };

  it("条件と季節を載せてカルテへ移る", () => {
    expect(karteHref(conditions, "冬")).toBe("/karte?s=winter&d=kanae&a=2&k=1&h=new&c=0");
  });

  it("カードを指定すると、そのカードのアンカーを付ける", () => {
    expect(karteHref(conditions, "夏", "disaster")).toBe("/karte?s=summer&d=kanae&a=2&k=1&h=new&c=0#karte-disaster");
  });
});

function event(art: DistrictEvent["art"], extra: Partial<DistrictEvent> = {}): DistrictEvent {
  return {
    season: "秋",
    name: `${art}の行事`,
    chushinArea: null,
    timingNote: "例年10月",
    scope: "地区全体",
    participation: "未確認",
    participationNote: null,
    isForChildren: false,
    art,
    sourceNote: "公民館の資料",
    checkedOn: "2026-10-26",
    ...extra,
  };
}

describe("scenePictureLayers", () => {
  const district = (extra: Partial<DistrictData> = {}): DistrictData => ({ ...screenDataFixture().districts.kamisato, ...extra });
  const assets = (season: Season, options: { car?: 0 | 1 | null; children?: number; events?: DistrictEvent[]; district?: DistrictData } = {}) => {
    const conditions = { ...DEFAULT_CONDITIONS, district: "kamisato" as const, car: options.car ?? null, children: options.children ?? 1 };
    return scenePictureLayers({
      plan: planScene(season, conditions),
      conditions,
      district: options.district ?? district(),
      events: options.events ?? [],
    }).map((layer) => layer.asset);
  };

  it("春・子どもあり：背景・目印・学校・家族の順に重ねる。行事がなければ行事の絵は出さない", () => {
    expect(assets("春")).toEqual(["bg-spring", "landmark-kamisato", "facility-school", "family-a2-c1"]);
  });

  it("春・子どもなし：公共施設。行事があれば田畑の左に重ねる", () => {
    expect(assets("春", { children: 0, events: [event("祭り", { season: "春" })] })).toEqual([
      "bg-spring",
      "landmark-kamisato",
      "event-festival",
      "facility-public",
      "family-a2-c0",
    ]);
  });

  it("夏：避難場所と、いちばん上に大雨", () => {
    expect(assets("夏")).toEqual(["bg-summer", "landmark-kamisato", "facility-shelter", "family-a2-c1", "overlay-rain"]);
  });

  it("秋：行事を2つまで左右に並べる。行事がない秋は行事の絵を作らない", () => {
    expect(assets("秋", { events: [event("運動会"), event("文化祭")] })).toEqual([
      "bg-autumn",
      "landmark-kamisato",
      "event-sports",
      "event-culture",
      "family-a2-c1",
    ]);
    expect(assets("秋")).toEqual(["bg-autumn", "landmark-kamisato", "family-a2-c1"]);
  });

  it("冬・車あり：雪の目印と車", () => {
    expect(assets("冬", { car: 1 })).toEqual(["bg-winter", "landmark-kamisato-winter", "family-a2-c1", "vehicle-car"]);
  });

  it("冬・車0台：バス。電車は地区に駅があるとわかっているときだけ", () => {
    const withStation = district({
      trainStations: availableFixture([{ name: "伊那上郷", subkind: null, address: null }], sourceFixture("sena_iida_line_stations")),
    });
    expect(assets("冬", { car: 0, district: withStation })).toEqual([
      "bg-winter",
      "landmark-kamisato-winter",
      "vehicle-train",
      "family-a2-c1",
      "vehicle-bus",
    ]);
    // 駅のデータが未取得のときは、電車を描かない
    expect(assets("冬", { car: 0 })).toEqual(["bg-winter", "landmark-kamisato-winter", "family-a2-c1", "vehicle-bus"]);
  });

  it("家族の絵は大人2人・子ども3人までで描く", () => {
    expect(assets("夏", { children: 5 })).toContain("family-a2-c3");
  });
});

describe("gofreelyHref", () => {
  it("おでかけの乗り場・行き先・日付・着く時刻・帰りの時刻を渡す", () => {
    const href = gofreelyHref({
      originName: "鼎公民館前",
      destinationName: "飯田駅前",
      outbound: { departure: "10:01", arrival: "10:11", line: "市内線" },
      return: { departure: "12:00", arrival: "12:10", line: "市内線" },
      nextReturn: null,
      outboundTripsPerDay: 17,
      returnTripsPerDay: 16,
      originDeparturesPerDay: 21,
      dayType: "土曜",
      serviceDate: "2027-01-16",
      validUntil: "2027-03-31",
    });
    const url = new URL(href);
    expect(url.origin).toBe("https://gofreely.rabo-hohoemi.workers.dev");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      from: "鼎公民館前",
      to: "飯田駅前",
      date: "2027-01-16",
      arrive: "10:11",
      return: "12:00",
    });
  });
});
