import { describe, expect, it } from "vitest";
import type { TownMapEntry } from "../town-district/resolve";
import { buildDistrictPopulations, buildPopulationSql } from "./census";

const townMap: TownMapEntry[] = [
  { townName: "上郷飯沼", cityDistrict: "上郷", districtId: "kamisato" },
  { townName: "鼎", cityDistrict: "鼎", districtId: "kanae" },
  { townName: "大瀬木", cityDistrict: "伊賀良", districtId: "igara" },
  { townName: "宮ノ上", cityDistrict: "中心市街地", districtId: "chushin" },
  { townName: "本町", cityDistrict: "中心市街地", districtId: "chushin" },
  { townName: "大休", cityDistrict: "羽場", districtId: null },
];

const CODES = "KEY_CODE,HYOSYO,CITYNAME,NAME,HTKSYORI,HTKSAKI,GASSAN,T001082001,T001082017,T001082018,T001082019";
const LABELS = ",,,,,,,総数、年齢「不詳」含む,総数１５歳未満,総数１５～６４歳,総数６５歳以上";
// 人数は 総数,15歳未満,15〜64歳,65歳以上
const row = (keyCode: string, level: string, name: string, counts: string, hidden = "0", into = "") =>
  `${keyCode},${level},飯田市,${name},${hidden},${into},,${counts}`;
const csv = (...rows: string[]) =>
  [
    CODES,
    LABELS,
    row("20201", "1", "", "1000,100,600,300").replace("飯田市", "長野市"),
    row("20205", "1", "", "9999,999,999,999"),
    row("202050162", "3", "伊賀良", "300,40,160,90"),
    row("20205016205", "4", "伊賀良大瀬木", "300,40,160,90"),
    row("202050170", "3", "鼎", "200,20,110,60"),
    row("202050180", "3", "上郷", "250,30,140,70"),
    row("202051010", "2", "本町", "50,5,25,19"),
    row("202051020", "3", "宮の上", "40,-,20,20"),
    row("202053140", "3", "大休", "30,3,15,12"),
    ...rows,
  ].join("\r\n");

describe("buildDistrictPopulations", () => {
  it("町丁・字等（HYOSYO 2・3）を4地区ごとに合計し、市全体・その下の区分・ほかの市の行は数えない", () => {
    const { populations, unmappedTowns, skippedTowns } = buildDistrictPopulations(csv(), townMap);

    expect(populations).toEqual([
      // 国勢調査では「上郷」「伊賀良」が地区名のまま1つの町丁・字等なので、地区名で振り分ける
      { districtId: "kamisato", total: 250, age0to14: 30, age15to64: 140, age65plus: 70, towns: ["上郷"] },
      { districtId: "kanae", total: 200, age0to14: 20, age15to64: 110, age65plus: 60, towns: ["鼎"] },
      { districtId: "igara", total: 300, age0to14: 40, age15to64: 160, age65plus: 90, towns: ["伊賀良"] },
      // 「-」は0人。「宮の上」は対応表の「宮ノ上」に当たる
      { districtId: "chushin", total: 90, age0to14: 5, age15to64: 45, age65plus: 39, towns: ["本町", "宮の上"] },
    ]);
    expect(unmappedTowns).toEqual([]);
    expect(skippedTowns).toEqual([]);
  });

  it("人がいるのに地区を決められない町丁・字等を返し、0人か合算された町丁・字等は飛ばす", () => {
    const { unmappedTowns, skippedTowns } = buildDistrictPopulations(
      csv(
        row("202059010", "2", "どこか", "10,1,5,4"),
        row("202053170", "2", "松川入", "-,-,-,-"),
        row("202053150", "2", "横手", "X,X,X,X", "2", "3140"),
      ),
      townMap,
    );

    expect(unmappedTowns).toEqual(["どこか"]);
    expect(skippedTowns).toEqual(["松川入", "横手"]);
  });

  it("伏せられた人数が別の地区の町丁・字等に合算されていたら止める", () => {
    // 本町（中心市街地）の丁目が、大休（羽場）に合算されている
    const input = csv(row("20205101001", "4", "本町一丁目", "X,X,X,X", "2", "314001"));

    expect(() => buildDistrictPopulations(input, townMap)).toThrow("別の地区");
  });

  it("4地区のどれかの町丁・字等が1つもなければ止める", () => {
    const input = csv().split("\r\n").filter((line) => !line.includes(",鼎,")).join("\r\n");

    expect(() => buildDistrictPopulations(input, townMap)).toThrow("kanae");
  });

  it("項目名が変わっていたら止める", () => {
    expect(() => buildDistrictPopulations(csv().replace("総数１５歳未満", "０～１４歳"), townMap)).toThrow("総数１５歳未満");
  });

  it("人数が読めなければ止める", () => {
    expect(() => buildDistrictPopulations(csv(row("202051030", "2", "本町", "abc,1,1,1")), townMap)).toThrow("読めない");
  });
});

describe("buildPopulationSql", () => {
  it("出典を更新し、出典の人口を入れ直す SQL を作る", () => {
    const { populations } = buildDistrictPopulations(csv(), townMap);
    const sql = buildPopulationSql(populations, "2026-10-26");

    expect(sql).toContain("period_label = '2020年10月1日現在（令和2年国勢調査）'");
    expect(sql).toContain("checked_on = '2026-10-26'::date");
    expect(sql).toContain("delete from public.population where source_id = 'estat_census_small_area';");
    expect(sql).toContain("('chushin', '2020-10-01'::date, 90, 5, 45, 39, 'estat_census_small_area')");
    expect(sql).toContain("--   chushin：本町、宮の上");
  });
});
