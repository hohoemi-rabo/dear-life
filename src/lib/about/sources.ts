// データについてページ（022）の出典の並べ方と、手でまとめたデータの確認日のまとめ方
import type { ScreenData, SourceInfo } from "../data/screen-data.ts";

// 出典の行（data_sources.id）ごとの使い道。並びもこの順にする（画面で目にする順：相場 → 学区 → 施設 → 交通 → 人口 → 場面の文）
export const SOURCE_USES: ReadonlyArray<readonly [id: string, use: string]> = [
  ["reinfolib_xit001", "住まいの相場"],
  ["reinfolib_xkt004", "小学校区"],
  ["reinfolib_xkt005", "中学校区"],
  ["iida_education", "学校"],
  ["iida_childcare", "保育園・幼稚園など、放課後児童クラブ"],
  ["iida_evacuation", "避難場所"],
  ["iida_public_facilities", "公共施設"],
  ["gtfs_minamishinshu_bus", "バス停、バスの便と本数"],
  ["sena_iida_line_stations", "駅"],
  ["iida_jr_timetable", "電車の便と本数"],
  ["estat_census_small_area", "地区の人口と年齢構成"],
  ["rakuen_shinshu_iida_sheet", "冬の場面の雪と路面凍結の文"],
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

// 支援制度の確認日の幅（YYYY-MM-DD）。公開済みの制度がなければ null
export function supportCheckedRange(data: ScreenData): DateRange | null {
  const dates = data.supportPrograms.map((program) => program.checkedOn).sort();
  if (dates.length === 0) return null;
  return { from: dates[0], to: dates[dates.length - 1] };
}
