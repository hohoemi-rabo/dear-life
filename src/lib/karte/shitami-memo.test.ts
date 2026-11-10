import { describe, expect, it } from "vitest";
import {
  canAddShitamiItem,
  parseShitamiMemo,
  serializeShitamiMemo,
  shitamiItemForCard,
  shitamiItemForPin,
  shitamiStorageKey,
  SHITAMI_ITEMS,
} from "./shitami-memo";

const base = { children: 0, car: 1, housing: "new" } as const;

describe("下見メモの項目を出す条件（036）", () => {
  it("バスは車0台、学校は子ども1人以上、古めの家は「買う・古め」のときだけ", () => {
    expect(canAddShitamiItem("bus-to-town", base)).toBe(false);
    expect(canAddShitamiItem("bus-to-town", { ...base, car: null })).toBe(false);
    expect(canAddShitamiItem("bus-to-town", { ...base, car: 0 })).toBe(true);
    expect(canAddShitamiItem("walk-around-school", base)).toBe(false);
    expect(canAddShitamiItem("walk-around-school", { ...base, children: 1 })).toBe(true);
    expect(canAddShitamiItem("old-house-questions", base)).toBe(false);
    expect(canAddShitamiItem("old-house-questions", { ...base, housing: "rent" })).toBe(false);
    expect(canAddShitamiItem("old-house-questions", { ...base, housing: "old" })).toBe(true);
  });

  it("カルテの詳細は交通・子育て・住まいの3つだけ", () => {
    const all = { children: 1, car: 0, housing: "old" } as const;
    expect(shitamiItemForCard("transport", all)).toBe("bus-to-town");
    expect(shitamiItemForCard("childcare", all)).toBe("walk-around-school");
    expect(shitamiItemForCard("housing", all)).toBe("old-house-questions");
    for (const card of ["disaster", "population", "public_facilities", "support"] as const) expect(shitamiItemForCard(card, all)).toBeNull();
    expect(shitamiItemForCard("housing", base)).toBeNull();
  });

  it("くらしのピンは「バス・電車」「バス」・学校・住まい。電車だけのピンと高速バスには出さない", () => {
    const all = { children: 1, car: 0, housing: "old" } as const;
    expect(shitamiItemForPin("transit", all)).toBe("bus-to-town");
    expect(shitamiItemForPin("bus", all)).toBe("bus-to-town");
    expect(shitamiItemForPin("school", all)).toBe("walk-around-school");
    expect(shitamiItemForPin("housing", all)).toBe("old-house-questions");
    for (const pin of ["train", "highway", "event", "snow", "evacuation"] as const) expect(shitamiItemForPin(pin, all)).toBeNull();
    expect(shitamiItemForPin("transit", { ...all, car: 2 })).toBeNull();
  });

  it("確認点に距離や評価の言葉を入れない", () => {
    const words = /近い|遠い|徒歩|分で|便利|不便|おすすめ|多い|少ない/;
    for (const item of Object.values(SHITAMI_ITEMS)) {
      for (const text of [item.title, item.lead, item.note, item.checkTitle, ...item.checks]) expect(text ?? "").not.toMatch(words);
    }
  });
});

describe("下見メモの保存の形（036）", () => {
  it("地区ごとに別のキーにする", () => {
    expect(shitamiStorageKey("kanae")).toBe("dearlife:shitami-memo:kanae");
    expect(shitamiStorageKey("igara")).not.toBe(shitamiStorageKey("kanae"));
  });

  it("知っている ID だけを、決まった並びで、重ならないように読む", () => {
    expect(parseShitamiMemo(null)).toEqual([]);
    expect(parseShitamiMemo('["old-house-questions","bus-to-town","old-house-questions"]')).toEqual(["bus-to-town", "old-house-questions"]);
    expect(parseShitamiMemo('["walk-around-school","<script>",3,null]')).toEqual(["walk-around-school"]);
  });

  it("壊れた値・配列でない値は空のメモにする", () => {
    expect(parseShitamiMemo("{")).toEqual([]);
    expect(parseShitamiMemo('{"bus-to-town":true}')).toEqual([]);
    expect(parseShitamiMemo('"bus-to-town"')).toEqual([]);
  });

  it("書くときも決まった並びにする", () => {
    expect(serializeShitamiMemo(["old-house-questions", "bus-to-town"])).toBe('["bus-to-town","old-house-questions"]');
    expect(parseShitamiMemo(serializeShitamiMemo(["walk-around-school"]))).toEqual(["walk-around-school"]);
  });
});
