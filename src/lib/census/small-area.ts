// e-Stat「国勢調査 小地域集計（町丁・字等別）」の CSV を読み、町丁・字等の数を4地区ごとに合計する。
// 人口（011）と、住宅の所有の関係別の世帯数（034）で使う。表ごとの違いは、読む列（項目名）だけ
import { createTownResolver, type DistrictId, type TownMapEntry } from "../town-district/resolve.ts";

// 統計GISの「統計データダウンロード」で、長野県（都道府県コード 20）の表を取る URL
export function smallAreaDownloadUrl(statsId: string): string {
  return `https://www.e-stat.go.jp/gis/statmap-search/data?statsId=${statsId}&code=20&downloadType=2`;
}

const IIDA_CITY_CODE = "20205";
const DISTRICT_IDS: readonly DistrictId[] = ["kamisato", "kanae", "igara", "chushin"];

// HYOSYO（表章単位）：1 市区町村、2 町丁・字等（下の区分なし）、3 町丁・字等（下に区分あり）、4 その下の区分（丁目など）。
// 2 と 3 だけを足せば、市の中の数を重ならずに数えられる
const TOWN_LEVELS = new Set(["2", "3"]);
// HTKSYORI（秘匿処理）：2 は数が少ないため値を伏せ、HTKSAKI の町丁に合算した行
const HIDDEN = "2";

export type DistrictSum<M extends string> = Record<M, number> & {
  districtId: DistrictId;
  // 合計した町丁・字等の名前（SQL のコメントに残す）
  towns: string[];
};

type CensusRow<M extends string> = {
  keyCode: string;
  level: string;
  name: string;
  hiddenInto: string[];
  // 伏せられた行は null
  values: Record<M, number> | null;
};

// "-" は0、"X" は伏せられた値
function parseCount(text: string, keyCode: string): number | null {
  if (text === "-") return 0;
  if (text === "X") return null;
  if (!/^\d+$/.test(text)) throw new Error(`${keyCode} の数が読めない（${text}）`);
  return Number(text);
}

// e-Stat の CSV（Shift_JIS を文字列にしたもの）から飯田市の行を読む。1行目は列の記号、2行目は項目名。
// 項目名で列を探すので、表の作りが変わったら黙って別の列を読まずに止まる
function parseCensusCsv<M extends string>(csvText: string, columnLabels: Readonly<Record<M, string>>): CensusRow<M>[] {
  const lines = csvText.replace(/^﻿/, "").split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.some((line) => line.includes('"'))) throw new Error("引用符には対応していない");
  const [codes, labels, ...body] = lines.map((line) => line.split(","));
  if (codes?.[0] !== "KEY_CODE" || codes[3] !== "NAME" || codes[4] !== "HTKSYORI" || codes[5] !== "HTKSAKI") {
    throw new Error(`小地域集計の CSV の見出しではない：${codes?.slice(0, 7).join(",")}`);
  }
  const measures = Object.keys(columnLabels) as M[];
  const indexOf = Object.fromEntries(
    measures.map((measure) => {
      const index = labels.indexOf(columnLabels[measure]);
      if (index < 0) throw new Error(`項目「${columnLabels[measure]}」の列がない`);
      return [measure, index];
    }),
  ) as Record<M, number>;

  return body
    .filter((cells) => cells[0].startsWith(IIDA_CITY_CODE))
    .map((cells) => {
      const [keyCode, level, , name, hidden, hiddenInto] = cells;
      const counts = Object.fromEntries(
        measures.map((measure) => [measure, parseCount(cells[indexOf[measure]], keyCode)]),
      ) as Record<M, number | null>;
      const isHidden = hidden === HIDDEN;
      if (isHidden !== Object.values(counts).every((count) => count === null)) {
        throw new Error(`${keyCode}（${name}）の秘匿処理と値の伏せ方が合わない`);
      }
      return {
        keyCode,
        level,
        name,
        // 合算先は市区町村コードを除いた番号で、「314001;3150」のように複数のことがある
        hiddenInto: isHidden ? hiddenInto.split(";").map((code) => IIDA_CITY_CODE + code) : [],
        values: isHidden ? null : (counts as Record<M, number>),
      };
    });
}

