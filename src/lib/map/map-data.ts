// 地図の画面（021）が読むデータの型と、map_data() の応答を画面で使う形に直す処理。
// 出典の扱い・「該当なし」と「データ未取得」の区別は screen_data()（015）と同じ（F-09）
import {
  DISTRICT_IDS,
  isObject,
  isSection,
  listState,
  parseSources,
  ScreenDataFormatError,
  type DataState,
  type RawSection,
  type RawSource,
  type SourceInfo,
} from "../data/screen-data.ts";
import type { DistrictId } from "../town-district/resolve.ts";

// 地図に出す施設の種類。並びは表示の切り替えと凡例の並び
export const MAP_POINT_KINDS = ["schools", "childcare", "after_school_clubs", "bus_stops", "train_stations", "evacuation_sites"] as const;
export type MapPointKind = (typeof MAP_POINT_KINDS)[number];

export type MapPoint = {
  name: string;
  // 元の区分（「小学校」「保育所」など）。バス停・駅は null
  subkind: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
};

// GeoJSON の MultiPolygon の座標（経度・緯度の順）
export type MultiPolygonCoordinates = number[][][][];

export type SchoolDistrictArea = {
  schoolName: string;
  // API がタイルの境目で切った切れ端を並べたもの（008）。そのまま輪郭を引くと境目にも線が出る
  coordinates: MultiPolygonCoordinates;
};

export type MapDistrictData = {
  id: DistrictId;
  points: Readonly<Record<MapPointKind, DataState<readonly MapPoint[]>>>;
  elementarySchoolDistricts: DataState<readonly SchoolDistrictArea[]>;
};

export type MapData = {
  generatedAt: string;
  sources: readonly SourceInfo[];
  districtOrder: readonly DistrictId[];
  districts: Readonly<Record<DistrictId, MapDistrictData>>;
};

type RawMapDistrict = {
  id: string;
  facilities: Record<MapPointKind, RawSection<MapPoint>>;
  elementary_school_districts: RawSection<{ school_name: string; geometry: { type: "MultiPolygon"; coordinates: MultiPolygonCoordinates } }>;
};

export type RawMapData = { generated_at: string; sources: RawSource[]; districts: RawMapDistrict[] };

function assertShape(raw: unknown): asserts raw is RawMapData {
  if (!isObject(raw)) throw new ScreenDataFormatError("地図のデータがオブジェクトではありません");
  if (typeof raw.generated_at !== "string" || !Array.isArray(raw.sources) || !Array.isArray(raw.districts)) {
    throw new ScreenDataFormatError("地図のデータの欄が足りません");
  }
  for (const district of raw.districts as unknown[]) {
    if (!isObject(district) || !DISTRICT_IDS.includes(district.id as DistrictId)) {
      throw new ScreenDataFormatError(`地図のデータに知らない地区があります：${isObject(district) ? String(district.id) : "?"}`);
    }
    const facilities = district.facilities;
    if (!isObject(facilities) || !MAP_POINT_KINDS.every((kind) => isSection(facilities[kind])) || !isSection(district.elementary_school_districts)) {
      throw new ScreenDataFormatError(`地図のデータの ${district.id} の欄が足りません`);
    }
  }
}

export function parseMapData(raw: unknown): MapData {
  assertShape(raw);
  const { sources, findSource } = parseSources(raw.sources);
  const districts = raw.districts.map(
    (district): MapDistrictData => ({
      id: district.id as DistrictId,
      points: Object.fromEntries(
        MAP_POINT_KINDS.map((kind) => [
          kind,
          listState(district.facilities[kind], findSource, (item) => ({
            name: item.name,
            subkind: item.subkind,
            address: item.address,
            latitude: Number(item.latitude),
            longitude: Number(item.longitude),
          })),
        ]),
      ) as Record<MapPointKind, DataState<readonly MapPoint[]>>,
      elementarySchoolDistricts: listState(district.elementary_school_districts, findSource, (item) => ({
        schoolName: item.school_name,
        coordinates: item.geometry.coordinates,
      })),
    }),
  );
  const missing = DISTRICT_IDS.filter((id) => !districts.some((district) => district.id === id));
  if (missing.length > 0) throw new ScreenDataFormatError(`地図のデータに地区が足りません：${missing.join("・")}`);
  return {
    generatedAt: raw.generated_at,
    sources,
    districtOrder: districts.map((district) => district.id),
    districts: Object.fromEntries(districts.map((district) => [district.id, district])) as Record<DistrictId, MapDistrictData>,
  };
}
