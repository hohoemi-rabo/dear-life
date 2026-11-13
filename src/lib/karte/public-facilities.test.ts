import { describe, expect, it } from "vitest";
import type { Facility } from "../data/screen-data.ts";
import { publicFacilityGroups, publicUseOf, publicUseTabs } from "./public-facilities.ts";

const facility = (name: string, subkind: string | null): Facility => ({ name, subkind, address: null });

const FACILITIES = [
  facility("上郷図書館", "図書館"),
  facility("飯田市歴史研究所", "文化施設"),
  facility("城東2号公園", "公園"),
  facility("上郷公民館", "公民館"),
  facility("上郷体育館", "運動施設"),
  facility("城東3号公園", "公園"),
  facility("上郷自治振興センター", "市役所・支所"),
];

describe("publicUseTabs", () => {
  it("使い道の順に並べ、施設のない使い道（受診する）は出さない", () => {
    expect(publicUseTabs(FACILITIES).map((tab) => tab.title)).toEqual([
      "子どもと遊ぶ",
      "本を借りる",
      "体を動かす",
      "地域の活動・文化",
      "手続きをする",
    ]);
  });

  it("タブの中は種類の順（公民館 → 文化施設）、同じ種類は届いた順", () => {
    const tabs = publicUseTabs(FACILITIES);
    expect(tabs[0].facilities.map((item) => item.name)).toEqual(["城東2号公園", "城東3号公園"]);
    expect(tabs[3].facilities.map((item) => item.name)).toEqual(["上郷公民館", "飯田市歴史研究所"]);
  });
});

describe("publicUseOf", () => {
  it("学習・交流施設・福祉施設と、知らない種類は「地域の活動・文化」に入れる", () => {
    expect(publicUseOf(facility("鼎交流センター", "学習・交流施設"))).toBe("community");
    expect(publicUseOf(facility("福祉センター", "福祉施設"))).toBe("community");
    expect(publicUseOf(facility("温泉", "温泉・観光"))).toBe("community");
    expect(publicUseOf(facility("市立病院", "病院・診療所"))).toBe("medical");
  });
});

describe("publicFacilityGroups", () => {
  it("すべて見る・印刷は種類ごとに、使い道のタブの順でまとめる", () => {
    expect(publicFacilityGroups(FACILITIES).map((group) => `${group.subkind}${group.items.length}`)).toEqual([
      "公園2",
      "図書館1",
      "運動施設1",
      "公民館1",
      "文化施設1",
      "市役所・支所1",
    ]);
  });
});
