// e-Stat「国勢調査 小地域集計（町丁・字等別）」の年齢別人口を、4地区ごとに合計する（011）。npm run population:sql から使う。
// 市のデータに地区別の人口がないため、町丁・字等の人口を町名→地区の対応表で地区に振り分けて足す
import { smallAreaDownloadUrl, sumByDistrict, type DistrictSum } from "../census/small-area.ts";
import { sqlLiteral } from "../sql.ts";
import type { TownMapEntry } from "../town-district/resolve.ts";

// 新しい国勢調査の小地域集計が出たら、この3つを差しかえる（手順は docs/011_population.md）
export const CENSUS_NAME = "令和2年国勢調査 小地域集計";
// 「年齢（5歳階級、4区分）別、男女別人口」の表。長野県（都道府県コード 20）の分を取る
export const CENSUS_DOWNLOAD_URL = smallAreaDownloadUrl("T001082");
export const CENSUS_AS_OF = "2020-10-01";

export const CENSUS_SOURCE_ID = "estat_census_small_area";

// 2行目（項目名）で列を探す。表の作りが変わったら黙って別の列を読まないよう止める
const COLUMN_LABELS = {
  total: "総数、年齢「不詳」含む",
  age0to14: "総数１５歳未満",
  age15to64: "総数１５～６４歳",
  age65plus: "総数６５歳以上",
} as const;

export type DistrictPopulation = DistrictSum<keyof typeof COLUMN_LABELS>;

// 町丁・字等の人口を4地区ごとに合計する（合計のしかたは @/lib/census/small-area）
export function buildDistrictPopulations(
  csvText: string,
  townMap: readonly TownMapEntry[],
): { populations: DistrictPopulation[]; unmappedTowns: string[]; skippedTowns: string[] } {
  const { sums, unmappedTowns, skippedTowns } = sumByDistrict(csvText, townMap, COLUMN_LABELS);
  return { populations: sums, unmappedTowns, skippedTowns };
}

// 政府標準利用規約（第2.0版）の出典の書き方：出典と、加工したこと
export function buildCensusCreditText(): string {
  return `出典：「${CENSUS_NAME}」（総務省統計局）（政府統計の総合窓口（e-Stat） https://www.e-stat.go.jp/）を加工して作成（町丁・字等の人口を地区ごとに合計）`;
}

export function buildCensusPeriodLabel(): string {
  const [year, month, day] = CENSUS_AS_OF.split("-").map(Number);
  return `${year}年${month}月${day}日現在（${CENSUS_NAME.split(" ")[0]}）`;
}

// 出典と4地区の人口を、この取り込みの中身にそろえる SQL。何度当てても同じ結果になる
export function buildPopulationSql(populations: readonly DistrictPopulation[], checkedOn: string): string {
  const source = sqlLiteral(CENSUS_SOURCE_ID);
  const townLines = populations.map((p) => `--   ${p.districtId}：${p.towns.join("、")}`).join("\n");
  const values = populations
    .map((p) =>
      [sqlLiteral(p.districtId), `${sqlLiteral(CENSUS_AS_OF)}::date`, p.total, p.age0to14, p.age15to64, p.age65plus, source].join(", "),
    )
    .map((tuple) => `  (${tuple})`)
    .join(",\n");

  return `-- 011 e-Stat「${CENSUS_NAME}」の年齢別人口を、4地区ごとに合計して入れる。
-- このファイルは npm run population:sql で作る。手で編集しない（手順は docs/011_population.md）
-- 表：${CENSUS_DOWNLOAD_URL}
-- 合計した町丁・字等：
${townLines}

update public.data_sources set
  credit_text = ${sqlLiteral(buildCensusCreditText())},
  period_label = ${sqlLiteral(buildCensusPeriodLabel())},
  checked_on = ${sqlLiteral(checkedOn)}::date
where id = ${source};

delete from public.population where source_id = ${source};
insert into public.population (district_id, as_of, total, age_0_14, age_15_64, age_65_plus, source_id) values
${values};
`;
}
