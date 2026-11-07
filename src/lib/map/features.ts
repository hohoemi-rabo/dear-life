// 地図のデータを、地図に重ねる GeoJSON にする（021・032）
import polygonClipping, { type MultiPolygon, type Polygon } from "polygon-clipping";
import type { DistrictId } from "../town-district/resolve.ts";
import { MAP_POINT_KINDS, type MapData, type MapPoint, type MapPointKind, type MultiPolygonCoordinates } from "./map-data.ts";
import type { LatLng } from "./camera.ts";
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

// 点を見分ける文字列。立体の地図の印に持たせて、押されたときに元の点を引く
export function pointKey(properties: PointProperties): string {
  return `${properties.kind}:${properties.district}:${properties.index}`;
}

export function isSamePoint(a: PointProperties, b: PointProperties): boolean {
  return a.kind === b.kind && a.district === b.district && a.index === b.index;
}

export type PointPosition = LatLng & { properties: PointProperties };

// 表示中の種類の点の位置。タップした所にいちばん近い点を探すのに使う
export function visiblePointPositions(
  points: FeatureCollection<PointGeometry, PointProperties>,
  visibleKinds: ReadonlySet<MapPointKind>,
): PointPosition[] {
  return points.features
    .filter((feature) => visibleKinds.has(feature.properties.kind))
    .map((feature) => ({ lng: feature.geometry.coordinates[0], lat: feature.geometry.coordinates[1], properties: feature.properties }));
}
