// 小学校区の面を、地図に重ねる GeoJSON にする（021・032）。
// polygon-clipping を読むのはこのファイルだけにする。学区を出さない画面（えらぶのバス停のシート）に読ませないため（044）
import polygonClipping, { type MultiPolygon, type Polygon } from "polygon-clipping";
import type { Feature, FeatureCollection, MultiPolygonGeometry, SchoolDistrictProperties } from "./features.ts";
import type { MapData, MultiPolygonCoordinates } from "./map-data.ts";
import { schoolDistrictColor } from "./style.ts";

// 学区の範囲は API がタイルの境目で切った切れ端の集まり（008）なので、1つの形につなぎ直す。
// つなげられなければ（形が壊れているなど）元の切れ端のまま返し、輪郭の線は引かない
export function mergeSchoolDistrictPieces(pieces: MultiPolygonCoordinates): { coordinates: MultiPolygonCoordinates; merged: boolean } {
  if (pieces.length === 0) return { coordinates: pieces, merged: false };
  try {
    const [first, ...rest] = pieces as unknown as Polygon[];
    const union: MultiPolygon = polygonClipping.union(first, ...rest);
    return { coordinates: union, merged: true };
  } catch (error) {
    console.warn("小学校区の切れ端をつなげられませんでした。面だけを出します", error);
    return { coordinates: pieces, merged: false };
  }
}

// 4地区の小学校区。学校ごとに色を変える（色の順は地区の並び → 学校名の並び）
export function schoolDistrictFeatures(data: MapData): FeatureCollection<MultiPolygonGeometry, SchoolDistrictProperties> {
  const features: Feature<MultiPolygonGeometry, SchoolDistrictProperties>[] = [];
  for (const district of data.districtOrder) {
    const state = data.districts[district].elementarySchoolDistricts;
    if (state.status !== "available") continue;
    for (const area of state.value) {
      const { coordinates, merged } = mergeSchoolDistrictPieces(area.coordinates);
      features.push({
        type: "Feature",
        geometry: { type: "MultiPolygon", coordinates },
        properties: { schoolName: area.schoolName, district, color: schoolDistrictColor(features.length), merged },
      });
    }
  }
  return { type: "FeatureCollection", features };
}
