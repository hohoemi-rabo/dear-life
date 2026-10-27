// 04 地区くらべ（020・F-05）で並べる項目と、表の下にまとめて出す出典。画面の部品はここで決めた順に並べるだけにする。
// 点数・順位は付けない。地区の並びは地区マスタの順のまま（screen_data の districtOrder）
import type { DataState, DistrictData, DistrictEvent, Facility, MarketCategory, ScreenData, SourceInfo } from "../data/screen-data.ts";
import { formatJaDate, formatQuarterRange } from "../format.ts";

// 施設の数の行。表の項目名はカルテのカードの小見出しにそろえる
export const FACILITY_COUNT_ROWS: readonly { id: string; label: string; pick: (district: DistrictData) => DataState<readonly Facility[]> }[] = [
  { id: "schools", label: "学校", pick: (district) => district.schools },
  { id: "childcare", label: "保育園・幼稚園等", pick: (district) => district.childcare },
  { id: "after-school-clubs", label: "放課後児童クラブ", pick: (district) => district.afterSchoolClubs },
  { id: "evacuation-sites", label: "指定緊急避難場所", pick: (district) => district.evacuationSites },
  { id: "public-facilities", label: "公共施設", pick: (district) => district.publicFacilities },
  { id: "bus-stops", label: "バス停", pick: (district) => district.busStops },
  { id: "train-stations", label: "駅", pick: (district) => district.trainStations },
];

const MARKET_CATEGORIES: readonly MarketCategory[] = ["land", "house_built_within_20y", "house_built_over_20y"];

export type SourceEntry = { source: SourceInfo; period?: string };

// 表に出したデータの出典を、出てくる順に1回ずつ。値のない（データ未取得の）ものは出典がないので入らない。
// 相場は集計の対象期間、人口は国勢調査の時点を対象として出す（カルテと同じ）
export function compareSources(data: ScreenData): SourceEntry[] {
  const districts = data.districtOrder.map((id) => data.districts[id]);
  const entries = new Map<string, SourceEntry>();
  const add = (state: DataState<unknown>, period?: string) => {
    if (state.status === "unavailable" || entries.has(state.source.id)) return;
    entries.set(state.source.id, { source: state.source, period });
  };

  // 相場は3種類・4地区とも同じ出典・同じ対象期間なので、値のあるどれかから対象期間を取る
  const marketStates = districts.flatMap((district) => MARKET_CATEGORIES.map((category) => district.market[category]));
  const marketStat = marketStates.find((state) => state.status === "available");
  const marketPeriod =
    marketStat?.status === "available" ? formatQuarterRange(marketStat.value.periodFrom, marketStat.value.periodTo) : undefined;
  for (const state of marketStates) add(state, marketPeriod);
  for (const district of districts) {
    add(district.elementarySchoolDistricts);
    add(district.juniorHighSchoolDistricts);
  }
  for (const row of FACILITY_COUNT_ROWS) {
    for (const district of districts) add(row.pick(district));
  }
  for (const district of districts) {
    const { population } = district;
    add(population, population.status === "available" ? `${formatJaDate(population.value.asOf)}時点` : undefined);
  }
  return [...entries.values()];
}

export type EventSource = { note: string; checkedOn: string };

// 行事は手で集めた情報なので、元の資料と確認日を組にして1回ずつ（要件 7.1・7.2）
export function eventSources(data: ScreenData): EventSource[] {
  const seen = new Map<string, EventSource>();
  for (const id of data.districtOrder) {
    for (const event of data.districts[id].events) {
      const key = `${event.sourceNote}\u0000${event.checkedOn}`;
      if (!seen.has(key)) seen.set(key, { note: event.sourceNote, checkedOn: event.checkedOn });
    }
  }
  return [...seen.values()];
}

// 行事の名前。中心市街地は地区（丸山・東野など）を添える
export function eventLabel(event: DistrictEvent): string {
  return event.chushinArea ? `${event.name}（${event.chushinArea}）` : event.name;
}
