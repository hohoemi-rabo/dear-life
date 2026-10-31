import { describe, expect, it } from "vitest";
import { DISTRICTS } from "../conditions/labels";
import { ERABU_BASES, PEOPLE, POSES, PROP_SOURCES, SPRITE_SOURCES, erabuBaseFor, eventIllustFor, spriteId } from "./assets";
import { DISTRICT_LABEL_POSITIONS } from "./districts";
import { familyMembers, hiddenChildren, placeFamily } from "./family";
import { placeCars } from "./car";
import { placeHouse } from "./house";
import { placePriorityMarks } from "./priorities";
import { SPRITE_SIZES } from "./sprites";

describe("familyMembers（028 まさゆきさん決定）", () => {
  it.each([
    [1, 0, ["mother"]],
    [1, 2, ["boy", "girl", "mother"]],
    [2, 0, ["father", "mother"]],
    [2, 1, ["father", "boy", "mother"]],
    [2, 2, ["father", "boy", "girl", "mother"]],
    [2, 3, ["father", "boy", "girl", "boy2", "mother"]],
    [2, 4, ["father", "boy", "girl", "boy2", "girl2", "mother"]],
    [1, 4, ["boy", "girl", "boy2", "girl2", "mother"]],
  ] as const)("大人%i人・子ども%i人 → %j", (adults, children, expected) => {
    expect(familyMembers({ adults, children, parent: "mother" })).toEqual(expected);
  });

  it("大人1人でお父さんを選んだときは、お父さん・子ども… の順にする", () => {
    expect(familyMembers({ adults: 1, children: 2, parent: "father" })).toEqual(["father", "boy", "girl"]);
    expect(familyMembers({ adults: 1, children: 0, parent: "father" })).toEqual(["father"]);
  });

  it("大人2人のときは、どちらを選んでいてもお父さんとお母さん", () => {
    expect(familyMembers({ adults: 2, children: 1, parent: "father" })).toEqual(["father", "boy", "mother"]);
  });

  it("5人目からの子どもは絵に出さず、その人数を数える", () => {
    expect([0, 4, 5, 8].map((children) => hiddenChildren({ children }))).toEqual([0, 0, 1, 4]);
  });

  it("5人以上でも、絵に出すのは子ども4人までにする", () => {
    expect(familyMembers({ adults: 2, children: 5, parent: "mother" })).toEqual(["father", "boy", "girl", "boy2", "girl2", "mother"]);
  });
});

