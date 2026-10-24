// 飯田市オープンデータ「子育て施設」の取り込み（009・008 の補完）。npm run childcare:sql から使う。
// 4地区の保育施設・放課後児童クラブなどを facilities に入れる。画面にはこちらを出し、
// 不動産情報ライブラリの XKT007（008）は公開せず、市のデータの抜けを確かめるのに使う（2026-10-24 まさゆきさんと決定）
import { parseCsv, type CsvRecord } from "../gtfs/csv.ts";
import { sqlJson, sqlLiteral } from "../sql.ts";
import { townNameForRecord, type DistrictId, type TownMapEntry } from "../town-district/resolve.ts";

export const CHILDCARE_SOURCE_ID = "iida_childcare";
export const CHILDCARE_DATASET_NAME = "子育て施設";
export const OPEN_DATA_PAGE_URL = "https://www.city.iida.lg.jp/soshiki/168/opendata.html";
export const PDL_URL = "https://www.digital.go.jp/resources/open_data/public_data_license_v1.0";
// 全国地方公共団体コード（検査数字付き）
const IIDA_LG_CODE = "202053";
// 小学生の放課後の預け先。保育施設と数を混ぜないよう、施設の種類を分ける
const AFTER_SCHOOL_CLUB = "放課後児童クラブ";

// オープンデータのページの表から、データ名の行の CSV の URL と更新日を探す。
// CSV は更新のたびに別の URL（/uploaded/attachment/番号.csv）になるので、毎回ページから探す
export function findOpenDataset(html: string, datasetName: string, pageUrl: string): { csvUrl: string; updatedOn: string | null } {
  for (const row of html.match(/<tr[\s\S]*?<\/tr>/g) ?? []) {
    const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((cell) =>
      cell[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim(),
    );
    if (!cells.includes(datasetName)) continue;
    const href = /href="([^"]+\.csv)"/.exec(row)?.[1];
    if (!href) throw new Error(`「${datasetName}」の行に CSV のリンクがない`);
    const date = cells.map((cell) => /^(\d{4})年(\d{1,2})月(\d{1,2})日$/.exec(cell)).find((match) => match !== null);
    const updatedOn = date ? `${date[1]}-${date[2].padStart(2, "0")}-${date[3].padStart(2, "0")}` : null;
    return { csvUrl: new URL(href, pageUrl).toString(), updatedOn };
  }
  throw new Error(`オープンデータのページに「${datasetName}」の行がない`);
}

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
  districtId: DistrictId;
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

// CSV を4地区の行にする。対応表にない町名は unmappedTowns に入れる（呼び出し側で止める）
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
    if (entry.districtId === null) continue;

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

function japaneseDate(isoDateText: string): string {
  const [year, month, day] = isoDateText.split("-").map(Number);
  return `${year}年${month}月${day}日`;
}

// 市の「PDL1.0に関する重要情報」の記載例どおり：出典（ページ・PDL1.0・利用日）と、加工したこと・その主体
export function buildChildcareCreditText(usedOn: string): string {
  return (
    `出典：飯田市（${OPEN_DATA_PAGE_URL}）、PDL1.0（${PDL_URL}）（${japaneseDate(usedOn)}に利用）。` +
    `「${CHILDCARE_DATASET_NAME}」（飯田市）（${OPEN_DATA_PAGE_URL}）を加工して作成（4地区の施設を抜き出し、同じ場所の行をまとめた）`
  );
}

export type ChildcareSqlInput = {
  rows: readonly ChildcareRow[];
  csvUrl: string;
  // 市のページに書かれた更新日。書かれていなければ null
  updatedOn: string | null;
  // 取り込んだ日（YYYY-MM-DD）
  usedOn: string;
};

// 子育て施設と出典を、この取り込みの中身にそろえる SQL。何度当てても同じ結果になる
export function buildChildcareSql({ rows, csvUrl, updatedOn, usedOn }: ChildcareSqlInput): string {
  // 空のまま当てると今ある施設を消してしまうので止める
  if (rows.length === 0) throw new Error("4地区の子育て施設が0件で、SQL を作れない");
  const source = sqlLiteral(CHILDCARE_SOURCE_ID);
  const values = rows
    .map((row) =>
      [
        `'${row.kind}'::public.facility_kind`,
        sqlLiteral(row.subkind),
        sqlLiteral(row.name),
        sqlLiteral(row.address),
        sqlLiteral(row.townName),
        sqlLiteral(row.districtId),
        String(row.lat),
        String(row.lon),
        source,
        sqlLiteral(row.sourceKey),
        sqlJson(row.attributes),
      ].join(", "),
    )
    .map((tuple) => `  (${tuple})`)
    .join(",\n");

  return `-- 009 飯田市オープンデータ「${CHILDCARE_DATASET_NAME}」の4地区の施設を、市の CSV にそろえる。
-- このファイルは npm run childcare:sql で作る。手で編集しない（手順は docs/009_ingest-city-opendata.md）
-- CSV：${csvUrl}

update public.data_sources set
  credit_text = ${sqlLiteral(buildChildcareCreditText(usedOn))},
  period_label = ${sqlLiteral(updatedOn ? `${japaneseDate(updatedOn)}更新` : "更新日の記載なし")},
  checked_on = ${sqlLiteral(usedOn)}::date
where id = ${source};

delete from public.facilities where source_id = ${source};
insert into public.facilities (kind, subkind, name, address, town_name, district_id, latitude, longitude, source_id, source_key, attributes) values
${values};
`;
}
