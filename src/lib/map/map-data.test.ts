import { describe, expect, it } from "vitest";
import { ScreenDataFormatError } from "../data/screen-data";
import { mergeSchoolDistrictPieces, pointFeatures, schoolDistrictFeatures, findPoint } from "./features";
import { parseMapData } from "./map-data";
import { pointKindSummary, schoolDistrictSummary } from "./summary";

const section = (source_id: string, items: unknown[] = []) => ({ source_id, items });
const source = (id: string) => ({
  id,
  name: `${id} の名前`,
  publisher: "提供元",
  source_url: null,
  license: null,
  credit_text: null,
  period_label: null,
  checked_on: null,
  fetched_at: null,
});

// 経度 lon・緯度 lat を左下にした 0.01 度四方（タイルの切れ端の代わり）
const square = (lon: number, lat: number) => [[[lon, lat], [lon + 0.01, lat], [lon + 0.01, lat + 0.01], [lon, lat + 0.01], [lon, lat]]];

function district(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    facilities: {
      schools: section("iida_education"),
      childcare: section("iida_childcare"),
      after_school_clubs: section("iida_childcare"),
      evacuation_sites: section("iida_evacuation"),
      bus_stops: section("gtfs_minamishinshu_bus"),
      train_stations: section("sena_iida_line_stations"),
    },
    elementary_school_districts: section("reinfolib_xkt004"),
    ...overrides,
  };
}

function raw(sources: string[], kanae: Record<string, unknown> = {}) {
  return {
    generated_at: "2026-10-27T03:00:00+00:00",
    sources: sources.map(source),
    districts: ["kamisato", "kanae", "igara", "chushin"].map((id) => district(id, id === "kanae" ? kanae : {})),
  };
}

const kanaeSchools = {
  facilities: {
    ...district("kanae").facilities,
    schools: section("iida_education", [{ name: "鼎小学校", subkind: "小学校", address: "飯田市鼎", latitude: 35.5, longitude: 137.82 }]),
  },
  elementary_school_districts: section("reinfolib_xkt004", [
    // 2つのタイルにまたがる学区（隣り合う切れ端）
    { school_name: "鼎小学校", geometry: { type: "MultiPolygon", coordinates: [square(137.82, 35.5), square(137.83, 35.5)] } },
  ]),
};

describe("parseMapData", () => {
  it("出典が未公開ならデータ未取得、公開済みで空なら該当なし", () => {
    const data = parseMapData(raw(["sena_iida_line_stations"], kanaeSchools));
    expect(data.districts.kanae.points.schools).toEqual({ status: "unavailable" });
    expect(data.districts.kanae.elementarySchoolDistricts).toEqual({ status: "unavailable" });
    expect(data.districts.igara.points.train_stations).toEqual({ status: "none", source: expect.objectContaining({ id: "sena_iida_line_stations" }) });
  });

  it("公開済みの出典の点と学区を、出典つきで返す", () => {
    const data = parseMapData(raw(["iida_education", "reinfolib_xkt004"], kanaeSchools));
    expect(data.districtOrder).toEqual(["kamisato", "kanae", "igara", "chushin"]);
    expect(data.districts.kanae.points.schools).toEqual({
      status: "available",
      value: [{ name: "鼎小学校", subkind: "小学校", address: "飯田市鼎", latitude: 35.5, longitude: 137.82 }],
      source: expect.objectContaining({ id: "iida_education" }),
    });
    expect(data.districts.kanae.elementarySchoolDistricts).toMatchObject({ status: "available", value: [{ schoolName: "鼎小学校" }] });
  });

  it.each([
    ["オブジェクトでない", null],
    ["地区が足りない", { ...raw([]), districts: raw([]).districts.slice(1) }],
    ["施設の欄が足りない", raw([], { facilities: { schools: section("iida_education") } })],
  ])("形が違えば ScreenDataFormatError（%s）", (_, value) => {
    expect(() => parseMapData(value)).toThrow(ScreenDataFormatError);
  });
});

describe("地図に渡す GeoJSON", () => {
  const data = parseMapData(raw(["iida_education", "reinfolib_xkt004"], kanaeSchools));

  it("公開済みの点だけを、経度・緯度の順で出し、タップした点から元の施設を引ける", () => {
    const { features } = pointFeatures(data);
    expect(features).toEqual([
      { type: "Feature", geometry: { type: "Point", coordinates: [137.82, 35.5] }, properties: { kind: "schools", district: "kanae", index: 0 } },
    ]);
    expect(findPoint(data, features[0].properties)?.name).toBe("鼎小学校");
    expect(findPoint(data, { kind: "bus_stops", district: "kanae", index: 0 })).toBeNull();
  });

  it("学区はタイルの切れ端を1つの形につなぎ、学校ごとに色を付ける", () => {
    const [feature] = schoolDistrictFeatures(data).features;
    expect(feature.properties).toEqual({ schoolName: "鼎小学校", district: "kanae", color: expect.stringMatching(/^#/), merged: true });
    // 隣り合う2つの四角が、1つの長方形（外周の点は4つ＋閉じる点）になる
    expect(feature.geometry.coordinates).toHaveLength(1);
    expect(feature.geometry.coordinates[0]).toHaveLength(1);
    expect(feature.geometry.coordinates[0][0]).toHaveLength(5);
  });

  it("つなげられない形なら、切れ端のまま返して輪郭は引かない", () => {
    const broken = [[[[Number.NaN, 35.5], [137.8, 35.5]]]];
    expect(mergeSchoolDistrictPieces(broken).merged).toBe(false);
    expect(mergeSchoolDistrictPieces([]).merged).toBe(false);
  });
});

describe("種類ごとの状態と件数", () => {
  it("4地区の件数を合わせ、未公開ならデータ未取得、0件なら該当なし", () => {
    const data = parseMapData(raw(["iida_education", "sena_iida_line_stations"], kanaeSchools));
    expect(pointKindSummary(data, "schools")).toEqual({ status: "available", count: 1, source: expect.objectContaining({ id: "iida_education" }) });
    expect(pointKindSummary(data, "train_stations")).toEqual({ status: "none", count: 0, source: expect.objectContaining({ id: "sena_iida_line_stations" }) });
    expect(pointKindSummary(data, "bus_stops")).toEqual({ status: "unavailable" });
    expect(schoolDistrictSummary(data)).toEqual({ status: "unavailable" });
  });
});
