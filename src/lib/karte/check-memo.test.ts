import { describe, expect, it } from "vitest";
import { checkMemoItems, checkMemoTagFor } from "./check-memo";

const ids = (items: ReturnType<typeof checkMemoItems>) => items.map((item) => item.id);

describe("checkMemoItems（まずはここから）", () => {
  it("子どもあり・車0台は、子ども → 車なし → 住まいの3つ。車なしは地図へ", () => {
    const items = checkMemoItems({ children: 2, car: 0, housing: "old" });
    expect(ids(items)).toEqual(["childcare", "car-free", "housing"]);
    expect(items[0]).toMatchObject({ question: "子どもが通う学校や保育施設は、どこにある？", target: { kind: "detail", card: "childcare" } });
    expect(items[1]).toMatchObject({ question: "車を持たずに暮らすなら、どんな移動手段がある？", target: { kind: "map" } });
    expect(items[2]).toMatchObject({ tag: "古めの家を買うなら", question: "価格の目安と、購入前の確認点は？" });
  });

  it("子どもなし・車ありでも、住まいの問いは必ず出る", () => {
    expect(ids(checkMemoItems({ children: 0, car: 2, housing: "new" }))).toEqual(["housing"]);
    expect(ids(checkMemoItems({ children: 0, car: null, housing: "new" }))).toEqual(["housing"]);
  });

  it("借りるは家賃の目安と、地区の借家の世帯数を確かめるよう案内する（034）", () => {
    const [housing] = checkMemoItems({ children: 0, car: 1, housing: "rent" });
    expect(housing.tag).toBe("家を借りるなら");
    expect(housing.question).toBe("家賃の目安と、住む前の確認点は？");
    expect(housing.note).toBe("飯田市の家賃の平均と、地区で借家に住む世帯の数を確かめよう。");
  });

  it("カードの札はメモと同じ。メモにないカードは null", () => {
    const items = checkMemoItems({ children: 1, car: 0, housing: "new" });
    expect(checkMemoTagFor(items, "transport")).toBe("車を持たないなら");
    expect(checkMemoTagFor(items, "disaster")).toBeNull();
  });
});
