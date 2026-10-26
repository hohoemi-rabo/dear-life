// 飯田市オープンデータ「指定緊急避難場所一覧」の取り込み（009）。npm run evacuation:sql から使う。
// 市全体の指定緊急避難場所を facilities に入れる（4地区の外は地区なし）。夏の場面（大雨と避難）とカルテ・地図に出す
import { parseCsv, type CsvRecord } from "../gtfs/csv.ts";
import { coordinateKey } from "../gtfs/import.ts";
import { townNameForRecord, type DistrictId, type TownMapEntry } from "../town-district/resolve.ts";
import { IIDA_LG_CODE, buildCityCreditText, buildCityFacilitiesSql, type CityFacilitiesSqlInput } from "./open-data.ts";

export const EVACUATION_SOURCE_ID = "iida_evacuation";
export const EVACUATION_DATASET_NAME = "指定緊急避難場所一覧";
const SUBKIND = "指定緊急避難場所";

// 災害種別の列。値は "1"（その災害の避難場所）か空
const HAZARD_COLUMNS = {
  flood: "災害種別_洪水",
  landslide: "災害種別_崖崩れ、土石流及び地滑り",
  storm_surge: "災害種別_高潮",
  earthquake: "災害種別_地震",
  tsunami: "災害種別_津波",
  large_fire: "災害種別_大規模な火事",
  inland_flood: "災害種別_内水氾濫",
  volcano: "災害種別_火山現象",
} as const;
export type Hazard = keyof typeof HAZARD_COLUMNS;

export type EvacuationRow = {
  kind: "evacuation_site";
  subkind: string;
  name: string;
  address: string;
  townName: string;
  // 4地区の外は null
  districtId: DistrictId | null;
  // 市の CSV に緯度経度がない場所は null（地図には出さず、一覧にだけ出す）
  lat: number | null;
  lon: number | null;
  sourceKey: string;
  attributes: {
    ids: string[];
    hazards: Hazard[];
    // 指定避難所（避難生活を送る場所）も兼ねる
    also_shelter: boolean;
    capacity?: number;
    // 「4平方メートルあたり1人」のような、収容人数の数え方
    capacity_note?: string;
  };
};

function present(value: string | undefined): string | undefined {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? undefined : trimmed;
}

function flag(record: CsvRecord, column: string): boolean {
  const value = record[column] ?? "";
  if (value !== "" && value !== "1") throw new Error(`${record["名称"]} の「${column}」が 1 でも空でもない（${value}）`);
  return value === "1";
}

function capacityOf(record: CsvRecord): Pick<EvacuationRow["attributes"], "capacity" | "capacity_note"> {
  const text = present(record["想定収容人数"]);
  if (text === undefined) return {};
  const match = /^(\d+)人(?:（(.+)）)?$/.exec(text);
  if (!match) throw new Error(`${record["名称"]} の想定収容人数が読めない（${text}）`);
  return match[2] ? { capacity: Number(match[1]), capacity_note: match[2] } : { capacity: Number(match[1]) };
}

function coordinates(record: CsvRecord): { lat: number; lon: number } | null {
  const lat = present(record["緯度"]);
  const lon = present(record["経度"]);
  if (lat === undefined && lon === undefined) return null;
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon))) throw new Error(`${record["名称"]} の緯度経度が読めない`);
  return { lat: Number(lat), lon: Number(lon) };
}

// CSV を避難場所の行にする。町字が空の行は緯度経度から町名を引く（coordinateTowns。逆ジオコーダの結果をためたもの）。
// まだ町名にしていない位置は missingCoordinates に、対応表にない町名は unmappedTowns に入れる（呼び出し側で引くか止める）
export function buildEvacuationRows(
  csvText: string,
  resolveTown: (address: string) => TownMapEntry | null,
  coordinateTowns: ReadonlyMap<string, { townName: string }>,
): { rows: EvacuationRow[]; unmappedTowns: string[]; missingCoordinates: string[]; skipped: number } {
  const groups = new Map<string, CsvRecord[]>();
  let skipped = 0;
  for (const record of parseCsv(csvText)) {
    // 末尾に中身のない行がある
    if (!present(record["ID"])) {
      skipped += 1;
      continue;
    }
    if (record["所在地_全国地方公共団体コード"] !== IIDA_LG_CODE) throw new Error(`${record["名称"]} が飯田市の避難場所になっていない`);
    // 同じ場所が別の ID で2回載っていることがある（並木通り）
    const key = [record["名称"], record["所在地_連結表記"], record["緯度"], record["経度"]].join("|");
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }

  const rows: EvacuationRow[] = [];
  const unmappedTowns = new Set<string>();
  const missingCoordinates = new Set<string>();
  for (const records of groups.values()) {
    const [first] = records;
    const point = coordinates(first);
    let town = present(first["所在地_町字"]);
    if (town === undefined) {
      if (point === null) throw new Error(`${first["名称"]} は町字も緯度経度もなく、地区を決められない`);
      const key = coordinateKey(point.lat, point.lon);
      town = coordinateTowns.get(key)?.townName;
      if (town === undefined) {
        missingCoordinates.add(key);
        continue;
      }
    }
    const entry = resolveTown(town);
    if (entry === null) {
      unmappedTowns.add(townNameForRecord(town));
      continue;
    }

    rows.push({
      kind: "evacuation_site",
      subkind: SUBKIND,
      name: first["名称"].trim(),
      address: first["所在地_連結表記"],
      townName: townNameForRecord(town),
      districtId: entry.districtId,
      lat: point?.lat ?? null,
      lon: point?.lon ?? null,
      sourceKey: first["ID"],
      attributes: {
        ids: records.map((record) => record["ID"]),
        hazards: (Object.keys(HAZARD_COLUMNS) as Hazard[]).filter((hazard) => flag(first, HAZARD_COLUMNS[hazard])),
        also_shelter: flag(first, "指定避難所との重複"),
        ...capacityOf(first),
      },
    });
  }
  return { rows, unmappedTowns: [...unmappedTowns], missingCoordinates: [...missingCoordinates], skipped };
}

export function buildEvacuationCreditText(usedOn: string): string {
  return buildCityCreditText(EVACUATION_DATASET_NAME, usedOn, "同じ場所の行をまとめた");
}

export type EvacuationSqlInput = Pick<CityFacilitiesSqlInput<EvacuationRow>, "rows" | "csvUrl" | "updatedOn" | "usedOn">;

export function buildEvacuationSql(input: EvacuationSqlInput): string {
  return buildCityFacilitiesSql({
    sourceId: EVACUATION_SOURCE_ID,
    datasetName: EVACUATION_DATASET_NAME,
    noun: "避難場所",
    command: "evacuation:sql",
    creditText: buildEvacuationCreditText(input.usedOn),
    kindOf: (row) => row.kind,
    ...input,
  });
}
