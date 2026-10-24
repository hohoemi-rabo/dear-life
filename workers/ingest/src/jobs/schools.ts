// 学区・学校・保育施設の取り込み（008・要件 7章・7.2）。不動産情報ライブラリ API の
// XKT004（小学校区）・XKT005（中学校区）の範囲を、市全体の学区について school_districts に入れ直す。
// XKT006（学校）・XKT007（保育園・幼稚園等）の点も市全体を facilities に入れるが、公開しない。画面には市の
// 「教育機関一覧」「子育て施設」（009、npm run education:sql・childcare:sql）を出し、こちらは市のデータの抜けの確認に使う。
//
// 学校と保育施設はタイル単位でしか取れず、市全体で156タイルずつある。API は1.5秒以上あけて呼ぶので1種類4分ほどかかり、
// Cron の1回の実行を短く保つため、1日に1段階ずつ（学校 → 保育施設 → 学区）進める。
// 毎年6月1日を過ぎたら、取り直しが要るとみなす（国土数値情報の学校データは 2024年6月に更新された）
import type { Job, JobContext } from "../job";
import { RawJson } from "../supabase";
import type { JstDate } from "../time";
import type { TownResolver, UnmappedTownCollector } from "../towns";
import { stripAddressPrefix, townNameForRecord } from "../../../../src/lib/town-district/resolve";

export const XKT_BASE_URL = "https://www.reinfolib.mlit.go.jp/ex-api/external";
export const IIDA_CITY_CODE = "20205";

export const SCHOOL_SOURCE_ID = "reinfolib_xkt006";
export const CHILDCARE_SOURCE_ID = "reinfolib_xkt007";
export const ELEMENTARY_DISTRICT_SOURCE_ID = "reinfolib_xkt004";
export const JUNIOR_HIGH_DISTRICT_SOURCE_ID = "reinfolib_xkt005";

// 取り直しが要るとみなす日（日本時間のこの月日を過ぎたら、前年のデータは古いとみなす）
export const REFRESH_MONTH = 6;
export const REFRESH_DAY = 1;

export type TileRange = { z: number; xFrom: number; xTo: number; yFrom: number; yTo: number };

// 学校・保育施設の点を取るタイル（z13 は XKT006・XKT007 で使えるいちばん広い縮尺）。
// 経度 137.64〜138.16・緯度 35.21〜35.68 で、飯田市全体（学区の範囲から求めた 経度 137.69〜138.15・緯度 35.25〜35.66）をおおう
export const POINT_TILES: TileRange = { z: 13, xFrom: 7228, xTo: 7239, yFrom: 3226, yTo: 3238 };

// 学区の範囲を取るタイル（z11。市のコードで飯田市の学区だけにしぼって取る）。
// 市全体の学区（小19・中9）が、端に届かずに収まる（2026-10-24 に確認。届いたら replace_school_districts が失敗する）
export const DISTRICT_TILES: TileRange = { z: 11, xFrom: 1807, xTo: 1809, yFrom: 806, yTo: 809 };

export type Tile = { z: number; x: number; y: number };

export function tilesOf(range: TileRange): Tile[] {
  const tiles: Tile[] = [];
  for (let x = range.xFrom; x <= range.xTo; x += 1) {
    for (let y = range.yFrom; y <= range.yTo; y += 1) tiles.push({ z: range.z, x, y });
  }
  return tiles;
}

