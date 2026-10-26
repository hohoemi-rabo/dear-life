import { describe, expect, it } from "vitest";
import { DEFAULT_CONDITIONS, type Conditions } from "./model";
import {
  planScene,
  sceneConditionOf,
  selectSceneSentences,
  selectSceneTemplate,
  type SceneCondition,
  type Season,
} from "./scene";

const conditions = (overrides: Partial<Conditions> = {}): Conditions => ({
  ...DEFAULT_CONDITIONS,
  district: "kamisato",
  ...overrides,
});

// 要件 4章の表の「くらしの場面」の列を1行ずつ確かめる
describe("planScene", () => {
  it("春：子ども1人以上は入園・入学、0人は地区の公共施設", () => {
    expect(planScene("春", conditions({ children: 1 })).axis).toBe("spring-school");
    expect(planScene("春", conditions({ children: 0 })).axis).toBe("spring-public-facility");
  });

  it("夏：条件にかかわらず大雨と避難", () => {
    expect(planScene("夏", conditions({ children: 0, car: 0, housing: "old" })).axis).toBe("summer-evacuation");
  });

  it("秋：地区の行事。子ども1人以上のときだけ子ども向けの行事を優先する", () => {
    expect(planScene("秋", conditions({ children: 2 }))).toMatchObject({ axis: "autumn-events", preferChildEvents: true });
    expect(planScene("秋", conditions({ children: 0 }))).toMatchObject({ axis: "autumn-events", preferChildEvents: false });
    expect(planScene("春", conditions({ children: 2 })).preferChildEvents).toBe(false);
  });

  it("冬：車0台は公共交通で出かけ、1台以上・未選択は車で出かける", () => {
    expect(planScene("冬", conditions({ car: 0 })).axis).toBe("winter-transit");
    expect(planScene("冬", conditions({ car: 1 })).axis).toBe("winter-car");
    expect(planScene("冬", conditions({ car: 2 })).axis).toBe("winter-car");
    expect(planScene("冬", conditions({ car: null })).axis).toBe("winter-car");
  });

  it("冬・買う・古めのときだけ、古い家の寒さの一文を入れてよい", () => {
    expect(planScene("冬", conditions({ housing: "old" })).oldHouseCold).toBe(true);
    expect(planScene("冬", conditions({ housing: "new" })).oldHouseCold).toBe(false);
    expect(planScene("冬", conditions({ housing: "rent" })).oldHouseCold).toBe(false);
    expect(planScene("秋", conditions({ housing: "old" })).oldHouseCold).toBe(false);
  });

  it("大切にしたいことでは場面を変えない", () => {
    for (const season of ["春", "夏", "秋", "冬"] as const) {
      expect(planScene(season, conditions({ priorities: ["transport", "disaster"] }))).toEqual(
        planScene(season, conditions()),
      );
    }
  });
});

describe("sceneConditionOf", () => {
  it("車の未選択は「車あり・未選択」、家は Supabase の名前にする", () => {
    expect(sceneConditionOf(conditions({ children: 0, car: null, housing: "old" }))).toEqual({
      has_children: false,
      car: "車あり・未選択",
      housing: "買う・古め",
    });
    expect(sceneConditionOf(conditions({ car: 0 })).car).toBe("車なし");
  });
});

type Template = SceneCondition & { season: Season; title: string };
const template = (season: Season, title: string, condition: Partial<SceneCondition> = {}): Template => ({
  season,
  title,
  has_children: null,
  car: null,
  housing: null,
  ...condition,
});

describe("selectSceneTemplate", () => {
  const templates = [
    template("春", "春・子どもあり", { has_children: true }),
    template("春", "春・子どもなし", { has_children: false }),
    template("夏", "夏"),
    template("冬", "冬・車なし", { car: "車なし" }),
    template("冬", "冬・車あり", { car: "車あり・未選択" }),
    template("冬", "冬・車あり・古め", { car: "車あり・未選択", housing: "買う・古め" }),
  ];

  it("季節と条件に合うひな形を選ぶ", () => {
    expect(selectSceneTemplate(templates, "春", conditions({ children: 0 }))?.title).toBe("春・子どもなし");
    expect(selectSceneTemplate(templates, "夏", conditions())?.title).toBe("夏");
    expect(selectSceneTemplate(templates, "冬", conditions({ car: 0, housing: "old" }))?.title).toBe("冬・車なし");
  });

  it("合うものが複数あれば、条件がいちばん細かいものを選ぶ", () => {
    expect(selectSceneTemplate(templates, "冬", conditions({ housing: "old" }))?.title).toBe("冬・車あり・古め");
    expect(selectSceneTemplate(templates, "冬", conditions({ housing: "new" }))?.title).toBe("冬・車あり");
  });

  it("合うひな形がなければ null（まだ公開していない季節など）", () => {
    expect(selectSceneTemplate(templates, "秋", conditions())).toBeNull();
  });

  it("同じ細かさで2つ合うときは、どちらを出すか決められないのでエラーにする", () => {
    const ambiguous = [template("秋", "秋・子どもあり", { has_children: true }), template("秋", "秋・車なし", { car: "車なし" })];
    expect(() => selectSceneTemplate(ambiguous, "秋", conditions({ children: 1, car: 0 }))).toThrow(/1つに決まりません/);
  });
});

describe("selectSceneSentences", () => {
  const sentence = (position: number, condition: Partial<SceneCondition> = {}) => ({
    position,
    has_children: null,
    car: null,
    housing: null,
    ...condition,
  });

  it("文ごとの条件に合う文だけを、並び順どおりに返す", () => {
    const sentences = [sentence(3), sentence(2, { housing: "買う・古め" }), sentence(1)];
    expect(selectSceneSentences(sentences, conditions({ housing: "old" })).map((s) => s.position)).toEqual([1, 2, 3]);
    expect(selectSceneSentences(sentences, conditions({ housing: "new" })).map((s) => s.position)).toEqual([1, 3]);
  });
});
