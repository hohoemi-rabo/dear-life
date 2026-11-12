import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Facility, TownSchoolZone } from "../data/screen-data.ts";
import { parseSchoolZonesCsv } from "../school-zones/rules.ts";
import { mergeTownNames, summarizeSchoolZones } from "./school-zones.ts";

const ROOT = join(import.meta.dirname, "../../..");
const school = (name: string): Facility => ({ name, subkind: "小学校", address: null });

// リポジトリの別表（data/school_zones.csv）の地区の町
function zonesOf(district: string): TownSchoolZone[] {
  return parseSchoolZonesCsv(readFileSync(join(ROOT, "data/school_zones.csv"), "utf8"))
    .filter((zone) => zone.cityDistrict === district)
    .map(({ townName, elementarySchools, juniorHighSchools, isPartial }) => ({ townName, elementarySchools, juniorHighSchools, isPartial }));
}

describe("mergeTownNames（039）", () => {
  it("丁目をまとめる。3つ以上続けば「〜」、2つかとびとびなら「・」。丁目のない町はそのまま", () => {
    expect(mergeTownNames(["江戸町1丁目", "江戸町2丁目", "江戸町3丁目", "江戸町4丁目"])).toEqual(["江戸町1〜4丁目"]);
    expect(mergeTownNames(["大門町", "桜町1丁目", "桜町2丁目", "仲ノ町1丁目", "仲ノ町"])).toEqual(["大門町", "桜町1・2丁目", "仲ノ町1丁目", "仲ノ町"]);
    expect(mergeTownNames(["本町1丁目", "通り町3丁目大横", "本町3丁目"])).toEqual(["本町1・3丁目", "通り町3丁目大横"]);
  });
});

describe("summarizeSchoolZones（039）", () => {
  it("上郷はどの町も同じ2校", () => {
    const summary = summarizeSchoolZones(zonesOf("上郷"), [school("上郷小学校"), school("高陵中学校"), school("飯田高等学校")]);
    expect(summary).toMatchObject({ elementarySchools: ["上郷小学校"], juniorHighSchools: ["高陵中学校"], uniform: true, edgeGroups: [] });
    expect(summary.groups[0].towns).toEqual(["上郷黒田", "上郷飯沼", "上郷別府"]);
  });

  it("学校の名前の「ヶ」と「ケ」の違いで、地区の学校を端の町の学校と取り違えない（伊賀良）", () => {
    const summary = summarizeSchoolZones(zonesOf("伊賀良"), [school("伊賀良小学校"), school("旭ヶ丘中学校")]);
    expect(summary).toMatchObject({ juniorHighSchools: ["旭ケ丘中学校"], uniform: true, edgeGroups: [] });
  });

  it("中心市街地は5校で、町の組み合わせごとに分かれる。八幡町・育良町は端の町として分ける", () => {
    const inside = ["丸山小学校", "浜井場小学校", "追手町小学校", "飯田東中学校", "飯田西中学校"].map(school);
    const summary = summarizeSchoolZones(zonesOf("中心市街地"), inside);
    expect(summary.elementarySchools).toEqual(["浜井場小学校", "丸山小学校", "追手町小学校"]);
    expect(summary.juniorHighSchools).toEqual(["飯田東中学校", "飯田西中学校"]);
    expect(summary.uniform).toBe(false);
    expect(summary.edgeGroups).toEqual([
      { elementarySchools: ["松尾小学校"], juniorHighSchools: ["緑ケ丘中学校"], kind: "single", towns: ["八幡町"] },
      { elementarySchools: ["伊賀良小学校"], juniorHighSchools: ["旭ケ丘中学校"], kind: "single", towns: ["育良町1〜3丁目"] },
    ]);
    expect(summary.groups.find((group) => group.towns.includes("上飯田"))).toMatchObject({ kind: "partial", elementarySchools: ["丸山小学校", "追手町小学校"] });
    expect(summary.groups.find((group) => group.towns.includes("吾妻町"))).toMatchObject({
      kind: "choice",
      towns: ["吾妻町", "鈴加町1・2丁目", "錦町1・2丁目"],
    });
    // すべての町がどこかの組み合わせに入る
    const count = (groups: typeof summary.groups) => groups.reduce((sum, group) => sum + group.towns.length, 0);
    expect(count(summary.groups) + count(summary.edgeGroups)).toBeGreaterThan(0);
  });

  it("地区の学校の一覧がデータ未取得なら、端の町を分けずにすべての学校を数える", () => {
    const summary = summarizeSchoolZones(zonesOf("中心市街地"), null);
    expect(summary.edgeGroups).toEqual([]);
    expect(summary.elementarySchools).toHaveLength(5);
  });
});
