// 地図のデータを、地図に重ねる GeoJSON にする（021・032）。
// 小学校区の面は school-district-features.ts に分けてある（面をつなげる polygon-clipping を、地図の画面だけが読むように。044）
import type { DistrictId } from "../town-district/resolve.ts";
import { MAP_POINT_KINDS, type MapData, type MapPoint, type MapPointKind, type MultiPolygonCoordinates } from "./map-data.ts";
import type { LatLng } from "./camera.ts";

export type PointProperties = { kind: MapPointKind; district: DistrictId; index: number };

export type SchoolDistrictProperties = {
  schoolName: string;
  district: DistrictId;
  color: string;
  // 切れ端をつなげられたときだけ輪郭の線を引く（つなげられないと、タイルの境目にも線が出るため）
  merged: boolean;
};

export type Feature<G, P> = { type: "Feature"; geometry: G; properties: P };
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
