// 飯田市オープンデータ（PDL1.0）の取り込みで共通に使うもの（009）。npm run childcare:sql・education:sql から使う
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
