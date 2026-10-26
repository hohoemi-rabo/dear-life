// e-Stat「国勢調査 小地域集計（町丁・字等別）」の年齢別人口を、4地区ごとに合計する（011）。npm run population:sql から使う。
// 市のデータに地区別の人口がないため、町丁・字等の人口を町名→地区の対応表で地区に振り分けて足す
import { sqlLiteral } from "../sql.ts";
import { createTownResolver, type DistrictId, type TownMapEntry } from "../town-district/resolve.ts";

// 新しい国勢調査の小地域集計が出たら、この3つを差しかえる（手順は docs/011_population.md）
export const CENSUS_NAME = "令和2年国勢調査 小地域集計";
// 「年齢（5歳階級、4区分）別、男女別人口」の表。長野県（都道府県コード 20）の分を取る
export const CENSUS_DOWNLOAD_URL = "https://www.e-stat.go.jp/gis/statmap-search/data?statsId=T001082&code=20&downloadType=2";
export const CENSUS_AS_OF = "2020-10-01";

export const CENSUS_SOURCE_ID = "estat_census_small_area";
const IIDA_CITY_CODE = "20205";
const DISTRICT_IDS: readonly DistrictId[] = ["kamisato", "kanae", "igara", "chushin"];

// 2行目（項目名）で列を探す。表の作りが変わったら黙って別の列を読まないよう止める
const COLUMN_LABELS = {
  total: "総数、年齢「不詳」含む",
  age0to14: "総数１５歳未満",
  age15to64: "総数１５～６４歳",
  age65plus: "総数６５歳以上",
} as const;
type Measure = keyof typeof COLUMN_LABELS;

// HYOSYO（表章単位）：1 市区町村、2 町丁・字等（下の区分なし）、3 町丁・字等（下に区分あり）、4 その下の区分（丁目など）。
// 2 と 3 だけを足せば、市の中の人口を重ならずに数えられる
const TOWN_LEVELS = new Set(["2", "3"]);
// HTKSYORI（秘匿処理）：2 は人数が少ないため数字を伏せ、HTKSAKI の町丁に合算した行
const HIDDEN = "2";

export type DistrictPopulation = Record<Measure, number> & {
  districtId: DistrictId;
  // 合計した町丁・字等の名前（SQL のコメントに残す）
  towns: string[];
};

type CensusRow = {
  keyCode: string;
  level: string;
  name: string;
  hiddenInto: string[];
  // 伏せられた行は null
  values: Record<Measure, number> | null;
};

// "-" は0人、"X" は伏せられた値
function parseCount(text: string, keyCode: string): number | null {
  if (text === "-") return 0;
  if (text === "X") return null;
  if (!/^\d+$/.test(text)) throw new Error(`${keyCode} の人数が読めない（${text}）`);
  return Number(text);
}

// e-Stat の CSV（Shift_JIS を文字列にしたもの）から飯田市の行を読む。1行目は列の記号、2行目は項目名
function parseCensusCsv(csvText: string): CensusRow[] {
  const lines = csvText.replace(/^﻿/, "").split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.some((line) => line.includes('"'))) throw new Error("引用符には対応していない");
  const [codes, labels, ...body] = lines.map((line) => line.split(","));
  if (codes?.[0] !== "KEY_CODE" || codes[3] !== "NAME" || codes[4] !== "HTKSYORI" || codes[5] !== "HTKSAKI") {
    throw new Error(`小地域集計の CSV の見出しではない：${codes?.slice(0, 7).join(",")}`);
  }
  const indexOf = Object.fromEntries(
    Object.entries(COLUMN_LABELS).map(([measure, label]) => {
      const index = labels.indexOf(label);
      if (index < 0) throw new Error(`項目「${label}」の列がない`);
      return [measure, index];
    }),
  ) as Record<Measure, number>;

  return body
    .filter((cells) => cells[0].startsWith(IIDA_CITY_CODE))
    .map((cells) => {
      const [keyCode, level, , name, hidden, hiddenInto] = cells;
      const counts = Object.fromEntries(
        Object.entries(indexOf).map(([measure, index]) => [measure, parseCount(cells[index], keyCode)]),
      ) as Record<Measure, number | null>;
      const isHidden = hidden === HIDDEN;
      if (isHidden !== Object.values(counts).every((count) => count === null)) {
        throw new Error(`${keyCode}（${name}）の秘匿処理と人数の伏せ方が合わない`);
      }
      return {
        keyCode,
        level,
        name,
        // 合算先は市区町村コードを除いた番号で、「314001;3150」のように複数のことがある
        hiddenInto: isHidden ? hiddenInto.split(";").map((code) => IIDA_CITY_CODE + code) : [],
        values: isHidden ? null : (counts as Record<Measure, number>),
      };
    });
}

