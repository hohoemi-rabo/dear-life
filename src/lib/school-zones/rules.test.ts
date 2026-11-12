import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createTownResolver } from "../town-district/resolve.ts";
import {
  assignCityDistricts,
  buildSchoolZonesCsv,
  buildSchoolZonesSql,
  parseEnforcementLabel,
  parseSchoolZoneTable,
  parseSchoolZonesCsv,
  toTownSchoolZones,
} from "./rules.ts";

const ROOT = join(import.meta.dirname, "../../..");

const td = (text: string, rowspan?: number) => `<td${rowspan ? ` rowspan="${rowspan}"` : ""} width="22%"><p class="p"><span class="cm">${text}</span></p></td>`;
const tr = (...cells: string[]) => `<tr>${cells.join("")}</tr>`;
// 例規集のページの形（別表の見出し → fixed-colspec の行 → 見出しの行 → 本文の行）
const page = (...rows: string[]) =>
  `<title>規則</title><p>(令和6年11月1日施行)</p><span class="num cm">別表</span><table><thead><tr class="fixed-colspec"><td></td><td></td><td></td></tr></thead>` +
  tr(td("通学区域"), td("小学校名"), td("中学校名")) +
  rows.join("") +
  "</table>";

const SAMPLE = page(
  tr(td("大門町、桜町1丁目"), td("飯田市立浜井場小学校"), td("飯田市立飯田東中学校", 3)),
  tr(td("吾妻町"), td("飯田市立浜井場小学校又は飯田市立丸山小学校")),
  tr(td("宮ノ上、上飯田の一部"), td("飯田市立丸山小学校")),
  tr(td("本町1丁目、上飯田の一部"), td("飯田市立追手町小学校"), td("飯田市立飯田東中学校")),
  tr(td("鼎下山、鼎中平"), td("飯田市立鼎小学校"), td("飯田市立鼎中学校")),
);

describe("parseSchoolZoneTable（039）", () => {
  it("中学校の欄の縦のつながりを引き継ぎ、「又は」で学校を分け、「飯田市立」を外す", () => {
    expect(parseSchoolZoneTable(SAMPLE)).toEqual([
      { towns: ["大門町", "桜町1丁目"], elementarySchools: ["浜井場小学校"], juniorHighSchools: ["飯田東中学校"] },
      { towns: ["吾妻町"], elementarySchools: ["浜井場小学校", "丸山小学校"], juniorHighSchools: ["飯田東中学校"] },
      { towns: ["宮ノ上", "上飯田の一部"], elementarySchools: ["丸山小学校"], juniorHighSchools: ["飯田東中学校"] },
      { towns: ["本町1丁目", "上飯田の一部"], elementarySchools: ["追手町小学校"], juniorHighSchools: ["飯田東中学校"] },
      { towns: ["鼎下山", "鼎中平"], elementarySchools: ["鼎小学校"], juniorHighSchools: ["鼎中学校"] },
    ]);
  });

  it("表の形が変わったら止める", () => {
    expect(() => parseSchoolZoneTable("<p>別表なし</p>")).toThrow("別表が見つからない");
    expect(() => parseSchoolZoneTable(page(tr(td("鼎"), td("飯田市立鼎小学校"))))).toThrow("欄が足りない");
    expect(() => parseSchoolZoneTable(page(tr(td("鼎"), td("飯田市立鼎中学校"), td("飯田市立鼎中学校"))))).toThrow("小学校の欄が読めない");
  });

  it("施行日を読む", () => {
    expect(parseEnforcementLabel(SAMPLE)).toBe("令和6年11月1日施行");
    expect(() => parseEnforcementLabel("<p>なし</p>")).toThrow("施行");
  });
});

