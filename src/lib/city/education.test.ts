import { describe, expect, it } from "vitest";
import { createTownResolver } from "../town-district/resolve";
import { buildEducationSql, buildSchoolRows } from "./education";

const resolveTown = createTownResolver([
  { townName: "小伝馬町", cityDistrict: "中心市街地", districtId: "chushin" },
  { townName: "松尾", cityDistrict: "松尾", districtId: null },
]);

const HEADER =
  "教育機関_学校コード,教育機関_学校種,教育機関_設置区分,教育機関_本分校,教育機関_学校名,教育機関_学校所在地（市区町村）,教育機関_学校所在地（町字）,教育機関_学校所在地（番地以下）,教育機関_緯度,教育機関_経度,教育機関_属性情報廃止年月日";
const line = (cells: Record<string, string>) => {
  const base: Record<string, string> = {
    教育機関_学校コード: "B120220500037",
    教育機関_学校種: "B1",
    教育機関_設置区分: "2",
    教育機関_本分校: "1",
    教育機関_学校名: "浜井場小学校",
    "教育機関_学校所在地（市区町村）": "飯田市",
    "教育機関_学校所在地（町字）": "小伝馬町一丁目",
    "教育機関_学校所在地（番地以下）": "3503",
    教育機関_緯度: "35.519039",
    教育機関_経度: "137.83164",
    教育機関_属性情報廃止年月日: "",
    ...cells,
  };
  return HEADER.split(",").map((key) => base[key]).join(",");
};
const csv = (...lines: string[]) => [HEADER, ...lines].join("\r\n");

describe("buildSchoolRows", () => {
  it("学校を地区に振り分ける。4地区の外は地区なしで入れる", () => {
    const { rows } = buildSchoolRows(
      csv(line({}), line({ 教育機関_学校コード: "F220310105883", 教育機関_学校種: "F2", 教育機関_設置区分: "3", 教育機関_学校名: "飯田短期大学", "教育機関_学校所在地（町字）": "松尾代田", "教育機関_学校所在地（番地以下）": "610" })),
      resolveTown,
    );
    expect(rows).toEqual([
      {
        subkind: "小学校",
        name: "浜井場小学校",
        address: "長野県飯田市小伝馬町一丁目3503",
        townName: "小伝馬町",
        districtId: "chushin",
        lat: 35.519039,
        lon: 137.83164,
        sourceKey: "B120220500037",
        attributes: { school_code: "B120220500037", school_type_code: "B1", establishment: "公立" },
      },
      expect.objectContaining({ subkind: "短期大学", districtId: null, townName: "松尾代田", attributes: expect.objectContaining({ establishment: "私立" }) }),
    ]);
  });

  it("幼保連携型認定こども園は子育て施設に入っているので入れない。廃止された学校も入れない", () => {
    const result = buildSchoolRows(
      csv(line({ 教育機関_学校種: "A2", 教育機関_学校名: "認定こども園慈光幼稚園" }), line({ 教育機関_学校名: "閉校小学校", 教育機関_属性情報廃止年月日: "2025-03-31" })),
      resolveTown,
    );
    expect(result.rows).toEqual([]);
    expect(result.abolished).toEqual(["閉校小学校"]);
  });

  it("対応表にない町名は集めて返す。知らない学校種があれば止める", () => {
    expect(buildSchoolRows(csv(line({ "教育機関_学校所在地（町字）": "馬場町三丁目" })), resolveTown).unmappedTowns).toEqual(["馬場町"]);
    expect(() => buildSchoolRows(csv(line({ 教育機関_学校種: "Z9" })), resolveTown)).toThrow(/学校種（Z9）がわからない/);
  });
});

describe("buildEducationSql", () => {
  it("学校と出典を入れ直す SQL を作る。0件なら作らない", () => {
    const { rows } = buildSchoolRows(csv(line({})), resolveTown);
    const sql = buildEducationSql({ rows, csvUrl: "https://www.city.iida.lg.jp/uploaded/attachment/72005.csv", updatedOn: null, usedOn: "2026-10-24" });
    expect(sql).toContain("period_label = '更新日の記載なし'");
    expect(sql).toContain("delete from public.facilities where source_id = 'iida_education';");
    expect(sql).toContain("'school'::public.facility_kind, '小学校', '浜井場小学校'");
    expect(() => buildEducationSql({ rows: [], csvUrl: "x", updatedOn: null, usedOn: "2026-10-24" })).toThrow(/0件/);
  });
});
