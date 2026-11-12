// 町名ごとに通う公立の小学校・中学校（通学区域。039）。npm run school-zones:sql から使う。
// 飯田市教育委員会「飯田市立小学校及び中学校の通学区域に関する規則」の別表（町名 → 小学校・中学校）を読む。
// 国の学区の範囲（XKT004・XKT005）は線の細かさの誤差で境目の町を取り違えるので、通う学校は規則から決める（2026-11-12 まさゆきさん）。
// 市の規則は著作権の対象にならない（著作権法13条1号）。出典は書く。
// Node から直接読み込むので、外部に依存しない純粋な処理だけを置く
import { parseCsv } from "../gtfs/csv.ts";
import { sqlLiteral } from "../sql.ts";
import { TARGET_DISTRICT_IDS } from "../town-district/csv.ts";
import type { TownMapEntry } from "../town-district/resolve.ts";

export const SCHOOL_ZONE_RULE_URL = "https://www.city.iida.lg.jp/reiki_int/reiki_honbun/e706RG00000252.html";
export const SCHOOL_ZONE_SOURCE_ID = "iida_school_zone_rule";

// 別表の1行。町名はまだ「の一部」が付いたまま
export type SchoolZoneTableRow = { towns: string[]; elementarySchools: string[]; juniorHighSchools: string[] };

// 町名ごとの1行。同じ町が別表の何行かに分かれて出る（「上飯田の一部」が丸山小と追手町小の行にある）ときは学校をまとめる
export type TownSchoolZone = {
  townName: string;
  elementarySchools: string[];
  juniorHighSchools: string[];
  // 町の一部だけ学校が変わる（「の一部」）。番地ごとの分け方は別表に書いていない
  isPartial: boolean;
};

export type DistrictTownSchoolZone = TownSchoolZone & { cityDistrict: string };

const PARTIAL_SUFFIX = "の一部";
const CITY_PREFIX = "飯田市立";

function cellText(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, "")
    .trim();
}

// 「飯田市立浜井場小学校又は飯田市立丸山小学校」→ ["浜井場小学校", "丸山小学校"]。名前は国のデータと同じく「飯田市立」を外す
function parseSchools(text: string, level: "小学校" | "中学校"): string[] {
  const schools = text.split("又は").map((name) => name.replace(new RegExp(`^${CITY_PREFIX}`), ""));
  for (const school of schools) {
    if (!school.endsWith(level)) throw new Error(`別表の${level}の欄が読めない：${text}`);
  }
  return schools;
}

// 規則のページの「(令和6年11月1日施行)」。変わったら取り直す
export function parseEnforcementLabel(html: string): string {
  const match = /[(（]((?:令和|平成)\d+年\d+月\d+日)施行[)）]/.exec(cellText(html));
  if (!match) throw new Error("規則のページに「(令和〇年〇月〇日施行)」が見つからない（ページの形が変わった？）");
  return `${match[1]}施行`;
}

// 別表の表を読む。中学校の欄は rowspan で縦につながっているので、上の行の学校を引き継ぐ
export function parseSchoolZoneTable(html: string): SchoolZoneTableRow[] {
  const sectionAt = html.indexOf("別表");
  const tableStart = html.indexOf("fixed-colspec", sectionAt);
  if (sectionAt < 0 || tableStart < 0) throw new Error("規則のページに別表が見つからない（ページの形が変わった？）");
  const tableEnd = html.indexOf("</table>", tableStart);
  const body = html.slice(html.indexOf("</thead>", tableStart), tableEnd);

  const carried: ({ text: string; remaining: number } | null)[] = [null, null, null];
  const rows: SchoolZoneTableRow[] = [];
  for (const trMatch of body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const tds = [...trMatch[1].matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)].map((m) => ({
      rowspan: Number(/rowspan="(\d+)"/.exec(m[1])?.[1] ?? "1"),
      text: cellText(m[2]),
    }));
    const cells: string[] = [];
    for (let column = 0; column < 3; column += 1) {
      const carry = carried[column];
      if (carry && carry.remaining > 0) {
        cells.push(carry.text);
        carry.remaining -= 1;
        continue;
      }
      const td = tds.shift();
      if (!td) throw new Error(`別表の行の欄が足りない：${trMatch[1].slice(0, 200)}`);
      cells.push(td.text);
      carried[column] = td.rowspan > 1 ? { text: td.text, remaining: td.rowspan - 1 } : null;
    }
    if (tds.length > 0) throw new Error(`別表の行の欄が多い：${cells.join("｜")}`);
    const [area, elementary, juniorHigh] = cells;
    if (area === "通学区域") continue;
    rows.push({
      towns: area.split("、").filter((town) => town !== ""),
      elementarySchools: parseSchools(elementary, "小学校"),
      juniorHighSchools: parseSchools(juniorHigh, "中学校"),
    });
  }
  if (rows.length === 0) throw new Error("別表に行がない（ページの形が変わった？）");
  return rows;
}

function union(into: string[], items: readonly string[]) {
  for (const item of items) if (!into.includes(item)) into.push(item);
}

// 別表の行を町名ごとにする。並びは別表に初めて出た順
export function toTownSchoolZones(rows: readonly SchoolZoneTableRow[]): TownSchoolZone[] {
  const towns = new Map<string, TownSchoolZone>();
  for (const row of rows) {
    for (const rawTown of row.towns) {
      const isPartial = rawTown.endsWith(PARTIAL_SUFFIX);
      const townName = isPartial ? rawTown.slice(0, -PARTIAL_SUFFIX.length) : rawTown;
      const existing = towns.get(townName);
      if (!existing) {
        towns.set(townName, { townName, elementarySchools: [...row.elementarySchools], juniorHighSchools: [...row.juniorHighSchools], isPartial });
        continue;
      }
      // 町の全部が2つの行に出ることはないはず。出たら別表の読み違いなので止める
      if (!isPartial || !existing.isPartial) throw new Error(`別表で「${townName}」が「の一部」なしで2回出る`);
      union(existing.elementarySchools, row.elementarySchools);
      union(existing.juniorHighSchools, row.juniorHighSchools);
    }
  }
  return [...towns.values()];
}

