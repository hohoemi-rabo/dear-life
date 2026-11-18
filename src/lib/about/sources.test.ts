import { describe, expect, it } from "vitest";
import { eventSourceRanges, SOURCE_USES } from "./sources";

describe("eventSourceRanges（022）", () => {
  it("同じ資料で確認日だけちがう行は、確認日の幅の1行にまとめる。資料は最初に出てくる順", () => {
    expect(
      eventSourceRanges([
        { note: "公民館活動", checkedOn: "2026-11-05" },
        { note: "地区のだより", checkedOn: "2026-10-30" },
        { note: "公民館活動", checkedOn: "2026-10-26" },
        { note: "公民館活動", checkedOn: "2026-10-28" },
      ]),
    ).toEqual([
      { note: "公民館活動", range: { from: "2026-10-26", to: "2026-11-05" } },
      { note: "地区のだより", range: { from: "2026-10-30", to: "2026-10-30" } },
    ]);
  });
});

describe("SOURCE_USES（022）", () => {
  it("いまの街との3つの出典にも使い道がある（041 で足し忘れていた）", () => {
    const uses = new Map(SOURCE_USES);
    expect(uses.get("jma_climate_normals")).toBe("いまの街とくらべる雨・風・雪（防災カルテの雨と風も）");
    expect(uses.get("mlit_flood_statistics")).toBe("いまの街とくらべる水害の被害");
    expect(uses.get("estat_census_basic")).toBe("いまの街とくらべる人口密度と子どもの割合");
  });
});
