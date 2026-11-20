import { describe, expect, it } from "vitest";
import { karteLayout } from "../conditions/karte-order";
import type { Conditions } from "../conditions/model";
import { karteBackHref, karteDetailHref } from "./links";
import { karteTabCards, karteTabFromHash, karteTabs, parseKarteTab, withKarteTab } from "./tabs";

const conditions: Conditions = {
  district: "kamisato",
  adults: 2,
  children: 1,
  parent: "mother",
  housing: "new",
  car: 1,
  priorities: ["disaster", "population"],
};

describe("カルテのタブ（048）", () => {
  const { cards } = karteLayout(conditions);

  it("選んだときは「わが家の大切なこと」「すべて」と7項目、選ばないときは「すべて」と7項目", () => {
    expect(karteTabs(cards, conditions.priorities)).toEqual([
      "mine",
      "all",
      "disaster",
      "population",
      "childcare",
      "housing",
      "transport",
      "public_facilities",
      "support",
    ]);
    expect(karteTabs(karteLayout({ ...conditions, priorities: [] }).cards, [])).toHaveLength(8);
  });

  it("「わが家の大切なこと」は選んだ項目を karteLayout の順で全部、「すべて」は7枚、項目のタブは1枚", () => {
    expect(karteTabCards("mine", cards, conditions.priorities)).toEqual(["disaster", "population"]);
    expect(karteTabCards("all", cards, conditions.priorities)).toEqual(cards);
    expect(karteTabCards("support", cards, conditions.priorities)).toEqual(["support"]);
  });

  it("URL の値を読む。知らない値・出ないタブは開いたときのタブに戻す", () => {
    expect(parseKarteTab(null, ["housing"])).toBe("mine");
    expect(parseKarteTab(null, [])).toBe("all");
    expect(parseKarteTab("public-facilities", [])).toBe("public_facilities");
    expect(parseKarteTab("public_facilities", ["housing"])).toBe("mine");
    expect(parseKarteTab("mine", [])).toBe("all");
    expect(parseKarteTab("all", ["housing"])).toBe("all");
  });

  it("開いたときのタブでは tab を付けず、ほかのパラメータは残す", () => {
    const params = new URLSearchParams("s=winter&d=kanae&tab=all");
    expect(withKarteTab(params, "mine", ["housing"]).toString()).toBe("s=winter&d=kanae");
    expect(withKarteTab(params, "all", []).toString()).toBe("s=winter&d=kanae");
    expect(withKarteTab(params, "public_facilities", []).toString()).toBe("s=winter&d=kanae&tab=public-facilities");
  });

  it("#karte-<項目> から項目を読む", () => {
    expect(karteTabFromHash("#karte-public_facilities")).toBe("public_facilities");
    expect(karteTabFromHash("#shitami-memo")).toBeNull();
    expect(karteTabFromHash("")).toBeNull();
  });

  it("詳細のページへ行くとき・一覧に戻るときは、見ていたタブを持ち回る", () => {
    const current = new URLSearchParams("s=summer&tab=transport");
    expect(karteDetailHref(conditions, "transport", current)).toBe(
      "/karte/transport?s=summer&d=kamisato&a=2&k=1&h=new&c=1&p=disaster%2Cpopulation&tab=transport",
    );
    expect(karteBackHref(conditions, current)).toBe("/karte?s=summer&d=kamisato&a=2&k=1&h=new&c=1&p=disaster%2Cpopulation&tab=transport");
    expect(karteBackHref(conditions, new URLSearchParams("s=summer"))).toBe("/karte?s=summer&d=kamisato&a=2&k=1&h=new&c=1&p=disaster%2Cpopulation");
  });
});
