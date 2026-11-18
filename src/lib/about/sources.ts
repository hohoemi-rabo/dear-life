// データについてページ（022）の出典の並べ方と、手でまとめたデータの確認日のまとめ方
import type { ScreenData, SourceInfo } from "../data/screen-data.ts";

// 出典の行（data_sources.id）ごとの使い道。並びもこの順にする（画面で目にする順：相場・家賃 → 学区 → 施設 → 交通 → 人口 → 場面の文）
export const SOURCE_USES: ReadonlyArray<readonly [id: string, use: string]> = [
  ["reinfolib_xit001", "住まいの相場"],
  ["estat_housing_land_survey_rent", "借りるときの家賃の参考値（飯田市全体）"],
  ["estat_census_housing_tenure", "地区の借家に住む世帯の数"],
  ["iida_school_zone_rule", "通う小学校・中学校（町ごとの学区）"],
  ["reinfolib_xkt004", "地図の小学校区の範囲"],
  ["reinfolib_xkt005", "中学校区"],
  ["iida_education", "学校"],
  ["iida_childcare", "保育園・幼稚園など、放課後児童クラブ"],
  ["iida_evacuation", "避難場所"],
  ["iida_public_facilities", "公共施設"],
  ["gtfs_minamishinshu_bus", "バス停、バスの便と本数"],
  ["sena_iida_line_stations", "駅"],
  ["railway_honsu", "電車の本数（平日）"],
  ["iida_jr_timetable", "電車の便と本数"],
  ["mhlw_medical_clinics", "地区の診療所の数"],
  ["estat_census_small_area", "地区の人口と年齢構成"],
  ["rakuen_shinshu_iida_sheet", "冬の場面の雪と路面凍結の文"],
  // 地区くらべの「いまの街と」（041）。使い道を足し忘れていたので 2026-11-18 に足した（022 の確認。まさゆきさん）
  ["jma_climate_normals", "いまの街とくらべる雨・風・雪（防災カルテの雨と風も）"],
  ["mlit_flood_statistics", "いまの街とくらべる水害の被害"],
  ["estat_census_basic", "いまの街とくらべる人口密度と子どもの割合"],
];

export type SourceEntry = { source: SourceInfo; use: string | null };

// 公開済みの出典を使い道の順に並べる。知らない出典（あとで足したもの）は使い道なしで最後に出し、黙って落とさない
export function orderedSources(sources: readonly SourceInfo[]): SourceEntry[] {
  const rank = new Map(SOURCE_USES.map(([id], index) => [id, index]));
  const use = new Map(SOURCE_USES);
  return [...sources]
    .sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity) || a.id.localeCompare(b.id))
    .map((source) => ({ source, use: use.get(source.id) ?? null }));
}

export type DateRange = { from: string; to: string };

// 行事の資料ごとの確認日の幅。同じ資料で確認日だけちがう行は1行にまとめる（伊賀良をあとで足したので2行に分かれていた。2026-11-18 まさゆきさん）。
// 並びは資料が最初に出てくる順
export function eventSourceRanges(sources: readonly { note: string; checkedOn: string }[]): { note: string; range: DateRange }[] {
  const ranges = new Map<string, DateRange>();
  for (const { note, checkedOn } of sources) {
    const range = ranges.get(note);
    if (range === undefined) ranges.set(note, { from: checkedOn, to: checkedOn });
    else {
      if (checkedOn < range.from) range.from = checkedOn;
      if (checkedOn > range.to) range.to = checkedOn;
    }
  }
  return [...ranges].map(([note, range]) => ({ note, range }));
}

// 支援制度の確認日の幅（YYYY-MM-DD）。公開済みの制度がなければ null
export function supportCheckedRange(data: ScreenData): DateRange | null {
  const dates = data.supportPrograms.map((program) => program.checkedOn).sort();
  if (dates.length === 0) return null;
  return { from: dates[0], to: dates[dates.length - 1] };
}