describe("toTownSchoolZones（039）", () => {
  it("町名ごとの1行にし、「の一部」の町は行をまたいで学校をまとめる", () => {
    const zones = toTownSchoolZones(parseSchoolZoneTable(SAMPLE));
    expect(zones.map((zone) => zone.townName)).toEqual(["大門町", "桜町1丁目", "吾妻町", "宮ノ上", "上飯田", "本町1丁目", "鼎下山", "鼎中平"]);
    expect(zones.find((zone) => zone.townName === "上飯田")).toEqual({
      townName: "上飯田",
      elementarySchools: ["丸山小学校", "追手町小学校"],
      juniorHighSchools: ["飯田東中学校"],
      isPartial: true,
    });
    expect(zones.find((zone) => zone.townName === "吾妻町")?.isPartial).toBe(false);
  });

  it("「の一部」なしで同じ町が2回出たら止める", () => {
    const twice = [
      { towns: ["鼎"], elementarySchools: ["鼎小学校"], juniorHighSchools: ["鼎中学校"] },
      { towns: ["鼎"], elementarySchools: ["鼎小学校"], juniorHighSchools: ["鼎中学校"] },
    ];
    expect(() => toTownSchoolZones(twice)).toThrow("2回出る");
  });
});

describe("assignCityDistricts と CSV・SQL（039）", () => {
  const resolve = createTownResolver([
    { townName: "鼎", cityDistrict: "鼎", districtId: "kanae" },
    { townName: "大門町", cityDistrict: "中心市街地", districtId: "chushin" },
    { townName: "松尾", cityDistrict: "松尾", districtId: null },
  ]);
  const zones = [
    { townName: "鼎中平", elementarySchools: ["鼎小学校"], juniorHighSchools: ["鼎中学校"], isPartial: false },
    { townName: "大門町", elementarySchools: ["浜井場小学校", "丸山小学校"], juniorHighSchools: ["飯田東中学校"], isPartial: true },
    { townName: "松尾代田", elementarySchools: ["松尾小学校"], juniorHighSchools: ["緑ケ丘中学校"], isPartial: false },
    { townName: "南常盤町", elementarySchools: ["追手町小学校"], juniorHighSchools: ["飯田東中学校"], isPartial: false },
  ];

  it("対応表で地区を付け、ない町名は返す", () => {
    const result = assignCityDistricts(zones, resolve);
    expect(result.unmappedTowns).toEqual(["南常盤町"]);
    expect(result.zones.map((zone) => zone.cityDistrict)).toEqual(["鼎", "中心市街地", "松尾"]);
  });

  it("CSV に書いて読み戻すと同じになり、SQL は4地区の外の町の district_id を null にする", () => {
    const assigned = assignCityDistricts(zones, resolve).zones;
    expect(parseSchoolZonesCsv(buildSchoolZonesCsv(assigned))).toEqual(assigned);
    const sql = buildSchoolZonesSql(assigned, "令和6年11月1日施行", "2026-11-12");
    expect(sql).toContain("('大門町', '中心市街地', 'chushin', '浜井場小学校|丸山小学校', '飯田東中学校', true, 2)");
    expect(sql).toContain("('松尾代田', '松尾', null,");
    expect(sql).toContain("period_label = '令和6年11月1日施行'");
  });
});

describe("リポジトリのデータ（039）", () => {
  const zones = parseSchoolZonesCsv(readFileSync(join(ROOT, "data/school_zones.csv"), "utf8"));
  const schoolsOf = (district: string) => new Set(zones.filter((zone) => zone.cityDistrict === district).flatMap((zone) => [...zone.elementarySchools, ...zone.juniorHighSchools]));

  it("上郷・鼎・伊賀良はどの町も同じ2校", () => {
    expect(schoolsOf("上郷")).toEqual(new Set(["上郷小学校", "高陵中学校"]));
    expect(schoolsOf("鼎")).toEqual(new Set(["鼎小学校", "鼎中学校"]));
    expect(schoolsOf("伊賀良")).toEqual(new Set(["伊賀良小学校", "旭ケ丘中学校"]));
  });

  it("中心市街地は八幡町・育良町を除くと5校", () => {
    const edge = ["八幡町", "育良町"];
    const main = new Set(
      zones.filter((zone) => zone.cityDistrict === "中心市街地" && !edge.some((town) => zone.townName.startsWith(town))).flatMap((zone) => [...zone.elementarySchools, ...zone.juniorHighSchools]),
    );
    expect(main).toEqual(new Set(["浜井場小学校", "追手町小学校", "丸山小学校", "飯田東中学校", "飯田西中学校"]));
  });
});
