import { describe, expect, it } from "vitest";
import { orderSelection, printedOn, toggleAll } from "./print";

describe("printedOn", () => {
  it("日本時間の日付で書く（UTC ではまだ前の日でも）", () => {
    expect(printedOn(new Date("2026-11-08T15:30:00Z"))).toBe("2026年11月9日");
  });
});

describe("orderSelection", () => {
  const options = ["summary", "housing", "transport"] as const;

  it("選んだ順ではなく、選択肢の並びにそろえる", () => {
    expect(orderSelection(options, ["transport", "summary"])).toEqual(["summary", "transport"]);
  });

  it("選択肢にないものは捨てる", () => {
    expect(orderSelection<string>(options, ["housing", "support"])).toEqual(["housing"]);
  });
});

describe("toggleAll", () => {
  const options = ["a", "b", "c"] as const;

  it("1つでも外れていれば、すべて選ぶ", () => {
    expect(toggleAll(options, ["a"])).toEqual(["a", "b", "c"]);
    expect(toggleAll(options, [])).toEqual(["a", "b", "c"]);
  });

  it("すべて選んでいれば、すべて外す", () => {
    expect(toggleAll(options, ["a", "b", "c"])).toEqual([]);
  });
});