describe("placeFamily", () => {
  it("5人目からは家族全体を少し小さくし、6人でも横幅は4人のときの1.3倍までに収める", () => {
    const span = (children: number) => {
      const placements = placeFamily(familyMembers({ adults: 2, children, parent: "mother" }), "erabu-kamisato-base");
      return placements.at(-1)!.centerX - placements[0].centerX;
    };
    const height = (children: number) => placeFamily(familyMembers({ adults: 2, children, parent: "mother" }), "erabu-kamisato-base")[0].heightPercent("stand");
    expect(span(4)).toBeLessThan(span(2) * 1.3);
    expect(height(3)).toBeLessThan(height(2));
    expect(height(4)).toBeLessThan(height(3));
  });

  const members = familyMembers({ adults: 2, children: 2, parent: "mother" });

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

  it("背景がまだない地区は、飯田市全体の絵を使う。05 は 05 の背景があればそれを使う", () => {
    expect(erabuBaseFor("kamisato")).toBe(ERABU_BASES.kamisato?.base);
    expect(erabuBaseFor("kamisato", "priorities")).toBe("erabu-kamisato-priorities");
    expect(erabuBaseFor("kanae", "priorities")).toBe("erabu-iida-overview");
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

describe("placeHouse（028 見本の 03）", () => {
  it("どの家も背景の中に収まり、家族より奥（足もとより上）に建つ", () => {
    for (const background of ["erabu-kamisato-base", "erabu-iida-overview"] as const) {
      const familyFoot = placeFamily(familyMembers({ adults: 2, children: 2, parent: "mother" }), background)[0].footY;
      for (const housing of ["new", "old", "rent"] as const) {
        const { centerX, footY, width, height } = placeHouse(housing, background);
        expect(centerX - width / 2).toBeGreaterThan(0);
        expect(centerX + width / 2).toBeLessThan(100);
        expect(footY - height).toBeGreaterThan(0);
        expect(footY).toBeLessThan(familyFoot);
      }
    }
  });
});

describe("placeCars（028 見本の 04）", () => {
  it("0台・未選択は車を置かない。1台は白、2台以上は白と青を横に並べる", () => {
    expect(placeCars(0, "erabu-kamisato-base")).toEqual([]);
    expect(placeCars(null, "erabu-kamisato-base")).toEqual([]);
    expect(placeCars(1, "erabu-kamisato-base").map(({ prop }) => prop)).toEqual(["car-white"]);
    expect(placeCars(2, "erabu-kamisato-base").map(({ prop }) => prop)).toEqual(["car-white", "car-blue"]);
  });

  it("車は背景の中に収まり、家族の右・少し奥に、白・青の順で横に並ぶ（車どうしの重なりは少しだけ）", () => {
    for (const background of ["erabu-kamisato-base", "erabu-iida-overview"] as const) {
      const family = placeFamily(familyMembers({ adults: 2, children: 2, parent: "mother" }), background);
      const [white, blue] = placeCars(2, background);
      expect(white.centerX).toBeLessThan(blue.centerX);
      expect(white.centerX + white.width / 2 - (blue.centerX - blue.width / 2)).toBeLessThan(white.width * 0.25);
      expect(white.footY).toBe(blue.footY);
      // 家族は白い車の端に重なってもよいが、車の真ん中より右には出ない（全部は隠さない）
      expect(white.centerX).toBeGreaterThan(family.at(-1)!.centerX);
      for (const { centerX, footY, width, height } of [white, blue]) {
        expect(centerX + width / 2).toBeLessThan(100);
        expect(footY - height).toBeGreaterThan(0);
        expect(footY).toBeLessThan(family[0].footY);
      }
    }
  });
});

describe("05 の背景（2026-10-29 まさゆきさん）", () => {
  const background = "erabu-kamisato-priorities";

  it("見本どおり、家と車は家族の左に収まる（家族は広場のいちばん奥に立つ。2026-10-30 まさゆきさん）", () => {
    const family = placeFamily(familyMembers({ adults: 2, children: 2, parent: "mother" }), background);
    for (const housing of ["new", "old", "rent"] as const) {
      const { centerX, footY, height } = placeHouse(housing, background);
      expect(centerX).toBeLessThan(family[0].centerX);
      expect(footY - height).toBeGreaterThan(0);
      expect(footY).toBeLessThan(100);
    }
    for (const car of [1, 2] as const) {
      for (const { centerX, width, footY } of placeCars(car, background)) {
        expect(centerX - width / 2).toBeGreaterThan(0);
        expect(centerX + width / 2).toBeLessThan(family[0].centerX);
        expect(footY).toBeLessThan(100);
      }
    }
  });
});

describe("placePriorityMarks（028 見本の 05）", () => {
  it("選んだものだけを、カルテの並びで、背景の中に置く", () => {
    for (const background of ["erabu-kamisato-priorities", "erabu-kamisato-base", "erabu-iida-overview"] as const) {
      const marks = placePriorityMarks(["population", "housing", "childcare", "transport", "disaster"], "old", background);
      expect(marks.map(({ priority }) => priority)).toEqual(["housing", "childcare", "transport", "disaster", "population"]);
      for (const { x, y } of marks) {
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(100);
        expect(y).toBeGreaterThan(0);
        expect(y).toBeLessThan(100);
      }
    }
    expect(placePriorityMarks([], "new", "erabu-kamisato-priorities")).toEqual([]);
  });

  it("住まいの印は、プレビューに建てた家の上に付く", () => {
    const house = placeHouse("rent", "erabu-kamisato-priorities");
    const [mark] = placePriorityMarks(["housing"], "rent", "erabu-kamisato-priorities");
    expect(mark.x).toBe(house.centerX);
    expect(mark.y).toBeGreaterThan(house.footY - house.height);
    expect(mark.y).toBeLessThan(house.footY);
  });
});

describe("行事ごとの絵（2026-10-31）", () => {
  it("名前で引き、絵のない行事は null（種類ごとのドット絵で出す）", () => {
    expect(eventIllustFor("上郷歩こう会")).toBe("event-kamisato-aruko");
    expect(PROP_SOURCES[eventIllustFor("黒田人形奉納上演")!].source).toBe("event-kuroda-ningyo.png");
    expect(eventIllustFor("鼎地区運動会")).toBeNull();
    expect(eventIllustFor("constructor")).toBeNull();
  });
});
