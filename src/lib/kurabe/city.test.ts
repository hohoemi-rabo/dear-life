import { describe, expect, it } from "vitest";
import { COMPARE_METRICS } from "@/lib/compare-city/metrics";
import { NOTICES } from "@/lib/notices";
import { EVALUATION_WORDS } from "@/lib/scenes/check";
import { compareCityFixture, compareMetricFixture, MARKET_SOURCE, marketFixture, screenDataFixture, sourceFixture } from "@/test/screen-data-fixture";
import { cityCompareGroups, cityCompareSources, compareCityOptions, findIida, floodPeriod, formatMetricValue } from "./city";
import { parseCompareCity, parseCompareView } from "./links";

const JMA = sourceFixture("jma_climate_normals", { publisher: "気象庁" });
const FLOOD = sourceFixture("mlit_flood_statistics", { publisher: "国土交通省" });

describe("いまの街と（041）の表の中身", () => {
  it("雨・風・雪 → 水害の被害 → 人口 → 住まい の順。住まいだけ飯田側は選んだ地区の相場", () => {
    const data = screenDataFixture({ kanae: { market: { land: marketFixture(24000, 96), house_built_within_20y: { status: "unavailable" }, house_built_over_20y: { status: "unavailable" } } } });
    const tokyo = compareCityFixture("tokyo", { market: { land: marketFixture(520000, 3500) } });
    const groups = cityCompareGroups(tokyo, findIida(data), data.districts.kanae);
    expect(groups.map((group) => [group.title, group.rows.map((row) => row.label)])).toEqual([
      ["雨・風・雪", ["1年の降水量", "日降水量30mm以上の日数", "日最大風速10m/s以上の日数", "最深積雪"]],
      ["水害の被害", ["住まいや店の水害被害額"]],
      ["人口", ["人口密度", "15歳未満の割合"]],
      ["住まい", ["土地（宅地）の m² 単価", "中古戸建て（築20年以内）", "中古戸建て（築21年以上）"]],
    ]);
    const land = groups[3].rows[0];
    expect(land).toMatchObject({ kind: "market", city: { value: { median: 520000 } }, district: { value: { median: 24000 } } });
    // 値のない指標は「データ未取得」
    expect(groups[0].rows[0]).toMatchObject({ city: { status: "unavailable" }, iida: { status: "unavailable" } });
  });

  it("地区を選んでいなければ、住まいの飯田側は null（地区を選ぶと出ます）。都市がなければ全部データ未取得", () => {
    const groups = cityCompareGroups(null, null, null);
    expect(groups[3].rows.every((row) => row.kind === "market" && row.district === null && row.city.status === "unavailable")).toBe(true);
  });

  it("比べる都市の選択肢に飯田市は入らない", () => {
    expect(compareCityOptions(screenDataFixture()).map((city) => city.id)).toEqual(["tokyo", "yokohama", "nagoya", "osaka", "nagano", "matsumoto"]);
  });

  it("出典は値のある行のものだけ。手で入れた値は行の対象期間と、いちばん新しい確認日。相場は集計の対象期間", () => {
    const city = compareCityFixture("tokyo", {
      metrics: { precip_annual: compareMetricFixture(1598.2, "mm", JMA, { checkedOn: "2026-11-14" }) },
      market: { land: marketFixture(520000, 3500) },
    });
    const iida = compareCityFixture("iida", {
      metrics: {
        precip_annual: compareMetricFixture(1612.5, "mm", JMA, { checkedOn: "2026-11-16" }),
        flood_damage_10y: compareMetricFixture(1200, "万円", FLOOD, { periodLabel: "2014〜2023年" }),
      },
    });
    const groups = cityCompareGroups(city, iida, null);
    expect(cityCompareSources(groups).map(({ source, period, checkedOn }) => [source.id, period, checkedOn])).toEqual([
      ["jma_climate_normals", "1991〜2020年", "2026-11-16"],
      ["mlit_flood_statistics", "2014〜2023年", "2026-11-14"],
      [MARKET_SOURCE.id, "2021年第1四半期〜2026年第1四半期", undefined],
    ]);
    expect(floodPeriod(groups)).toBe("2014〜2023年");
    expect(floodPeriod(cityCompareGroups(null, null, null))).toBeNull();
  });

  it("数字は小数1桁までで桁区切り", () => {
    expect(formatMetricValue(1598.25)).toBe("1,598.3");
    expect(formatMetricValue(42)).toBe("42");
    expect(formatMetricValue(11.4)).toBe("11.4");
  });

  it("行の名前・注意書きに評価の言葉（便利・多い・少ない・安全など）を入れない", () => {
    const words = [
      ...COMPARE_METRICS.map((metric) => metric.label),
      ...cityCompareGroups(null, null, null).flatMap((group) => [group.title, ...group.rows.map((row) => row.label)]),
      NOTICES.compareWeather,
      NOTICES.compareFlood,
      NOTICES.compareHousing,
      NOTICES.compareNotJudgement,
    ];
    expect(words.filter((text) => EVALUATION_WORDS.test(text))).toEqual([]);
  });
});

describe("いまの街との URL（041）", () => {
  it("t=city で開き、知らない値は最初のタブ", () => {
    expect(parseCompareView("city")).toBe("city");
    expect(parseCompareView("town")).toBe("housing");
  });

  it("都市は m に持つ。知らない値・なしは東京23区、東京がなければ最初の都市、都市がなければ null", () => {
    const ids = ["tokyo", "yokohama"];
    expect(parseCompareCity("yokohama", ids)).toBe("yokohama");
    expect(parseCompareCity("kanae", ids)).toBe("tokyo");
    expect(parseCompareCity(null, ids)).toBe("tokyo");
    expect(parseCompareCity(null, ["osaka"])).toBe("osaka");
    expect(parseCompareCity(null, [])).toBeNull();
  });
});
