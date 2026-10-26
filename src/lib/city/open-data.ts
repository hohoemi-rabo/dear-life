// 飯田市オープンデータ（PDL1.0）の取り込みで共通に使うもの（009）。npm run childcare:sql・education:sql・evacuation:sql・public-facilities:sql から使う
import { sqlJson, sqlLiteral } from "../sql.ts";
export const OPEN_DATA_PAGE_URL = "https://www.city.iida.lg.jp/soshiki/168/opendata.html";
export const PDL_URL = "https://www.digital.go.jp/resources/open_data/public_data_license_v1.0";
// 全国地方公共団体コード（検査数字付き）
export const IIDA_LG_CODE = "202053";

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

export function japaneseDate(isoDateText: string): string {
  const [year, month, day] = isoDateText.split("-").map(Number);
  return `${year}年${month}月${day}日`;
}

// 市の「PDL1.0に関する重要情報」の記載例どおり：出典（ページ・PDL1.0・利用日）と、加工したこと・その主体
export function buildCityCreditText(datasetName: string, usedOn: string, howEdited: string): string {
  return (
    `出典：飯田市（${OPEN_DATA_PAGE_URL}）、PDL1.0（${PDL_URL}）（${japaneseDate(usedOn)}に利用）。` +
    `「${datasetName}」（飯田市）（${OPEN_DATA_PAGE_URL}）を加工して作成（${howEdited}）`
  );
}

export function buildPeriodLabel(updatedOn: string | null): string {
  return updatedOn ? `${japaneseDate(updatedOn)}更新` : "更新日の記載なし";
}

// 市のデータから facilities に入れる1か所。緯度経度がない場所は null（地図には出さず、一覧にだけ出す）
export type CityFacilityRow = {
  subkind: string;
  name: string;
  address: string | null;
  townName: string;
  // 4地区の外は null
  districtId: string | null;
  lat: number | null;
  lon: number | null;
  sourceKey: string;
  attributes: unknown;
};

export type CityFacilitiesSqlInput<Row extends CityFacilityRow> = {
  sourceId: string;
  datasetName: string;
  // SQL の見出しとエラーで使う呼び名（「学校」「避難場所」など）
  noun: string;
  // このファイルを作る npm run のコマンド名
  command: string;
  creditText: string;
  // public.facility_kind の値
  kindOf: (row: Row) => string;
  rows: readonly Row[];
  csvUrl: string;
  // 市のページに書かれた更新日。書かれていなければ null
  updatedOn: string | null;
  // 取り込んだ日（YYYY-MM-DD）
  usedOn: string;
};

// 出典と、その出典の施設を、この取り込みの中身にそろえる SQL。何度当てても同じ結果になる
export function buildCityFacilitiesSql<Row extends CityFacilityRow>(input: CityFacilitiesSqlInput<Row>): string {
  const { sourceId, datasetName, noun, command, creditText, kindOf, rows, csvUrl, updatedOn, usedOn } = input;
  // 空のまま当てると今ある施設を消してしまうので止める
  if (rows.length === 0) throw new Error(`${noun}が0件で、SQL を作れない`);
  const source = sqlLiteral(sourceId);
  const values = rows
    .map((row) =>
      [
        `'${kindOf(row)}'::public.facility_kind`,
        sqlLiteral(row.subkind),
        sqlLiteral(row.name),
        sqlLiteral(row.address),
        sqlLiteral(row.townName),
        sqlLiteral(row.districtId),
        row.lat === null ? "null" : String(row.lat),
        row.lon === null ? "null" : String(row.lon),
        source,
        sqlLiteral(row.sourceKey),
        sqlJson(row.attributes),
      ].join(", "),
    )
    .map((tuple) => `  (${tuple})`)
    .join(",\n");

  return `-- 009 飯田市オープンデータ「${datasetName}」の${noun}を、市の CSV にそろえる。
-- このファイルは npm run ${command} で作る。手で編集しない（手順は docs/009_ingest-city-opendata.md）
-- CSV：${csvUrl}

update public.data_sources set
  credit_text = ${sqlLiteral(creditText)},
  period_label = ${sqlLiteral(buildPeriodLabel(updatedOn))},
  checked_on = ${sqlLiteral(usedOn)}::date
where id = ${source};

delete from public.facilities where source_id = ${source};
insert into public.facilities (kind, subkind, name, address, town_name, district_id, latitude, longitude, source_id, source_key, attributes) values
${values};
`;
}
