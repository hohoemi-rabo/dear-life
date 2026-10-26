import { describe, expect, it } from "vitest";
import { createTownResolver } from "../town-district/resolve";
import { buildEvacuationCreditText, buildEvacuationRows, buildEvacuationSql } from "./evacuation";

const resolveTown = createTownResolver([
  { townName: "小伝馬町", cityDistrict: "中心市街地", districtId: "chushin" },
  { townName: "知久町", cityDistrict: "中心市街地", districtId: "chushin" },
  { townName: "鼎切石", cityDistrict: "鼎", districtId: "kanae" },
  { townName: "座光寺", cityDistrict: "座光寺", districtId: null },
]);
const noTowns = new Map<string, { townName: string }>();

const HEADER =
  "全国地方公共団体コード,ID,名称,所在地_全国地方公共団体コード,所在地_連結表記,所在地_町字,所在地_番地以下,緯度,経度,災害種別_洪水,災害種別_崖崩れ、土石流及び地滑り,災害種別_高潮,災害種別_地震,災害種別_津波,災害種別_大規模な火事,災害種別_内水氾濫,災害種別_火山現象,指定避難所との重複,想定収容人数";
const line = (cells: Record<string, string>) => {
  const base: Record<string, string> = {
    全国地方公共団体コード: "202053",
    ID: "CC2020530001",
    名称: "浜井場小学校体育館",
    所在地_全国地方公共団体コード: "202053",
    所在地_連結表記: "長野県飯田市小伝馬町一丁目3503",
    所在地_町字: "小伝馬町一丁目",
    所在地_番地以下: "3503",
    緯度: "35.51912",
    経度: "137.83163",
    災害種別_洪水: "1",
    "災害種別_崖崩れ、土石流及び地滑り": "1",
    災害種別_高潮: "",
    災害種別_地震: "1",
    災害種別_津波: "",
    災害種別_大規模な火事: "",
    災害種別_内水氾濫: "",
    災害種別_火山現象: "",
    指定避難所との重複: "1",
    想定収容人数: "200人（4平方メートルあたり1人）",
    ...cells,
  };
  return HEADER.split(",").map((key) => base[key]).join(",");
};
const csv = (...lines: string[]) => [HEADER, ...lines].join("\r\n");