// 町丁・字等の行（HYOSYO 2・3）の番号は9桁。その下の区分（11桁）は先頭9桁が属する町丁・字等
function townCodeOf(keyCode: string): string {
  return keyCode.slice(0, 9);
}

// 小地域集計を4地区ごとに合計する。
// 国勢調査は「上郷」「伊賀良」「南信濃」などを地区名のまま1つの町丁・字等にしている（中の区分も対応表の町名と分け方が違う）ので、
// 対応表の町名に当たらず、地区名と同じ名前のものはその地区に入れる。
// 値があるのに地区を決められない町丁・字等は unmappedTowns に入れる（呼び出し側で止める）
export function sumByDistrict<M extends string>(
  csvText: string,
  townMap: readonly TownMapEntry[],
  columnLabels: Readonly<Record<M, string>>,
): { sums: DistrictSum<M>[]; unmappedTowns: string[]; skippedTowns: string[] } {
  const measures = Object.keys(columnLabels) as M[];
  const resolveTown = createTownResolver(townMap);
  const districtByName = new Map(townMap.map((entry) => [entry.cityDistrict, entry.districtId]));
  const rows = parseCensusCsv(csvText, columnLabels);
  if (!rows.some((row) => row.level === "1")) throw new Error("飯田市の行がない");

  // 町丁・字等の番号 → 地区（4地区の外は null、決められないものは undefined）
  const towns = rows.filter((row) => TOWN_LEVELS.has(row.level));
  const districtOfTown = new Map<string, DistrictId | null | undefined>(
    towns.map((row) => {
      const entry = resolveTown(row.name);
      return [row.keyCode, entry ? entry.districtId : districtByName.get(row.name)];
    }),
  );

  // 伏せられた値は合算先の町丁・字等に入っている。合算先が別の地区だと地区の値がずれるので止める
  // （地区を決められない町丁・字等は4地区の外として比べる）
  for (const row of rows.filter((row) => row.values === null)) {
    const from = districtOfTown.get(townCodeOf(row.keyCode)) ?? null;
    for (const code of row.hiddenInto) {
      const into = districtOfTown.get(townCodeOf(code)) ?? null;
      if (from !== into) {
        throw new Error(`${row.keyCode}（${row.name}）の値が、別の地区の ${code} に合算されている`);
      }
    }
  }

  const sums = new Map<DistrictId, DistrictSum<M>>();
  const unmappedTowns: string[] = [];
  const skippedTowns: string[] = [];
  for (const row of towns) {
    const districtId = districtOfTown.get(row.keyCode);
    if (districtId === undefined) {
      // 値がすべて0の町丁・字等と、別の町丁・字等に合算された町丁・字等は、地区を決めなくても合計に影響しない
      if (row.values === null || measures.every((measure) => row.values?.[measure] === 0)) skippedTowns.push(row.name);
      else unmappedTowns.push(row.name);
      continue;
    }
    if (districtId === null || row.values === null) continue;
    const sum =
      sums.get(districtId) ??
      ({ districtId, towns: [], ...Object.fromEntries(measures.map((measure) => [measure, 0])) } as DistrictSum<M>);
    for (const measure of measures) (sum as Record<M, number>)[measure] += row.values[measure];
    sum.towns.push(row.name);
    sums.set(districtId, sum);
  }

  return {
    sums: DISTRICT_IDS.map((districtId) => {
      const sum = sums.get(districtId);
      if (sum === undefined) throw new Error(`${districtId} の町丁・字等が1つもない`);
      return sum;
    }),
    unmappedTowns,
    skippedTowns,
  };
}
