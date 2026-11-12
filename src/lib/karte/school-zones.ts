// カルテの子育て・学校の「学区」のタブ（039）。町名ごとに通う学校（市の通学区域の規則の別表）を、
// 同じ学校の組み合わせの町ごとにまとめる。
// 地区の端の町（中心市街地の八幡町・育良町）は、となりの地区にある学校に通う。学校の数には入れず、表の下に分けて出す
// （2026-11-12 まさゆきさん：「9はだめでしょ。5でいいでしょ」）。
// どれが端の町かは町名で決めず、「その町の学校が1つも地区の中にない」で決める（地区の中の学校は市の教育機関一覧）
import type { DataState, DistrictData, Facility, TownSchoolZone } from "../data/screen-data.ts";

// single：どの町も1校／choice：2校から選べる（別表の「又は」）／partial：町の中の場所によって分かれる（別表の「の一部」）
export type SchoolZoneKind = "single" | "choice" | "partial";

export type SchoolZoneGroup = {
  elementarySchools: readonly string[];
  juniorHighSchools: readonly string[];
  kind: SchoolZoneKind;
  // 「江戸町1〜4丁目」のように丁目をまとめた町の名前。並びは別表の順
  towns: readonly string[];
};

export type SchoolZoneSummary = {
  // 地区の子が通う学校（端の町の学校を除く）。並びは別表に初めて出た順
  elementarySchools: readonly string[];
  juniorHighSchools: readonly string[];
  // すべての町が同じ1校ずつ（上郷・鼎・伊賀良）
  uniform: boolean;
  groups: readonly SchoolZoneGroup[];
  // 地区の端の町（学校がどれも地区の外にある）
  edgeGroups: readonly SchoolZoneGroup[];
};

function zoneKind(zone: TownSchoolZone): SchoolZoneKind {
  if (zone.isPartial) return "partial";
  return zone.elementarySchools.length > 1 || zone.juniorHighSchools.length > 1 ? "choice" : "single";
}

// 学校の名前の書き方の違い（市の教育機関一覧は「旭ヶ丘」、規則の別表は「旭ケ丘」）を、比べるときだけそろえる
function schoolKey(name: string): string {
  return name.normalize("NFKC").replace(/[ヶヵ]/g, "ケ");
}

const CHOME = /^(.+?)(\d+)丁目$/;

// 「江戸町1丁目、江戸町2丁目、江戸町3丁目」→「江戸町1〜3丁目」、2つなら「桜町1・2丁目」、とびとびなら「1・3丁目」。
// 丁目のない町（「仲ノ町」「通り町3丁目大横」）はそのまま。並びは最初に出た位置
export function mergeTownNames(towns: readonly string[]): string[] {
  const merged: { base: string; numbers: number[] }[] = [];
  const result: (string | { base: string; numbers: number[] })[] = [];
  for (const town of towns) {
    const match = CHOME.exec(town);
    if (!match) {
      result.push(town);
      continue;
    }
    const [, base, number] = match;
    const existing = merged.find((item) => item.base === base);
    if (existing) {
      existing.numbers.push(Number(number));
    } else {
      const item = { base, numbers: [Number(number)] };
      merged.push(item);
      result.push(item);
    }
  }
  return result.map((item) => {
    if (typeof item === "string") return item;
    const numbers = [...new Set(item.numbers)].sort((a, b) => a - b);
    const consecutive = numbers.every((n, index) => index === 0 || n === numbers[index - 1] + 1);
    const label = numbers.length >= 3 && consecutive ? `${numbers[0]}〜${numbers.at(-1)}` : numbers.join("・");
    return `${item.base}${label}丁目`;
  });
}

function pushUnique(into: string[], items: readonly string[]) {
  for (const item of items) if (!into.includes(item)) into.push(item);
}

// schoolsInDistrict が null（学校の一覧がデータ未取得）なら、端の町を分けずにすべての学校を数える
export function summarizeSchoolZones(zones: readonly TownSchoolZone[], schoolsInDistrict: readonly Facility[] | null): SchoolZoneSummary {
  const inside = schoolsInDistrict === null ? null : new Set(schoolsInDistrict.map((school) => schoolKey(school.name)));
  const isEdge = (zone: TownSchoolZone) =>
    inside !== null && [...zone.elementarySchools, ...zone.juniorHighSchools].every((school) => !inside.has(schoolKey(school)));

  const group = (items: readonly TownSchoolZone[]): SchoolZoneGroup[] => {
    const groups: (Omit<SchoolZoneGroup, "towns"> & { key: string; rawTowns: string[] })[] = [];
    for (const zone of items) {
      const kind = zoneKind(zone);
      const key = [zone.elementarySchools.join("|"), zone.juniorHighSchools.join("|"), kind].join("/");
      const existing = groups.find((item) => item.key === key);
      if (existing) existing.rawTowns.push(zone.townName);
      else groups.push({ key, kind, elementarySchools: zone.elementarySchools, juniorHighSchools: zone.juniorHighSchools, rawTowns: [zone.townName] });
    }
    return groups.map(({ elementarySchools, juniorHighSchools, kind, rawTowns }) => ({
      elementarySchools,
      juniorHighSchools,
      kind,
      towns: mergeTownNames(rawTowns),
    }));
  };

  const main = zones.filter((zone) => !isEdge(zone));
  const elementarySchools: string[] = [];
  const juniorHighSchools: string[] = [];
  for (const zone of main) {
    pushUnique(elementarySchools, zone.elementarySchools);
    pushUnique(juniorHighSchools, zone.juniorHighSchools);
  }
  const groups = group(main);
  return {
    elementarySchools,
    juniorHighSchools,
    uniform: groups.length === 1 && groups[0].kind === "single",
    groups,
    edgeGroups: group(zones.filter(isEdge)),
  };
}

// 地区の学区のまとめ。カルテの学区のタブ・地区くらべ・くらしの春の場面と学校のピンで同じものを使う
export function districtSchoolZones(district: DistrictData): DataState<SchoolZoneSummary> {
  const state = district.schoolZones;
  if (state.status !== "available") return state;
  const schools = district.schools.status === "available" ? district.schools.value : district.schools.status === "none" ? [] : null;
  return { ...state, value: summarizeSchoolZones(state.value, schools) };
}

// 「{地区}に住むと、〜。」の「〜」。どの町も同じなら「小学校は上郷小学校、中学校は高陵中学校に通います」、
// 分かれるなら「町によって、小学校は浜井場小学校・丸山小学校・追手町小学校、中学校は飯田東中学校・飯田西中学校に分かれます」
export function schoolZonePhrase(summary: SchoolZoneSummary): string {
  const elementary = summary.elementarySchools.join("・");
  const juniorHigh = summary.juniorHighSchools.join("・");
  return summary.uniform ? `小学校は${elementary}、中学校は${juniorHigh}に通います` : `町によって、小学校は${elementary}、中学校は${juniorHigh}に分かれます`;
}
