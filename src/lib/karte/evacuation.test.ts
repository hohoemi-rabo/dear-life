import { describe, expect, it } from "vitest";
import type { EvacuationSite } from "../data/screen-data.ts";
import { disasterTabHazards, findEvacuationSites, googleMapsSearchHref } from "./evacuation.ts";

const site = (name: string, address: string | null, hazards: EvacuationSite["hazards"]): EvacuationSite => ({
  name,
  subkind: "指定緊急避難場所",
  address,
  hazards,
});

const SITES = [
  site("浜井場小学校体育館", "長野県飯田市小伝馬町一丁目3503", ["flood", "landslide", "earthquake"]),
  site("ふれあいネット飯田支店２階", "長野県飯田市江戸浜町3686-1", ["flood"]),
  site("丸山小学校", null, ["earthquake"]),
];

describe("disasterTabHazards", () => {
  it("洪水・土砂災害・地震の順。大規模な火事は使える場所があるときだけ4つ目", () => {
    expect(disasterTabHazards(SITES)).toEqual(["flood", "landslide", "earthquake"]);
    expect(disasterTabHazards([...SITES, site("鼎中学校", null, ["large_fire"])])).toEqual(["flood", "landslide", "earthquake", "large_fire"]);
  });
});

describe("findEvacuationSites", () => {
  it("その災害で使える場所だけを、届いた順のまま出す", () => {
    expect(findEvacuationSites(SITES, "flood", "").map((item) => item.name)).toEqual(["浜井場小学校体育館", "ふれあいネット飯田支店２階"]);
    expect(findEvacuationSites(SITES, "large_fire", "")).toEqual([]);
  });

  it("名前か住所（町名）に入れた文字を含むものに絞る。全角・半角と空白の違いは気にしない", () => {
    expect(findEvacuationSites(SITES, "flood", "江戸浜").map((item) => item.name)).toEqual(["ふれあいネット飯田支店２階"]);
    expect(findEvacuationSites(SITES, "flood", " 2階 ").map((item) => item.name)).toEqual(["ふれあいネット飯田支店２階"]);
    expect(findEvacuationSites(SITES, "earthquake", "小学校").map((item) => item.name)).toEqual(["浜井場小学校体育館", "丸山小学校"]);
    expect(findEvacuationSites(SITES, "flood", "鼎")).toEqual([]);
  });
});

describe("googleMapsSearchHref", () => {
  it("施設の名前と住所で Google マップを探す。住所がなければ市の名前を添える", () => {
    expect(googleMapsSearchHref(SITES[0])).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("浜井場小学校体育館 長野県飯田市小伝馬町一丁目3503")}`,
    );
    expect(decodeURIComponent(googleMapsSearchHref(SITES[2]).split("query=")[1])).toBe("丸山小学校 長野県飯田市");
  });
});
