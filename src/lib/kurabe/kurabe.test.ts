import { describe, expect, it } from "vitest";
import type { DistrictEvent } from "@/lib/data/screen-data";
import { availableFixture, MARKET_SOURCE, marketFixture, screenDataFixture, sourceFixture } from "@/test/screen-data-fixture";
import { DEFAULT_CONDITIONS } from "../conditions/model";
import { compareSources, eventLabel, eventSources } from "./compare";
import { karteFromKurabeHref, kurabeHref } from "./links";

const EDUCATION = sourceFixture("iida_education", { name: "教育機関一覧", publisher: "飯田市" });
const POPULATION = sourceFixture("estat_census_small_area", { name: "国勢調査 小地域集計", publisher: "総務省統計局" });

function event(name: string, extra: Partial<DistrictEvent> = {}): DistrictEvent {
  return {
    season: "春",
    name,
    chushinArea: null,
    timingNote: "4月",
    scope: "地区全体",
    participation: "未確認",
    participationNote: null,
    isForChildren: false,
    art: "祭り",
    sourceNote: "飯田市の公民館活動（令和7年度）",
    checkedOn: "2026-10-26",
    ...extra,
  };
}

describe("compareSources", () => {
  it("出典を出てくる順に1回ずつ。相場は値のあるどれかの対象期間、人口は時点を対象にする。データ未取得は入らない", () => {
    const data = screenDataFixture({
      // 上郷は相場が該当なしでも、出典は鼎の値から対象期間を取る
      kamisato: { market: { land: { status: "none", source: MARKET_SOURCE }, house_built_within_20y: { status: "unavailable" }, house_built_over_20y: { status: "unavailable" } } },
      kanae: {
        market: { land: marketFixture(24000, 96), house_built_within_20y: marketFixture(33500000, 12), house_built_over_20y: { status: "unavailable" } },
        schools: availableFixture([{ name: "鼎小学校", subkind: "小学校", address: null }], EDUCATION),
        population: availableFixture({ asOf: "2020-10-01", total: 12000, age0to14: null, age15to64: null, age65plus: null }, POPULATION),
      },
      igara: { schools: { status: "none", source: EDUCATION } },
    });
    expect(compareSources(data).map(({ source, period }) => [source.id, period])).toEqual([
      ["reinfolib_xit001", "2021年第1四半期〜2026年第1四半期"],
      ["iida_education", undefined],
      ["estat_census_small_area", "2020年10月1日時点"],
    ]);
  });
});

describe("eventSources・eventLabel", () => {
  it("資料と確認日の組を1回ずつ。中心市街地は地区名を添える", () => {
    const data = screenDataFixture({
      kamisato: { events: [event("上郷歩こう会"), event("黒田人形奉納上演")] },
      chushin: { events: [event("おひまち", { chushinArea: "橋南" }), event("X", { checkedOn: "2026-11-01" })] },
    });
    expect(eventSources(data)).toEqual([
      { note: "飯田市の公民館活動（令和7年度）", checkedOn: "2026-10-26" },
      { note: "飯田市の公民館活動（令和7年度）", checkedOn: "2026-11-01" },
    ]);
    expect(eventLabel(data.districts.chushin.events[0])).toBe("おひまち（橋南）");
    expect(eventLabel(data.districts.kamisato.events[0])).toBe("上郷歩こう会");
  });
});

describe("kurabeHref・karteFromKurabeHref", () => {
  const conditions = { ...DEFAULT_CONDITIONS, district: "kanae" as const, car: 0 as const };

  it("条件と季節を残して行き来する", () => {
    expect(kurabeHref(conditions, "winter")).toBe("/kurabe?s=winter&d=kanae&a=2&k=1&h=new&c=0");
    expect(karteFromKurabeHref(conditions, new URLSearchParams("s=winter&d=kanae"))).toBe("/karte?s=winter&d=kanae&a=2&k=1&h=new&c=0");
  });

  it("季節がなければ付けない", () => {
    expect(kurabeHref(conditions, null)).toBe("/kurabe?d=kanae&a=2&k=1&h=new&c=0");
  });
});
