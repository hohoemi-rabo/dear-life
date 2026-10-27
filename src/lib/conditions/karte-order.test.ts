import { describe, expect, it } from "vitest";
import { karteLayout, NO_CAR_NOTICE } from "./karte-order";
import type { Priority } from "./labels";
import type { Conditions } from "./model";

function layout(children: number, car: Conditions["car"], priorities: Priority[] = []) {
  return karteLayout({ children, car, priorities });
}

// 要件 4章の表の「カルテ」の列を1行ずつ確かめる
describe("karteLayout", () => {
  it("子ども0人・車未選択・大切にしたいことなし：既定の並びのまま、子育て・学校だけ下へ", () => {
    const result = layout(0, null);
    expect(result.cards).toEqual(["housing", "transport", "disaster", "population", "public_facilities", "childcare", "support"]);
    expect(result.leads).toEqual(["子どもがいないので、子育て・学校の情報は下の方に表示しています。"]);
    expect(result.transportNotice).toBeNull();
  });

  it("子ども1人以上：子育て・学校を大切にしたいことのすぐ後ろ（なければいちばん上）へ", () => {
    expect(layout(1, null).cards).toEqual(["childcare", "housing", "transport", "disaster", "population", "public_facilities", "support"]);
    expect(layout(2, null, ["disaster"]).cards).toEqual([
      "disaster",
      "childcare",
      "housing",
      "transport",
      "population",
      "public_facilities",
      "support",
    ]);
    expect(layout(1, null).leads).toEqual(["子どもがいるので、子育て・学校の情報を前の方に表示しています。"]);
  });

  it("子ども0人：大切にしたいことで子育て・学校を選んだときは、選んだ位置に置く", () => {
    const result = layout(0, null, ["childcare"]);
    expect(result.cards).toEqual(["childcare", "housing", "transport", "disaster", "population", "public_facilities", "support"]);
    expect(result.leads).toEqual(["子育て・学校に関する情報を先に表示しています。"]);
  });

  it("車0台：交通を上げ、注意書きを添える", () => {
    const result = layout(0, 0);
    expect(result.cards).toEqual(["transport", "housing", "disaster", "population", "public_facilities", "childcare", "support"]);
    expect(result.leads).toContain("車を持たない暮らしなので、交通の情報を前の方に表示しています。");
    expect(result.transportNotice).toBe(NO_CAR_NOTICE);
    expect(NO_CAR_NOTICE).toBe("本数や時間帯によっては、車なしの暮らしが難しいことがあります。");
  });

  it("車0台・子ども1人以上・大切にしたいことあり：大切にしたいこと → 子育て・学校 → 交通", () => {
    const result = layout(1, 0, ["population"]);
    expect(result.cards).toEqual(["population", "childcare", "transport", "housing", "disaster", "public_facilities", "support"]);
    expect(result.leads).toEqual([
      "人口に関する情報を先に表示しています。",
      "子どもがいるので、子育て・学校の情報を前の方に表示しています。",
      "車を持たない暮らしなので、交通の情報を前の方に表示しています。",
    ]);
  });

  it("車0台で交通を大切にしたいことに選んだときは、交通を選んだ位置に置き、注意書きは添える", () => {
    const result = layout(0, 0, ["housing", "transport"]);
    expect(result.cards).toEqual(["housing", "transport", "disaster", "population", "public_facilities", "childcare", "support"]);
    expect(result.leads).not.toContain("車を持たない暮らしなので、交通の情報を前の方に表示しています。");
    expect(result.transportNotice).toBe(NO_CAR_NOTICE);
  });

  it.each([1, 2, null] as const)("車 %s（1台以上・未選択）は並びを変えず、注意書きも出さない", (car) => {
    const result = layout(0, car, ["disaster"]);
    expect(result.cards).toEqual(["disaster", "housing", "transport", "population", "public_facilities", "childcare", "support"]);
    expect(result.transportNotice).toBeNull();
  });

  it("大切にしたいことは既定の並び順で先に並べ、一文にまとめる。選ばなかった分野も隠さない", () => {
    const result = layout(1, null, ["population", "housing", "disaster"]);
    expect(result.cards).toEqual(["housing", "disaster", "population", "childcare", "transport", "public_facilities", "support"]);
    expect(result.leads[0]).toBe("住まい・防災・人口に関する情報を先に表示しています。");
  });

  it("どの条件の組み合わせでも、7枚すべてを1回ずつ出し、支援制度は最後に置き、一文を必ず出す", () => {
    const allPriorities: Priority[] = ["housing", "childcare", "transport", "disaster", "population"];
    for (const children of [0, 1]) {
      for (const car of [0, 1, 2, null] as const) {
        for (let mask = 0; mask < 2 ** allPriorities.length; mask++) {
          const priorities = allPriorities.filter((_, index) => mask & (1 << index));
          const result = layout(children, car, priorities);
          expect(new Set(result.cards).size).toBe(7);
          expect(result.cards.at(-1)).toBe("support");
          expect(result.cards.slice(0, priorities.length)).toEqual(priorities);
          expect(result.leads.length).toBeGreaterThan(0);
        }
      }
    }
  });
});