describe("buildEvacuationRows", () => {
  it("避難場所を地区に振り分け、災害の種類・指定避難所を兼ねるか・収容人数を読む。4地区の外は地区なしで入れ、中身のない行は飛ばす", () => {
    const result = buildEvacuationRows(
      csv(
        line({}),
        line({ ID: "CC2020530002", 名称: "座光寺小学校", 所在地_町字: "座光寺", 所在地_連結表記: "長野県飯田市座光寺3500", 指定避難所との重複: "", 想定収容人数: "60人" }),
        ",".repeat(18),
      ),
      resolveTown,
      noTowns,
    );
    expect(result).toMatchObject({ skipped: 1, unmappedTowns: [], missingCoordinates: [] });
    expect(result.rows).toEqual([
      {
        kind: "evacuation_site",
        subkind: "指定緊急避難場所",
        name: "浜井場小学校体育館",
        address: "長野県飯田市小伝馬町一丁目3503",
        townName: "小伝馬町",
        districtId: "chushin",
        lat: 35.51912,
        lon: 137.83163,
        sourceKey: "CC2020530001",
        attributes: {
          ids: ["CC2020530001"],
          hazards: ["flood", "landslide", "earthquake"],
          also_shelter: true,
          capacity: 200,
          capacity_note: "4平方メートルあたり1人",
        },
      },
      expect.objectContaining({ name: "座光寺小学校", districtId: null, attributes: expect.objectContaining({ also_shelter: false, capacity: 60 }) }),
    ]);
    expect(result.rows[1].attributes).not.toHaveProperty("capacity_note");
  });

  it("同じ名前・同じ場所が別の ID で2回載っていたら1か所にまとめる", () => {
    const { rows } = buildEvacuationRows(csv(line({}), line({ ID: "CC2020530065" })), resolveTown, noTowns);
    expect(rows).toHaveLength(1);
    expect(rows[0].attributes.ids).toEqual(["CC2020530001", "CC2020530065"]);
  });

  it("緯度経度のない避難場所は、位置を空にして入れる（地図には出さず一覧にだけ出す）", () => {
    const { rows } = buildEvacuationRows(
      csv(line({ 名称: "風越公園（妙琴）", 所在地_町字: "鼎切石", 緯度: "", 経度: "" })),
      resolveTown,
      noTowns,
    );
    expect(rows[0]).toMatchObject({ districtId: "kanae", lat: null, lon: null });
  });

  it("町字が空の行は、緯度経度から引いた町名で振り分ける。まだ引いていない位置は返す", () => {
    const record = line({ 名称: "並木通り", 所在地_町字: "", 所在地_連結表記: "長野県飯田市", 緯度: "35.51477", 経度: "137.82478" });
    expect(buildEvacuationRows(csv(record), resolveTown, noTowns)).toMatchObject({ rows: [], missingCoordinates: ["35.51477,137.82478"] });
    const towns = new Map([["35.51477,137.82478", { townName: "知久町二丁目" }]]);
    expect(buildEvacuationRows(csv(record), resolveTown, towns).rows[0]).toMatchObject({ townName: "知久町", districtId: "chushin" });
    expect(() => buildEvacuationRows(csv(line({ 所在地_町字: "", 緯度: "", 経度: "" })), resolveTown, noTowns)).toThrow(/地区を決められない/);
  });

  it("対応表にない町名は集めて返す。飯田市以外の避難場所や、読めない値があれば止める", () => {
    expect(buildEvacuationRows(csv(line({ 所在地_町字: "水の手町" })), resolveTown, noTowns).unmappedTowns).toEqual(["水の手町"]);
    expect(() => buildEvacuationRows(csv(line({ 所在地_全国地方公共団体コード: "204072" })), resolveTown, noTowns)).toThrow(/飯田市の避難場所になっていない/);
    expect(() => buildEvacuationRows(csv(line({ 災害種別_洪水: "○" })), resolveTown, noTowns)).toThrow(/1 でも空でもない/);
    expect(() => buildEvacuationRows(csv(line({ 想定収容人数: "約200人" })), resolveTown, noTowns)).toThrow(/想定収容人数が読めない/);
  });
});

describe("buildEvacuationSql", () => {
  it("市の記載例どおりのクレジットと、更新日・確認日を入れ、避難場所を入れ直す。緯度経度がなければ null にする", () => {
    const { rows } = buildEvacuationRows(csv(line({ 名称: "O'Hall", 緯度: "", 経度: "" })), resolveTown, noTowns);
    const sql = buildEvacuationSql({ rows, csvUrl: "https://www.city.iida.lg.jp/uploaded/attachment/78765.csv", updatedOn: "2025-12-19", usedOn: "2026-10-26" });
    expect(sql).toContain("period_label = '2025年12月19日更新'");
    expect(sql).toContain("checked_on = '2026-10-26'::date");
    expect(sql).toContain("delete from public.facilities where source_id = 'iida_evacuation';");
    expect(sql).toContain("'O''Hall'");
    expect(sql).toContain("'chushin', null, null, 'iida_evacuation'");
    expect(buildEvacuationCreditText("2026-10-26")).toBe(
      "出典：飯田市（https://www.city.iida.lg.jp/soshiki/168/opendata.html）、PDL1.0（https://www.digital.go.jp/resources/open_data/public_data_license_v1.0）（2026年10月26日に利用）。" +
        "「指定緊急避難場所一覧」（飯田市）（https://www.city.iida.lg.jp/soshiki/168/opendata.html）を加工して作成（同じ場所の行をまとめた）",
    );
  });

  it("避難場所が0件なら SQL を作らない", () => {
    expect(() => buildEvacuationSql({ rows: [], csvUrl: "x", updatedOn: null, usedOn: "2026-10-26" })).toThrow(/0件/);
  });
});
