// 平面（ズーム）と立体（カメラの距離 range）の見ている広さの換算と、タップした所にいちばん近い点の選び方（032）。
// どちらも「だいたい同じ広さが見える」ための近似で、地図の位置の正確さには使わない
import type { Bounds } from "./style.ts";

export type LatLng = { lat: number; lng: number };

// ウェブ地図（メルカトル）のズーム0で、赤道の1ピクセルが何メートルか
const EQUATOR_METERS_PER_PIXEL = 156543.03392;
// 緯度1度・経度1度（赤道）のおよその長さ（メートル）
const METERS_PER_DEGREE_LAT = 110574;
const METERS_PER_DEGREE_LNG = 111320;
// 立体の地図のカメラの縦の画角（度）。Google の 3D の地図の既定に合わせた近似
const VERTICAL_FOV_DEGREES = 35;
// 立体で地区を見るときに、地区の幅より少し引いて、まわりも入れる
const RANGE_MARGIN = 1.3;
const MIN_RANGE = 300;
const MAX_RANGE = 30000;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export function metersPerPixel(lat: number, zoom: number): number {
  return (EQUATOR_METERS_PER_PIXEL * Math.cos(toRadians(lat))) / 2 ** zoom;
}

export function boundsCenter(bounds: Bounds): LatLng {
  return { lat: (bounds.south + bounds.north) / 2, lng: (bounds.west + bounds.east) / 2 };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// 地区の範囲がまるごと入るくらいの、立体のカメラの距離
export function rangeForBounds(bounds: Bounds): number {
  const { lat } = boundsCenter(bounds);
  const width = (bounds.east - bounds.west) * METERS_PER_DEGREE_LNG * Math.cos(toRadians(lat));
  const height = (bounds.north - bounds.south) * METERS_PER_DEGREE_LAT;
  return clamp(Math.max(width, height) * RANGE_MARGIN, MIN_RANGE, MAX_RANGE);
}

const halfFovTangent = Math.tan(toRadians(VERTICAL_FOV_DEGREES / 2));

// 平面のズームで縦に見えている地面の長さを、立体のカメラの距離に直す
export function zoomToRange(zoom: number, lat: number, viewportHeight: number): number {
  return clamp((metersPerPixel(lat, zoom) * viewportHeight) / (2 * halfFovTangent), MIN_RANGE, MAX_RANGE);
}

// zoomToRange の逆。立体から平面に戻すときに、だいたい同じ広さを見せる
export function rangeToZoom(range: number, lat: number, viewportHeight: number, minZoom: number, maxZoom: number): number {
  const meters = 2 * halfFovTangent * range;
  const zoom = Math.log2((EQUATOR_METERS_PER_PIXEL * Math.cos(toRadians(lat)) * viewportHeight) / meters);
  return clamp(zoom, minZoom, maxZoom);
}

// タップした所から radiusPx（画面のピクセル）以内で、いちばん近い点。指で小さな点を押しやすくするため
export function nearestWithin<T extends LatLng>(candidates: readonly T[], target: LatLng, zoom: number, radiusPx: number): T | null {
  const scale = metersPerPixel(target.lat, zoom);
  const cosLat = Math.cos(toRadians(target.lat));
  let best: T | null = null;
  let bestDistance = radiusPx;
  for (const candidate of candidates) {
    const dx = ((candidate.lng - target.lng) * METERS_PER_DEGREE_LNG * cosLat) / scale;
    const dy = ((candidate.lat - target.lat) * METERS_PER_DEGREE_LAT) / scale;
    const distance = Math.hypot(dx, dy);
    if (distance <= bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}