// タイルの範囲の経度・緯度（Web メルカトルの XYZ タイル）
export function boundsOf(range: TileRange): { west: number; south: number; east: number; north: number } {
  const n = 2 ** range.z;
  const lon = (x: number) => (x / n) * 360 - 180;
  const lat = (y: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;
  return { west: lon(range.xFrom), east: lon(range.xTo + 1), north: lat(range.yFrom), south: lat(range.yTo + 1) };
}

// 段階 ----------------------------------------------------------------------

export type Stage = "schools" | "childcare" | "school_districts";

type SourceFetched = { id: string; fetched_at: string | null };

// 今年の取り直しの始まり（日本時間の6月1日0時）。それより前に取ったデータは古い
export function refreshStartsAt(today: JstDate): number {
  const year = today.month > REFRESH_MONTH || (today.month === REFRESH_MONTH && today.day >= REFRESH_DAY) ? today.year : today.year - 1;
  const mm = String(REFRESH_MONTH).padStart(2, "0");
  const dd = String(REFRESH_DAY).padStart(2, "0");
  return Date.parse(`${year}-${mm}-${dd}T00:00:00+09:00`);
}

// 次にやる段階。取り直しが要るものを学校 → 保育施設 → 学区の順に1つ選ぶ。全部新しければ null
export function nextStage(sources: readonly SourceFetched[], today: JstDate): Stage | null {
  const threshold = refreshStartsAt(today);
  const isStale = (id: string) => {
    const fetchedAt = sources.find((source) => source.id === id)?.fetched_at ?? null;
    return fetchedAt === null || Date.parse(fetchedAt) < threshold;
  };
  if (isStale(SCHOOL_SOURCE_ID)) return "schools";
  if (isStale(CHILDCARE_SOURCE_ID)) return "childcare";
  if (isStale(ELEMENTARY_DISTRICT_SOURCE_ID) || isStale(JUNIOR_HIGH_DISTRICT_SOURCE_ID)) return "school_districts";
  return null;
}

// API ------------------------------------------------------------------------

export type PointFeature<P> = { type: "Feature"; geometry: { type: string; coordinates: unknown }; properties: P };

async function requestTile(context: JobContext, api: string, tile: Tile, extra: Record<string, string> = {}): Promise<string> {
  const apiKey = context.env.REINFOLIB_API_KEY;
  if (!apiKey) throw new Error(`REINFOLIB_API_KEY が登録されていないので、${api} を取得できない`);
  const url = new URL(`${XKT_BASE_URL}/${api}`);
  url.searchParams.set("response_format", "geojson");
  url.searchParams.set("z", String(tile.z));
  url.searchParams.set("x", String(tile.x));
  url.searchParams.set("y", String(tile.y));
  for (const [key, value] of Object.entries(extra)) url.searchParams.set(key, value);
  const response = await context.external.request(url.toString(), { headers: { "Ocp-Apim-Subscription-Key": apiKey } });
  return response.text();
}

async function fetchPointFeatures<P>(context: JobContext, api: string): Promise<PointFeature<P>[]> {
  const features: PointFeature<P>[] = [];
  for (const tile of tilesOf(POINT_TILES)) {
    const body: unknown = JSON.parse(await requestTile(context, api, tile));
    const tileFeatures = (body as { features?: unknown }).features;
    if (!Array.isArray(tileFeatures)) throw new Error(`${api} の応答の形が想定と違う（z${tile.z}/${tile.x}/${tile.y}）`);
    features.push(...(tileFeatures as PointFeature<P>[]));
  }
  return features;
}

function pointOf(feature: PointFeature<unknown>, label: string): { longitude: number; latitude: number } {
  const coordinates = feature.geometry.coordinates;
  if (
    feature.geometry.type !== "Point" ||
    !Array.isArray(coordinates) ||
    typeof coordinates[0] !== "number" ||
    typeof coordinates[1] !== "number"
  ) {
    throw new Error(`${label} の位置が点になっていない`);
  }
  return { longitude: coordinates[0], latitude: coordinates[1] };
}

// facilities の1行（replace_facilities に渡す形）
export type FacilityRow = {
  kind: "school" | "childcare";
  subkind: string | null;
  name: string;
  address: string;
  town_name: string;
  // 4地区の外は null
  district_id: string | null;
  latitude: number;
  longitude: number;
  source_key: string;
  attributes: Record<string, string | number | string[]>;
};

// 住所を地区に振り分ける（4地区の外は地区なし）。対応表にない町名は記録して、その施設は入れない
function placeInDistrict(
  address: string,
  resolveTown: TownResolver,
  unmappedTowns: UnmappedTownCollector,
  sourceId: string,
): { town_name: string; district_id: string | null } | null {
  const entry = resolveTown(address);
  if (entry === null) {
    unmappedTowns.add(address, sourceId);
    return null;
  }
  return { town_name: townNameForRecord(address), district_id: entry.districtId };
}

// 学校（XKT006） --------------------------------------------------------------

// API 操作説明の項目のうち使うもの。コードの意味は国土数値情報のコードリスト
// （管理者：1 国・2 都道府県・3 市区町村・4 民間・0 その他。休校区分：0 調査なし・1 開校中・2 休校中）
export type SchoolProperties = {
  P29_001: string;
  P29_002: string;
  P29_003_name_ja: string;
  P29_004_ja: string;
  P29_005_ja: string;
  P29_006: number;
  P29_007: number;
  P29_008: string;
  P29_009_ja: string;
};

export function toSchoolRows(
  features: readonly PointFeature<SchoolProperties>[],
  resolveTown: TownResolver,
  unmappedTowns: UnmappedTownCollector,
): FacilityRow[] {
  const rows = new Map<string, FacilityRow>();
  for (const feature of features) {
    const p = feature.properties;
    if (p.P29_001 !== IIDA_CITY_CODE) continue;
    // 同じ学校がタイルの境目で2つのタイルに入ることがあるので、学校コードとキャンパスで1つにする
    const key = `${p.P29_002}-${p.P29_008}`;
    if (rows.has(key)) continue;
    const place = placeInDistrict(p.P29_005_ja, resolveTown, unmappedTowns, SCHOOL_SOURCE_ID);
    if (!place) continue;
    rows.set(key, {
      kind: "school",
      subkind: p.P29_003_name_ja,
      name: p.P29_004_ja,
      address: p.P29_005_ja,
      ...place,
      ...pointOf(feature, p.P29_004_ja),
      source_key: key,
      attributes: {
        school_code: p.P29_002,
        administrator_code: p.P29_006,
        closed_code: p.P29_007,
        ...(p.P29_009_ja ? { note: p.P29_009_ja } : {}),
      },
    });
  }
  return [...rows.values()];
}

// 保育園・幼稚園等（XKT007） ---------------------------------------------------

// 幼稚園・こども園は国土数値情報の学校データから、保育園は福祉施設データから来るので、項目が違う
export type ChildcareProperties = {
  administrativeAreaCode: string;
  preSchoolName_ja: string;
  location_ja: string;
  administratorCode: number;
  schoolCode?: string;
  schoolClassCode_name_ja?: string;
  closeSchoolCode?: number;
  welfareFacilityMinorClassCode?: string;
};

// 福祉施設の小分類コード（国土数値情報 福祉施設のコードリスト）のうち、保育園・幼稚園等に出てくるもの
export const WELFARE_MINOR_CLASS_NAMES: Readonly<Record<string, string>> = {
  "050401": "保育所",
  "050402": "幼保連携型認定こども園",
  "050403": "保育所型認定こども園",
  "050404": "幼稚園型認定こども園",
  "050405": "地方裁量型認定こども園",
  "050406": "へき地保育所",
  "050499": "その他の保育所等",
  "050501": "小規模保育事業所A型",
  "050502": "小規模保育事業所B型",
  "050503": "小規模保育事業所C型",
  "050504": "家庭的保育事業所",
  "050505": "居宅訪問型保育事業所",
  "050506": "事業所内保育事業所",
  "050599": "その他の地域型保育事業所",
};

function childcareSubkind(p: ChildcareProperties): string | null {
  if (p.schoolClassCode_name_ja) return p.schoolClassCode_name_ja;
  const code = p.welfareFacilityMinorClassCode ?? "";
  return WELFARE_MINOR_CLASS_NAMES[code] ?? (code === "" ? null : `その他（${code}）`);
}

// 同じ施設が学校データと福祉施設データの両方に入っていることがある（例：認定こども園慈光幼稚園と慈光幼稚園）。
// 所在地が同じものは1つにまとめ、学校データの名前を使い、もう一方の名前は other_names に残す
export function toChildcareRows(
  features: readonly PointFeature<ChildcareProperties>[],
  resolveTown: TownResolver,
  unmappedTowns: UnmappedTownCollector,
): FacilityRow[] {
  const groups = new Map<string, PointFeature<ChildcareProperties>[]>();
  for (const feature of features) {
    const p = feature.properties;
    if (p.administrativeAreaCode !== IIDA_CITY_CODE) continue;
    const addressKey = stripAddressPrefix(p.location_ja);
    const group = groups.get(addressKey) ?? [];
    // タイルの境目で同じ行が2回来たときは1つにする
    if (!group.some((other) => other.properties.preSchoolName_ja === p.preSchoolName_ja)) group.push(feature);
    groups.set(addressKey, group);
  }

  const rows: FacilityRow[] = [];
  for (const [addressKey, group] of groups) {
    const main = group.find((feature) => feature.properties.schoolCode) ?? group[0];
    const p = main.properties;
    const place = placeInDistrict(p.location_ja, resolveTown, unmappedTowns, CHILDCARE_SOURCE_ID);
    if (!place) continue;
    const otherNames = group.filter((feature) => feature !== main).map((feature) => feature.properties.preSchoolName_ja);
    rows.push({
      kind: "childcare",
      subkind: childcareSubkind(p),
      name: p.preSchoolName_ja,
      address: p.location_ja,
      ...place,
      ...pointOf(main, p.preSchoolName_ja),
      source_key: p.schoolCode ? p.schoolCode : `${p.welfareFacilityMinorClassCode ?? ""}:${addressKey}`,
      attributes: {
        administrator_code: p.administratorCode,
        ...(p.schoolCode ? { school_code: p.schoolCode } : {}),
        ...(p.closeSchoolCode !== undefined ? { closed_code: p.closeSchoolCode } : {}),
        ...(p.welfareFacilityMinorClassCode ? { welfare_class_code: p.welfareFacilityMinorClassCode } : {}),
        ...(otherNames.length > 0 ? { other_names: otherNames } : {}),
      },
    });
  }
  return rows;
}

// 段階ごとの取り込み ---------------------------------------------------------

async function markFetched(context: JobContext, sourceIds: readonly string[]): Promise<void> {
  await context.db.update("data_sources", `id=in.(${sourceIds.join(",")})`, { fetched_at: new Date().toISOString() });
}

async function ingestPoints<P>(
  context: JobContext,
  api: "XKT006" | "XKT007",
  sourceId: string,
  toRows: (features: PointFeature<P>[], resolveTown: TownResolver, unmappedTowns: UnmappedTownCollector) => FacilityRow[],
): Promise<number> {
  const features = await fetchPointFeatures<P>(context, api);
  const rows = toRows(features, await context.townResolver(), context.unmappedTowns);
  const written = await context.db.rpc<number>("replace_facilities", { p_source_id: sourceId, p_rows: rows });
  await markFetched(context, [sourceId]);
  return written;
}

// 学区の応答は大きい（1タイル 200KB ほど）ので、Worker では読まずに本文をつなげて Supabase に渡す
// （無料プランの CPU 時間 10ms に収めるための作り。有料にしたいまも、読む必要がないのでこのままにしている）
async function ingestDistricts(context: JobContext): Promise<number> {
  const bounds = boundsOf(DISTRICT_TILES);
  let written = 0;
  for (const level of [
    { api: "XKT004", level: "elementary", sourceId: ELEMENTARY_DISTRICT_SOURCE_ID },
    { api: "XKT005", level: "junior_high", sourceId: JUNIOR_HIGH_DISTRICT_SOURCE_ID },
  ] as const) {
    const tiles: string[] = [];
    for (const tile of tilesOf(DISTRICT_TILES)) {
      const text = (await requestTile(context, level.api, tile, { administrativeAreaCode: IIDA_CITY_CODE })).trim();
      if (!text.startsWith("{")) throw new Error(`${level.api} の応答が JSON ではない（z${tile.z}/${tile.x}/${tile.y}）`);
      tiles.push(text);
    }
    const head = JSON.stringify({ p_level: level.level, p_source_id: level.sourceId, p_bounds: bounds });
    const body = `${head.slice(0, -1)},"p_tiles":[${tiles.join(",")}]}`;
    written += await context.db.rpc<number>("replace_school_districts", new RawJson(body));
  }
  await markFetched(context, [ELEMENTARY_DISTRICT_SOURCE_ID, JUNIOR_HIGH_DISTRICT_SOURCE_ID]);
  return written;
}

export const schools: Job = {
  name: "schools",
  // 学校と保育施設の2つの出典を取り込むので、対応表にない町名は出典を付けて記録する
  sourceId: null,
  shouldRun: () => true,
  async run(context) {
    const sources = await context.db.select<SourceFetched>(
      "data_sources",
      `select=id,fetched_at&id=in.(${[SCHOOL_SOURCE_ID, CHILDCARE_SOURCE_ID, ELEMENTARY_DISTRICT_SOURCE_ID, JUNIOR_HIGH_DISTRICT_SOURCE_ID].join(",")})`,
    );
    if (sources.length !== 4) throw new Error("data_sources に学区・学校・保育施設の出典（4つ）がそろっていない");

    switch (nextStage(sources, context.today)) {
      case "schools":
        return { rowsWritten: await ingestPoints(context, "XKT006", SCHOOL_SOURCE_ID, toSchoolRows) };
      case "childcare":
        return { rowsWritten: await ingestPoints(context, "XKT007", CHILDCARE_SOURCE_ID, toChildcareRows) };
      case "school_districts":
        return { rowsWritten: await ingestDistricts(context) };
      case null:
        return { rowsWritten: 0 };
    }
  },
};
