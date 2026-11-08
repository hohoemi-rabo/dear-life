import { describe, expect, it } from "vitest";
import type { TownMapEntry } from "../town-district/resolve";
import { buildDistrictTenures, buildRentSql, parseRentAverages, rentApiUrl } from "./import";

const townMap: TownMapEntry[] = [
  { townName: "上郷飯沼", cityDistrict: "上郷", districtId: "kamisato" },
  { townName: "鼎", cityDistrict: "鼎", districtId: "kanae" },
  { townName: "大瀬木", cityDistrict: "伊賀良", districtId: "igara" },
  { townName: "本町", cityDistrict: "中心市街地", districtId: "chushin" },
  { townName: "大休", cityDistrict: "羽場", districtId: null },
];

const CODES = "KEY_CODE,HYOSYO,CITYNAME,NAME,HTKSYORI,HTKSAKI,GASSAN,T001085001,T001085002,T001085003";
const LABELS = ",,,,,,,住宅に住む一般世帯,持ち家,民営借家";
// 世帯数は 住宅に住む一般世帯,持ち家,民営借家
const row = (keyCode: string, level: string, name: string, counts: string, hidden = "0", into = "") =>
  `${keyCode},${level},飯田市,${name},${hidden},${into},,${counts}`;
const csv = (...rows: string[]) =>
  [
    CODES,
    LABELS,
    row("20205", "1", "", "9999,999,999"),
    row("202050162", "3", "伊賀良", "500,350,100"),
    row("202050170", "3", "鼎", "400,250,120"),
    row("202050180", "3", "上郷", "450,300,130"),
    row("202051010", "2", "本町", "60,40,15"),
    row("202051020", "3", "本町二丁目", "X,X,X", "2", "1010"),
    row("202053140", "3", "大休", "30,20,-"),
    ...rows,
  ].join("\r\n");

describe("buildDistrictTenures", () => {
  it("住宅の所有の関係別の世帯数を4地区ごとに合計する", () => {
    const { tenures, unmappedTowns } = buildDistrictTenures(csv(), townMap);

    expect(tenures.map(({ districtId, householdsInHousing, ownerOccupied, privateRented }) => ({
      districtId,
      householdsInHousing,
      ownerOccupied,
      privateRented,
    }))).toEqual([
      { districtId: "kamisato", householdsInHousing: 450, ownerOccupied: 300, privateRented: 130 },
      { districtId: "kanae", householdsInHousing: 400, ownerOccupied: 250, privateRented: 120 },
      { districtId: "igara", householdsInHousing: 500, ownerOccupied: 350, privateRented: 100 },
      { districtId: "chushin", householdsInHousing: 60, ownerOccupied: 40, privateRented: 15 },
    ]);
    expect(unmappedTowns).toEqual([]);
  });

  it("持ち家と民営借家の合計が住宅に住む世帯より多ければ止める", () => {
    const input = csv().replace("400,250,120", "400,300,120");

    expect(() => buildDistrictTenures(input, townMap)).toThrow("kanae");
  });

  it("項目名が変わっていたら止める", () => {
    expect(() => buildDistrictTenures(csv().replace("民営借家", "民営の借家"), townMap)).toThrow("民営借家");
  });
});

const value = (cat01: string, amount: string, overrides: Record<string, string> = {}) => ({
  "@tab": "41-2023",
  "@cat01": cat01,
  "@cat02": "0",
  "@cat03": "2",
  "@area": "20205",
  "@time": "2023000000",
  "@unit": "円",
  $: amount,
  ...overrides,
});
const response = (values: unknown, status = 0) => ({
  GET_STATS_DATA: {
    RESULT: { STATUS: status, ERROR_MSG: status === 0 ? "正常に終了しました。" : "アプリケーションIDが不正です" },
    STATISTICAL_DATA: { DATA_INF: { VALUE: values } },
  },
});

describe("parseRentAverages", () => {
  it("飯田市の建て方ごとの家賃の平均を読み、数字が得られない建て方と、出さない建て方は外す", () => {
    const rents = parseRentAverages(
      response([
        value("0", "50043"),
        value("1", "51671"),
        value("2", "53107"),
        value("3", "-"),
        value("4", "X"),
        // 家賃0円を含む値・延べ面積で分けた値・ほかの市は読まない
        value("0", "49099", { "@cat03": "1" }),
        value("1", "15000", { "@cat02": "1" }),
        value("0", "51579", { "@area": "20000" }),
      ]),
    );

    expect(rents).toEqual([
      { buildingType: "all", averageRent: 50043 },
      { buildingType: "detached", averageRent: 51671 },
    ]);
  });

  it("値が1つだけのとき（配列でなくオブジェクト）も読める", () => {
    expect(parseRentAverages(response(value("0", "50043")))).toEqual([{ buildingType: "all", averageRent: 50043 }]);
  });

  it("API がエラーを返したら止める", () => {
    expect(() => parseRentAverages(response([], 100))).toThrow("アプリケーションIDが不正です");
  });

  it("民営借家全体の家賃がなければ止める", () => {
    expect(() => parseRentAverages(response([value("1", "51671")]))).toThrow("民営借家全体");
  });
});

describe("rentApiUrl", () => {
  it("飯田市・延べ面積の総数・家賃0円を含まない値だけを頼む", () => {
    const url = new URL(rentApiUrl("test-id"));

    expect(url.searchParams.get("appId")).toBe("test-id");
    expect(url.searchParams.get("statsDataId")).toBe("0004021532");
    expect(url.searchParams.get("cdArea")).toBe("20205");
    expect(url.searchParams.get("cdCat02")).toBe("0");
    expect(url.searchParams.get("cdCat03")).toBe("2");
  });
});

describe("buildRentSql", () => {
  it("出典を更新し、世帯数と家賃を入れ直す", () => {
    const { tenures } = buildDistrictTenures(csv(), townMap);
    const sql = buildRentSql(tenures, [{ buildingType: "all", averageRent: 50043 }], "2026-11-08");

    expect(sql).toContain("where id = 'estat_census_housing_tenure'");
    expect(sql).toContain("where id = 'estat_housing_land_survey_rent'");
    expect(sql).toContain("('kanae', '2020-10-01'::date, 400, 250, 120, 'estat_census_housing_tenure')");
    expect(sql).toContain("('all', 50043, '2023-10-01'::date, 'estat_housing_land_survey_rent')");
    expect(sql).toContain("checked_on = '2026-11-08'::date");
  });
});