// 町名に地区を付ける。対応表にない町名は返して、取り込みを止める
export function assignCityDistricts(
  zones: readonly TownSchoolZone[],
  resolveTown: (address: string) => TownMapEntry | null,
): { zones: DistrictTownSchoolZone[]; unmappedTowns: string[] } {
  const unmappedTowns: string[] = [];
  const assigned: DistrictTownSchoolZone[] = [];
  for (const zone of zones) {
    const entry = resolveTown(zone.townName);
    if (!entry) {
      unmappedTowns.push(zone.townName);
      continue;
    }
    assigned.push({ ...zone, cityDistrict: entry.cityDistrict });
  }
  return { zones: assigned, unmappedTowns };
}

// data/school_zones.csv。差分を目で確かめるために残し、マイグレーションはこれから作る。
// 選べる町と、町の一部で分かれる町は、学校を「|」でつなぐ
const CSV_HEADER = ["町名", "地区", "小学校", "中学校", "一部"];
const SCHOOL_SEPARATOR = "|";

export function buildSchoolZonesCsv(zones: readonly DistrictTownSchoolZone[]): string {
  const lines = zones.map((zone) => {
    const cells = [zone.townName, zone.cityDistrict, zone.elementarySchools.join(SCHOOL_SEPARATOR), zone.juniorHighSchools.join(SCHOOL_SEPARATOR), zone.isPartial ? "一部" : ""];
    if (cells.some((cell) => /[",\n]/.test(cell))) throw new Error(`CSV に書けない文字がある：${cells.join(" ")}`);
    return cells.join(",");
  });
  return [CSV_HEADER.join(","), ...lines].join("\n") + "\n";
}

export function parseSchoolZonesCsv(text: string): DistrictTownSchoolZone[] {
  const firstLine = text.replace(/^﻿/, "").split(/\r?\n/, 1)[0];
  if (firstLine !== CSV_HEADER.join(",")) throw new Error(`school_zones.csv の見出しが ${CSV_HEADER.join(",")} ではありません: ${firstLine}`);
  return parseCsv(text).map((record, index) => {
    const at = `school_zones.csv ${index + 2}行目`;
    const [townName, cityDistrict, elementary, juniorHigh, partial] = CSV_HEADER.map((key) => record[key] ?? "");
    if (!townName || !cityDistrict || !elementary || !juniorHigh) throw new Error(`${at}：町名・地区・小学校・中学校が必要`);
    if (partial !== "" && partial !== "一部") throw new Error(`${at}：一部の欄は「一部」か空`);
    return {
      townName,
      cityDistrict,
      elementarySchools: elementary.split(SCHOOL_SEPARATOR),
      juniorHighSchools: juniorHigh.split(SCHOOL_SEPARATOR),
      isPartial: partial === "一部",
    };
  });
}

export function buildSchoolZoneCreditText(enforcementLabel: string): string {
  return `出典：飯田市教育委員会「飯田市立小学校及び中学校の通学区域に関する規則」別表（${enforcementLabel}）（${SCHOOL_ZONE_RULE_URL}）をもとに作成（町名ごとに通う学校を整理した）`;
}

// 出典と市全体の町名の行を、この取り込みの中身にそろえる SQL。何度当てても同じ結果になる。
// 行が多いので、学校は CSV と同じ「|」つなぎで書き、SQL の中で配列にする
export function buildSchoolZonesSql(zones: readonly DistrictTownSchoolZone[], enforcementLabel: string, checkedOn: string): string {
  const source = sqlLiteral(SCHOOL_ZONE_SOURCE_ID);
  const values = zones
    .map((zone, index) =>
      `  (${[
        sqlLiteral(zone.townName),
        sqlLiteral(zone.cityDistrict),
        sqlLiteral(TARGET_DISTRICT_IDS[zone.cityDistrict] ?? null),
        sqlLiteral(zone.elementarySchools.join(SCHOOL_SEPARATOR)),
        sqlLiteral(zone.juniorHighSchools.join(SCHOOL_SEPARATOR)),
        zone.isPartial ? "true" : "false",
        index + 1,
      ].join(", ")})`,
    )
    .join(",\n");
  return `-- 039 町名ごとに通う公立の小学校・中学校（市の通学区域の規則の別表）を入れる。
-- このファイルは npm run school-zones:sql で data/school_zones.csv から作る。手で編集しない（手順は docs/039_school-district-tab.md）
-- 規則：${SCHOOL_ZONE_RULE_URL}（${enforcementLabel}）

update public.data_sources set
  credit_text = ${sqlLiteral(buildSchoolZoneCreditText(enforcementLabel))},
  period_label = ${sqlLiteral(enforcementLabel)},
  checked_on = ${sqlLiteral(checkedOn)}::date
where id = ${source};

delete from public.school_zones where source_id = ${source};
insert into public.school_zones (town_name, city_district, district_id, elementary_schools, junior_high_schools, is_partial, sort_order, source_id)
select t, c, d, string_to_array(e, '${SCHOOL_SEPARATOR}'), string_to_array(j, '${SCHOOL_SEPARATOR}'), p, o, ${source}
from (values
${values}
) as v (t, c, d, e, j, p, o);
`;
}
