import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildCompareSql, parseCompareCitiesCsv, parseCompareCityCodesCsv, parseCompareStatsCsv } from "./csv";
import { COMPARE_METRICS } from "./metrics";

const dataDir = join(__dirname, "../../../data/compare");
const read = (name: string) => readFileSync(join(dataDir, name), "utf8");

const CITIES = `# 説明
id,表示名,国勢調査コード,気象官署,並び順,公開
tokyo,東京23区,13100,東京,1,true
iida,飯田市,20205,飯田,2,false
`;
const cities = parseCompareCitiesCsv(CITIES);

function statsCsv(overrides: Record<string, string> = {}): string {
  const lines = ["city_id,都市名,metric_key,指標名,値,単位,対象期間,確認日,備考"];
  for (const city of cities) {
    for (const metric of COMPARE_METRICS) {
      lines.push(overrides[`${city.id}/${metric.key}`] ?? `${city.id},${city.name},${metric.key},${metric.label},,${metric.unit},,,`);
    }
  }
  return `# 説明の行\n${lines.join("\n")}\n`;
}

describe("いまの街との比較の CSV（041）", () => {
  it("リポジトリの CSV は7都市・83の区市のコード・49行（値は空）で、そのまま読める", () => {
    const repoCities = parseCompareCitiesCsv(read("cities.csv"));
    expect(repoCities.map((city) => city.id)).toEqual(["tokyo", "yokohama", "nagoya", "osaka", "nagano", "matsumoto", "iida"]);
    const codes = parseCompareCityCodesCsv(read("city_codes.csv"), repoCities);
    const perCity = Object.fromEntries(repoCities.map((city) => [city.id, codes.filter((code) => code.cityId === city.id).length]));
    expect(perCity).toEqual({ tokyo: 23, yokohama: 18, nagoya: 16, osaka: 24, nagano: 1, matsumoto: 1, iida: 0 });
    const stats = parseCompareStatsCsv(read("stats.csv"), repoCities);
    expect(stats).toHaveLength(49);
  });

  it("空の値は null（データ未取得）にし、出典は指標ごとに決まったものを付ける", () => {
    const stats = parseCompareStatsCsv(
      statsCsv({ "tokyo/precip_annual": "tokyo,東京23区,precip_annual,1年の降水量,1598.2,mm,1991〜2020年,2026-11-14," }),
      cities,
    );
    expect(stats.find((row) => row.cityId === "tokyo" && row.metricKey === "precip_annual")).toEqual({
      cityId: "tokyo",
      metricKey: "precip_annual",
      value: 1598.2,
      unit: "mm",
      periodLabel: "1991〜2020年",
      sourceId: "jma_climate_normals",
      checkedOn: "2026-11-14",
      note: null,
    });
    expect(stats.find((row) => row.cityId === "iida" && row.metricKey === "flood_damage_10y")).toMatchObject({ value: null, sourceId: "mlit_flood_statistics" });
  });

  it.each([
    ["値を入れて対象期間がない", "tokyo,東京23区,precip_annual,1年の降水量,1600,mm,,2026-11-14,", /対象期間と確認日/],
    ["値を入れて確認日がない", "tokyo,東京23区,precip_annual,1年の降水量,1600,mm,1991〜2020年,,", /対象期間と確認日/],
    ["カンマ付きの値", 'tokyo,東京23区,precip_annual,1年の降水量,"1,600",mm,1991〜2020年,2026-11-14,', /カンマなし/],
    ["都市名のずれ", "tokyo,飯田市,precip_annual,1年の降水量,,mm,,,", /都市名/],
    ["指標名のずれ", "tokyo,東京23区,precip_annual,最深積雪,,mm,,,", /指標名/],
    ["単位のずれ", "tokyo,東京23区,precip_annual,1年の降水量,,cm,,,", /単位/],
    ["100を超える割合", "tokyo,東京23区,under15_ratio,15歳未満の割合,120,%,2020年10月1日現在,2026-11-14,", /100 以下/],
  ])("%s は止める", (_, line, message) => {
    const key = `tokyo/${line.split(",")[2]}`;
    expect(() => parseCompareStatsCsv(statsCsv({ [key]: line }), cities)).toThrow(message);
  });

  it("都市×指標の行が足りなければ止める", () => {
    const text = statsCsv().split("\n").filter((line) => !line.startsWith("iida,飯田市,pop_density")).join("\n");
    expect(() => parseCompareStatsCsv(text, cities)).toThrow(/iida の pop_density の行がありません/);
  });

  it("SQL は値の空を null で入れ、CSV にない都市を消す", () => {
    const sql = buildCompareSql(cities, [{ cityId: "tokyo", code: "13101", name: "千代田区" }], parseCompareStatsCsv(statsCsv(), cities));
    expect(sql).toContain("delete from public.compare_cities where id not in ('tokyo', 'iida');");
    expect(sql).toContain("('tokyo', 'precip_annual', null, 'mm', null, 'jma_climate_normals', null, null)");
    expect(sql).toContain("('tokyo', '13101')");
  });
});
