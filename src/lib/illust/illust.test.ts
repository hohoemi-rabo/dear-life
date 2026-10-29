import { describe, expect, it } from "vitest";
import { DISTRICTS } from "../conditions/labels";
import { ERABU_BASES, PEOPLE, POSES, SPRITE_SOURCES, erabuBaseFor, spriteId } from "./assets";
import { DISTRICT_LABEL_POSITIONS } from "./districts";
import { familyMembers, placeFamily } from "./family";
import { SPRITE_SIZES } from "./sprites";

describe("familyMembers（028 まさゆきさん決定）", () => {
  it.each([
    [1, 0, ["mother"]],
    [1, 2, ["boy", "girl", "mother"]],
    [2, 0, ["father", "mother"]],
    [2, 1, ["father", "boy", "mother"]],
    [2, 2, ["father", "boy", "girl", "mother"]],
  ] as const)("大人%i人・子ども%i人 → %j", (adults, children, expected) => {
    expect(familyMembers({ adults, children })).toEqual(expected);
  });

  it("範囲の外の人数でも、絵に出せる4人までにする", () => {
    expect(familyMembers({ adults: 2, children: 5 })).toEqual(["father", "boy", "girl", "mother"]);
  });
});

describe("placeFamily", () => {
  const members = familyMembers({ adults: 2, children: 2 });

  it("左から順に並び、全員が背景の中に収まる", () => {
    for (const background of ["erabu-kamisato-base", "erabu-iida-overview"] as const) {
      const placements = placeFamily(members, background);
      const centers = placements.map(({ centerX }) => centerX);
      expect(centers).toEqual([...centers].sort((a, b) => a - b));
      expect(Math.min(...centers)).toBeGreaterThan(0);
      expect(Math.max(...centers)).toBeLessThan(100);
    }
  });

  it("家族は真ん中にまとまり、子どもは大人より背が低い", () => {
    const placements = placeFamily(members, "erabu-kamisato-base");
    const middle = (placements[0].centerX + placements.at(-1)!.centerX) / 2;
    expect(middle).toBeCloseTo(50, 0);
    const height = (index: number) => placements[index].heightPercent("stand");
    expect(height(1)).toBeLessThan(height(0));
    expect(height(2)).toBeLessThan(height(3));
  });
});

describe("絵の一覧", () => {
  it("人物の全員・全ポーズに、切り出し元と書き出した大きさがある", () => {
    for (const person of PEOPLE) {
      for (const pose of POSES) {
        const id = spriteId(person, pose);
        expect(SPRITE_SOURCES[id]).toBeDefined();
        expect(SPRITE_SIZES[id].width).toBeGreaterThan(0);
      }
    }
  });

  it("背景がまだない地区は、飯田市全体の絵を使う", () => {
    expect(erabuBaseFor("kamisato")).toBe(ERABU_BASES.kamisato);
    expect(erabuBaseFor("kanae")).toBe("erabu-iida-overview");
    expect(erabuBaseFor(null)).toBe("erabu-iida-overview");
  });

  it("4地区の札は、どれも絵の中にある", () => {
    for (const { id } of DISTRICTS) {
      const { x, y } = DISTRICT_LABEL_POSITIONS[id];
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(100);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(100);
    }
  });
});
