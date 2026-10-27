import { describe, expect, it } from "vitest";
import { DEFAULT_CONDITIONS } from "../conditions/model";
import { ageShares, groupBySubkind } from "./facilities";
import { landEstimates, marketCategoryOrder } from "./housing";
import { kurashiHref } from "./links";

describe("landEstimates", () => {
  it("坪単価と200㎡の目安を出す（上郷 2.8万円/㎡ → 坪9.26万円・200㎡で560万円）", () => {
    const { perTsubo, forExampleArea } = landEstimates(28000);
    expect(perTsubo).toBeCloseTo(92562.4);
    expect(forExampleArea).toBe(5600000);
  });
});

describe("marketCategoryOrder", () => {
  it("選んだ家に近い相場を先に出す", () => {
    expect(marketCategoryOrder("new")[0]).toBe("house_built_within_20y");
    expect(marketCategoryOrder("old")[0]).toBe("house_built_over_20y");
    expect(marketCategoryOrder("rent")).toEqual(["land", "house_built_within_20y", "house_built_over_20y"]);
  });
});

describe("groupBySubkind", () => {
  it("届いた順のまま種類ごとにまとめ、種類のないものは「そのほか」にする", () => {
    const groups = groupBySubkind([
      { name: "公民館A", subkind: "公民館", address: null },
      { name: "公園A", subkind: "公園", address: null },
      { name: "公民館B", subkind: "公民館", address: null },
      { name: "X", subkind: null, address: null },
    ]);
    expect(groups.map((group) => [group.subkind, group.items.map((item) => item.name)])).toEqual([
      ["公民館", ["公民館A", "公民館B"]],
      ["公園", ["公園A"]],
      ["そのほか", ["X"]],
    ]);
  });
});

describe("ageShares", () => {
  it("年齢3区分の割合を小数1桁で出し、人数のない区分は出さない", () => {
    expect(ageShares({ asOf: "2020-10-01", total: 1000, age0to14: 133, age15to64: null, age65plus: 300 })).toEqual([
      { label: "14歳以下", count: 133, percent: 13.3 },
      { label: "65歳以上", count: 300, percent: 30 },
    ]);
  });
});

describe("kurashiHref", () => {
  it("条件と季節を残してくらしに戻る", () => {
    const href = kurashiHref({ ...DEFAULT_CONDITIONS, district: "kanae", car: 0 }, new URLSearchParams("s=winter&d=kanae"));
    expect(href).toBe("/kurashi?s=winter&d=kanae&a=2&k=1&h=new&c=0");
  });

  it("季節がなければ付けない", () => {
    expect(kurashiHref({ ...DEFAULT_CONDITIONS, district: "igara" }, new URLSearchParams())).toBe("/kurashi?d=igara&a=2&k=1&h=new");
  });
});
