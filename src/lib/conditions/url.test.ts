import { describe, expect, it } from "vitest";
import { DEFAULT_CONDITIONS, type Conditions } from "./model";
import { conditionsHref, parseConditions, writeConditions } from "./url";

const parse = (query: string) => parseConditions(new URLSearchParams(query));

describe("parseConditions", () => {
  it("パラメータがないときは初期値（大人2人・子ども1人・買う・新しめ、地区と車は未選択）", () => {
    expect(parse("")).toEqual(DEFAULT_CONDITIONS);
    expect(DEFAULT_CONDITIONS).toEqual({
      district: null,
      adults: 2,
      children: 1,
      housing: "new",
      car: null,
      priorities: [],
    });
  });

  it("すべての条件を読む", () => {
    expect(parse("d=igara&a=1&k=2&h=old&c=0&p=disaster,housing")).toEqual({
      district: "igara",
      adults: 1,
      children: 2,
      housing: "old",
      car: 0,
      priorities: ["housing", "disaster"],
    });
  });

  it.each([
    ["d=matsuo", "district", null],
    ["d=", "district", null],
    ["a=1.5", "adults", 2],
    ["a=-1", "adults", 2],
    ["a=２", "adults", 2],
    ["a=1e1", "adults", 2],
    ["k=abc", "children", 1],
    ["h=buy", "housing", "new"],
    ["c=3", "car", null],
    ["c=-0", "car", null],
    ["c=", "car", null],
  ] as const)("不正な値 %s は初期値に戻す", (query, key, expected) => {
    expect(parse(query)[key]).toEqual(expected);
  });

  it.each([
    ["a=0", "adults", 1],
    ["a=3", "adults", 2],
    ["a=10", "adults", 2],
    ["k=5", "children", 4],
    ["k=10", "children", 4],
  ] as const)("範囲の外の人数 %s は、範囲の端に丸める（大人1〜2人・子ども0〜4人）", (query, key, expected) => {
    expect(parse(query)[key]).toBe(expected);
  });

  it("子ども0人・車2台以上を読む", () => {
    expect(parse("k=0&c=2")).toMatchObject({ children: 0, car: 2 });
  });

  it("大切にしたいことは、知らない分野・支援制度・重なりを捨てて既定の並びにそろえる", () => {
    expect(parse("p=population,support,foo,transport,transport,").priorities).toEqual([
      "transport",
      "population",
    ]);
  });

  it("ある項目が不正でも、ほかの項目はそのまま読む", () => {
    expect(parse("d=kanae&a=99&k=0")).toMatchObject({ district: "kanae", adults: 2, children: 0 });
  });
});

describe("writeConditions", () => {
  const conditions: Conditions = {
    district: "chushin",
    adults: 1,
    children: 0,
    housing: "rent",
    car: 0,
    priorities: ["population", "childcare"],
  };

  it("短いパラメータ名で書き、読み直すと同じ条件に戻る", () => {
    const params = writeConditions(conditions);
    expect(Object.fromEntries(params)).toEqual({ d: "chushin", a: "1", k: "0", h: "rent", c: "0", p: "childcare,population" });
    expect(parseConditions(params)).toEqual({ ...conditions, priorities: ["childcare", "population"] });
  });

  it("未選択の地区・車と、空の大切にしたいことは書かない。家族と家は初期値でも書く", () => {
    expect(Object.fromEntries(writeConditions(DEFAULT_CONDITIONS))).toEqual({ a: "2", k: "1", h: "new" });
  });

  it("条件以外のパラメータは残し、古い条件は消す", () => {
    const base = new URLSearchParams("s=冬&c=1&p=housing");
    const params = writeConditions({ ...DEFAULT_CONDITIONS, district: "kamisato" }, base);
    expect(Object.fromEntries(params)).toEqual({ s: "冬", d: "kamisato", a: "2", k: "1", h: "new" });
  });
});

describe("conditionsHref", () => {
  it("条件つきのリンク先を作る", () => {
    expect(conditionsHref("/kurashi", { ...DEFAULT_CONDITIONS, district: "kanae", car: 1 })).toBe(
      "/kurashi?d=kanae&a=2&k=1&h=new&c=1",
    );
  });
});
