// 飯田市オープンデータ「教育機関一覧」の取り込み（009・008）。npm run education:sql から使う。
// 市全体の学校を facilities に入れる（4地区の外は地区なし）。画面にはこちらを出し、
// 不動産情報ライブラリの XKT006（008）は公開せず、市のデータの抜けを確かめるのに使う。
// 学区（school_districts）は、学区の学校コードをここで入れた学校に当てて地区を決める（2026-10-24 まさゆきさんと決定）
import { parseCsv } from "../gtfs/csv.ts";
import { townNameForRecord, type DistrictId, type TownMapEntry } from "../town-district/resolve.ts";
import { buildCityCreditText, buildCityFacilitiesSql, type CityFacilitiesSqlInput } from "./open-data.ts";

export const EDUCATION_SOURCE_ID = "iida_education";
export const EDUCATION_DATASET_NAME = "教育機関一覧";

// 文部科学省の学校コードの学校種。幼保連携型認定こども園（A2）は「子育て施設」に入っているので、学校には入れない
export const SCHOOL_TYPES: Readonly<Record<string, string | null>> = {
  A1: "幼稚園",
  A2: null,
  B1: "小学校",
  B2: "義務教育学校",
  C1: "中学校",
  D1: "高等学校",
  E1: "特別支援学校",
  F1: "大学",
  F2: "短期大学",
  G1: "高等専門学校",
  H1: "専修学校",
  H2: "各種学校",
};

const ESTABLISHMENTS: Readonly<Record<string, string>> = { "1": "国立", "2": "公立", "3": "私立" };

export type SchoolRow = {
  subkind: string;
  name: string;
  address: string;
  townName: string;
  // 4地区の外は null
  districtId: DistrictId | null;
  lat: number;
  lon: number;
  sourceKey: string;
  attributes: { school_code: string; school_type_code: string; establishment?: string; branch?: string };
};

function coordinate(value: string | undefined, label: string): number {
  const number = Number(value);
  if (!value || !Number.isFinite(number)) throw new Error(`${label} の緯度経度が読めない`);
  return number;
}

// CSV を学校の行にする。対応表にない町名は unmappedTowns に入れる（呼び出し側で止める）。廃止された学校は入れない
export function buildSchoolRows(
  csvText: string,
  resolveTown: (address: string) => TownMapEntry | null,
): { rows: SchoolRow[]; unmappedTowns: string[]; abolished: string[] } {
  const rows: SchoolRow[] = [];
  const unmappedTowns = new Set<string>();
  const abolished: string[] = [];
  for (const record of parseCsv(csvText)) {
    const code = record["教育機関_学校コード"]?.trim() ?? "";
    if (code === "") continue;
    const name = record["教育機関_学校名"].trim();
    const typeCode = record["教育機関_学校種"];
    if (!(typeCode in SCHOOL_TYPES)) throw new Error(`${name} の学校種（${typeCode}）がわからない`);
    const subkind = SCHOOL_TYPES[typeCode];
    if (subkind === null) continue;
    if (record["教育機関_学校所在地（市区町村）"] !== "飯田市") throw new Error(`${name} が飯田市の学校になっていない`);
    if (record["教育機関_属性情報廃止年月日"]?.trim()) {
      abolished.push(name);
      continue;
    }

    const town = record["教育機関_学校所在地（町字）"];
    const entry = resolveTown(town);
    if (entry === null) {
      unmappedTowns.add(townNameForRecord(town));
      continue;
    }
    const establishment = ESTABLISHMENTS[record["教育機関_設置区分"]];
    const branch = record["教育機関_本分校"] === "2" ? "分校" : undefined;
    rows.push({
      subkind,
      name,
      address: `長野県飯田市${town}${record["教育機関_学校所在地（番地以下）"]}`,
      townName: townNameForRecord(town),
      districtId: entry.districtId,
      lat: coordinate(record["教育機関_緯度"], name),
      lon: coordinate(record["教育機関_経度"], name),
      sourceKey: code,
      attributes: {
        school_code: code,
        school_type_code: typeCode,
        ...(establishment ? { establishment } : {}),
        ...(branch ? { branch } : {}),
      },
    });
  }
  return { rows, unmappedTowns: [...unmappedTowns], abolished };
}

export function buildEducationCreditText(usedOn: string): string {
  return buildCityCreditText(EDUCATION_DATASET_NAME, usedOn, "幼保連携型認定こども園を除いた");
}

export type EducationSqlInput = Pick<CityFacilitiesSqlInput<SchoolRow>, "rows" | "csvUrl" | "updatedOn" | "usedOn">;

export function buildEducationSql(input: EducationSqlInput): string {
  return buildCityFacilitiesSql({
    sourceId: EDUCATION_SOURCE_ID,
    datasetName: EDUCATION_DATASET_NAME,
    noun: "学校",
    command: "education:sql",
    creditText: buildEducationCreditText(input.usedOn),
    kindOf: () => "school",
    ...input,
  });
}
