// 飯田市オープンデータ「子育て施設」の取り込み（009・008 の補完）。npm run childcare:sql から使う。
// 市全体の保育施設・放課後児童クラブなどを facilities に入れる（4地区の外は地区なし）。画面にはこちらを出し、
// 不動産情報ライブラリの XKT007（008）は公開せず、市のデータの抜けを確かめるのに使う（2026-10-24 まさゆきさんと決定）
import { parseCsv, type CsvRecord } from "../gtfs/csv.ts";
import { townNameForRecord, type DistrictId, type TownMapEntry } from "../town-district/resolve.ts";
import { IIDA_LG_CODE, buildCityCreditText, buildCityFacilitiesSql, type CityFacilitiesSqlInput } from "./open-data.ts";

export const CHILDCARE_SOURCE_ID = "iida_childcare";
export const CHILDCARE_DATASET_NAME = "子育て施設";
// 小学生の放課後の預け先。保育施設と数を混ぜないよう、施設の種類を分ける
const AFTER_SCHOOL_CLUB = "放課後児童クラブ";

// 同じ場所・同じ名前で、受け入れる年齢や時間ごとに行が分かれていることがある（例：自然保育のっぱらの2歳と3〜5歳）
export type ChildcareProgram = {
  ages?: string;
  capacity?: number;
  days?: string;
  opens?: string;
  closes?: string;
  note?: string;
};

export type ChildcareRow = {
  kind: "childcare" | "after_school_club";
  subkind: string;
  name: string;
  address: string;
  townName: string;
  // 4地区の外は null
  districtId: DistrictId | null;
  lat: number;
  lon: number;
  sourceKey: string;
  attributes: {
    ids: string[];
    operator?: string;
    temporary_care?: string;
    sick_child_care?: string;
    programs: ChildcareProgram[];
  };
};

function present(value: string | undefined): string | undefined {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? undefined : trimmed;
}

function programOf(record: CsvRecord): ChildcareProgram {
  const capacity = present(record["収容定員"]);
  const program: ChildcareProgram = {
    ages: present(record["受入年齢"]),
    capacity: capacity !== undefined && /^\d+$/.test(capacity) ? Number(capacity) : undefined,
    days: present(record["利用可能曜日"]),
    opens: present(record["開始時間"]),
    closes: present(record["終了時間"]),
    note: present(record["利用可能日時特記事項"]),
  };
  return Object.fromEntries(Object.entries(program).filter(([, value]) => value !== undefined));
}

function coordinate(value: string | undefined, label: string): number {
  const number = Number(value);
  if (!value || !Number.isFinite(number)) throw new Error(`${label} の緯度経度が読めない`);
  return number;
}

// CSV を施設の行にする。対応表にない町名は unmappedTowns に入れる（呼び出し側で止める）
export function buildChildcareRows(
  csvText: string,
  resolveTown: (address: string) => TownMapEntry | null,
): { rows: ChildcareRow[]; unmappedTowns: string[]; skipped: number } {
  const groups = new Map<string, CsvRecord[]>();
  let skipped = 0;
  for (const record of parseCsv(csvText)) {
    // 末尾に中身のない行がある
    if (!present(record["ID"])) {
      skipped += 1;
      continue;
    }
    if (record["所在地_全国地方公共団体コード"] !== IIDA_LG_CODE) throw new Error(`${record["名称"]} が飯田市の施設になっていない`);
    const key = `${record["名称"]}|${record["所在地_連結表記"]}`;
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }

  const rows: ChildcareRow[] = [];
  const unmappedTowns = new Set<string>();
  for (const records of groups.values()) {
    const [first] = records;
    const town = first["所在地_町字"];
    const entry = resolveTown(town);
    if (entry === null) {
      unmappedTowns.add(townNameForRecord(town));
      continue;
    }

    const kinds = new Set(records.map((record) => record["種別"]));
    if (kinds.size > 1) throw new Error(`${first["名称"]} の行ごとに種別が違う（${[...kinds].join("、")}）`);
    const subkind = present(first["種別"]);
    if (!subkind) throw new Error(`${first["名称"]} の種別が空`);
    rows.push({
      kind: subkind === AFTER_SCHOOL_CLUB ? "after_school_club" : "childcare",
      subkind,
      name: first["名称"].trim(),
      // 連結表記には建物名（方書）まで入っている
      address: first["所在地_連結表記"],
      townName: townNameForRecord(town),
      districtId: entry.districtId,
      lat: coordinate(first["緯度"], first["名称"]),
      lon: coordinate(first["経度"], first["名称"]),
      sourceKey: first["ID"],
      attributes: Object.fromEntries(
        Object.entries({
          ids: records.map((record) => record["ID"]),
          operator: present(first["団体名"]),
          temporary_care: present(first["一時預かりの有無"]),
          sick_child_care: present(first["病児保育の有無"]),
          programs: records.map(programOf).filter((program) => Object.keys(program).length > 0),
        }).filter(([, value]) => value !== undefined),
      ) as ChildcareRow["attributes"],
    });
  }
  return { rows, unmappedTowns: [...unmappedTowns], skipped };
}

export function buildChildcareCreditText(usedOn: string): string {
  return buildCityCreditText(CHILDCARE_DATASET_NAME, usedOn, "同じ場所の行をまとめた");
}

export type ChildcareSqlInput = Pick<CityFacilitiesSqlInput<ChildcareRow>, "rows" | "csvUrl" | "updatedOn" | "usedOn">;

export function buildChildcareSql(input: ChildcareSqlInput): string {
  return buildCityFacilitiesSql({
    sourceId: CHILDCARE_SOURCE_ID,
    datasetName: CHILDCARE_DATASET_NAME,
    noun: "施設",
    command: "childcare:sql",
    creditText: buildChildcareCreditText(input.usedOn),
    kindOf: (row) => row.kind,
    ...input,
  });
}
