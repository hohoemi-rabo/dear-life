// 地図のデータを、MapLibre に渡す GeoJSON にする（021）
import polygonClipping, { type MultiPolygon, type Polygon } from "polygon-clipping";
import type { DistrictId } from "../town-district/resolve.ts";
import { MAP_POINT_KINDS, type MapData, type MapPoint, type MapPointKind, type MultiPolygonCoordinates } from "./map-data.ts";
import { schoolDistrictColor } from "./style.ts";

export type PointProperties = { kind: MapPointKind; district: DistrictId; index: number };

export type SchoolDistrictProperties = {
  schoolName: string;
  district: DistrictId;
  color: string;
  // 切れ端をつなげられたときだけ輪郭の線を引く（つなげられないと、タイルの境目にも線が出るため）
  merged: boolean;
};

type Feature<G, P> = { type: "Feature"; geometry: G; properties: P };
export type FeatureCollection<G, P> = { type: "FeatureCollection"; features: Feature<G, P>[] };

export type PointGeometry = { type: "Point"; coordinates: [number, number] };
export type MultiPolygonGeometry = { type: "MultiPolygon"; coordinates: MultiPolygonCoordinates };

// 4地区の施設の点。タップした点は properties（種類・地区・並び）から元の施設を引く（findPoint）
export function pointFeatures(data: MapData): FeatureCollection<PointGeometry, PointProperties> {
  const features: Feature<PointGeometry, PointProperties>[] = [];
  for (const district of data.districtOrder) {
    for (const kind of MAP_POINT_KINDS) {
      const state = data.districts[district].points[kind];
      if (state.status !== "available") continue;
      state.value.forEach((point, index) => {
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [point.longitude, point.latitude] },
          properties: { kind, district, index },
        });
      });
    }
  }
  return { type: "FeatureCollection", features };
}

export function findPoint(data: MapData, properties: PointProperties): MapPoint | null {
  const state = data.districts[properties.district]?.points[properties.kind];
  return state?.status === "available" ? (state.value[properties.index] ?? null) : null;
}

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

// 地図でタップしたもの。施設の点か、小学校区の面
export type MapSelection =
  | { type: "point"; point: PointProperties }
  | { type: "schoolDistrict"; schoolName: string; district: DistrictId };