// 町丁・字等の行（HYOSYO 2・3）の番号は9桁。その下の区分（11桁）は先頭9桁が属する町丁・字等
function townCodeOf(keyCode: string): string {
  return keyCode.slice(0, 9);
}

// 国勢調査の小地域集計を4地区ごとに合計する。
// 国勢調査は「上郷」「伊賀良」「南信濃」などを地区名のまま1つの町丁・字等にしている（中の区分も対応表の町名と分け方が違う）ので、
// 対応表の町名に当たらず、地区名と同じ名前のものはその地区に入れる。
// 人がいるのに地区を決められない町丁・字等は unmappedTowns に入れる（呼び出し側で止める）
export function buildDistrictPopulations(
  csvText: string,
  townMap: readonly TownMapEntry[],
): { populations: DistrictPopulation[]; unmappedTowns: string[]; skippedTowns: string[] } {
  const resolveTown = createTownResolver(townMap);
  const districtByName = new Map(townMap.map((entry) => [entry.cityDistrict, entry.districtId]));
  const rows = parseCensusCsv(csvText);
  if (!rows.some((row) => row.level === "1")) throw new Error("飯田市の行がない");

  // 町丁・字等の番号 → 地区（4地区の外は null、決められないものは undefined）
  const towns = rows.filter((row) => TOWN_LEVELS.has(row.level));
  const districtOfTown = new Map<string, DistrictId | null | undefined>(
    towns.map((row) => {
      const entry = resolveTown(row.name);
      return [row.keyCode, entry ? entry.districtId : districtByName.get(row.name)];
    }),
  );

  // 伏せられた人数は合算先の町丁・字等に入っている。合算先が別の地区だと地区の人数がずれるので止める
  // （地区を決められない町丁・字等は4地区の外として比べる）
  for (const row of rows.filter((row) => row.values === null)) {
    const from = districtOfTown.get(townCodeOf(row.keyCode)) ?? null;
    for (const code of row.hiddenInto) {
      const into = districtOfTown.get(townCodeOf(code)) ?? null;
      if (from !== into) {
        throw new Error(`${row.keyCode}（${row.name}）の人数が、別の地区の ${code} に合算されている`);
      }
    }
  }

  const sums = new Map<DistrictId, DistrictPopulation>();
  const unmappedTowns: string[] = [];
  const skippedTowns: string[] = [];
  for (const row of towns) {
    const districtId = districtOfTown.get(row.keyCode);
    if (districtId === undefined) {
      // 0人の町丁・字等と、別の町丁・字等に合算された町丁・字等は、地区を決めなくても人数に影響しない
      if (row.values === null || row.values.total === 0) skippedTowns.push(row.name);
      else unmappedTowns.push(row.name);
      continue;
    }
    if (districtId === null || row.values === null) continue;
    const sum = sums.get(districtId) ?? { districtId, total: 0, age0to14: 0, age15to64: 0, age65plus: 0, towns: [] };
    for (const measure of Object.keys(COLUMN_LABELS) as Measure[]) sum[measure] += row.values[measure];
    sum.towns.push(row.name);
    sums.set(districtId, sum);
  }

  const populations = DISTRICT_IDS.map((districtId) => {
    const sum = sums.get(districtId);
    if (sum === undefined) throw new Error(`${districtId} の町丁・字等が1つもない`);
    return sum;
  });
  return { populations, unmappedTowns, skippedTowns };
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
