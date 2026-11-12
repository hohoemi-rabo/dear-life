import { detailTexts, entryNumber, withDistrict } from "./details.ts";
import { KARTE_DETAIL_SLUGS, karteCardFromSlug, karteDetailPath, splitKarteCards, transportQuestion } from "./entries.ts";
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

describe("カルテの図鑑の形（028）", () => {
  it("並び順を保ったまま、大きいカードと小さいカードに分ける", () => {
    expect(splitKarteCards(["population", "childcare", "housing", "support", "transport", "public_facilities", "disaster"])).toEqual({
      main: ["childcare", "housing", "transport", "disaster"],
      minor: ["population", "support", "public_facilities"],
    });
  });

  it("7項目の詳細のページの名前は、行きと帰りで同じ項目に戻る", () => {
    for (const [card, slug] of Object.entries(KARTE_DETAIL_SLUGS)) {
      expect(karteCardFromSlug(slug)).toBe(card);
      expect(karteDetailPath(card as keyof typeof KARTE_DETAIL_SLUGS)).toBe(`/karte/${slug}`);
    }
    expect(karteCardFromSlug("unknown")).toBeNull();
  });

  it("交通の問いは車の台数で変わる", () => {
    expect(transportQuestion(null)).toBe("毎日、どう動く？");
    expect(transportQuestion(0)).toBe("車なしで、どう動く？");
    expect(transportQuestion(1)).toBe("車1台で、どう動く？");
    expect(transportQuestion(2)).toBe("車2台以上で、どう動く？");
  });

  it("図鑑の番号は一覧の並びで決まり、文の {district} は地区名になる", () => {
    expect(entryNumber(["childcare", "housing"], "housing")).toBe("02");
    expect(withDistrict(detailTexts("disaster", { housing: "new", transportQuestion: "" }).knows?.text ?? "", "鼎")).toBe(
      "鼎の指定緊急避難場所と、使える災害の種類です。",
    );
    // 子育て・学校は「この数字から分かること」を出さない（2026-11-12 まさゆきさん）
    expect(detailTexts("childcare", { housing: "new", transportQuestion: "" }).knows).toBeNull();
  });
});
