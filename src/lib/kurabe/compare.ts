// 04 地区くらべ（020・F-05）で並べる項目と、表の下にまとめて出す出典。画面の部品はここで決めた順に並べるだけにする。
// 点数・順位は付けない。地区の並びは地区マスタの順のまま（screen_data の districtOrder）
import type { DataState, DistrictData, DistrictEvent, Facility, MarketCategory, ScreenData, SourceInfo } from "../data/screen-data.ts";
import { formatJaDate, formatQuarterRange } from "../format.ts";
import { trainTrips } from "../karte/train.ts";

// 見る項目のまとまり（地区くらべのタブ。028）。「一覧」はすべてを1つの表で見る
export const COMPARE_TOPICS = ["housing", "school", "transport", "population", "events"] as const;
export type CompareTopic = (typeof COMPARE_TOPICS)[number];

// 施設の数の行。表の項目名はカルテのカードの小見出しにそろえる。topic はどのタブに出すか
export const FACILITY_COUNT_ROWS: readonly {
  id: string;
  label: string;
  topic: "school" | "transport";
  pick: (district: DistrictData) => DataState<readonly Facility[]>;
}[] = [
  { id: "schools", label: "学校", topic: "school", pick: (district) => district.schools },
  { id: "childcare", label: "保育園・幼稚園等", topic: "school", pick: (district) => district.childcare },
  { id: "after-school-clubs", label: "放課後児童クラブ", topic: "school", pick: (district) => district.afterSchoolClubs },
  { id: "bus-stops", label: "バス停", topic: "transport", pick: (district) => district.busStops },
  { id: "train-stations", label: "駅", topic: "transport", pick: (district) => district.trainStations },
  { id: "evacuation-sites", label: "指定緊急避難場所", topic: "transport", pick: (district) => district.evacuationSites },
  { id: "public-facilities", label: "公共施設", topic: "transport", pick: (district) => district.publicFacilities },
];

const MARKET_CATEGORIES: readonly MarketCategory[] = ["land", "house_built_within_20y", "house_built_over_20y"];

export type SourceEntry = { source: SourceInfo; period?: string };

// 表に出したデータの出典を、出てくる順に1回ずつ。値のない（データ未取得の）ものは出典がないので入らない。
// 相場は集計の対象期間、人口は国勢調査の時点を対象として出す（カルテと同じ）。topics を渡すと、そのタブの項目の出典だけにする
export function compareSources(data: ScreenData, topics: readonly CompareTopic[] = COMPARE_TOPICS): SourceEntry[] {
  const districts = data.districtOrder.map((id) => data.districts[id]);
  const entries = new Map<string, SourceEntry>();
  const add = (state: DataState<unknown>, period?: string) => {
    if (state.status === "unavailable" || entries.has(state.source.id)) return;
    entries.set(state.source.id, { source: state.source, period });
  };

  if (topics.includes("housing")) {
    // 相場は3種類・4地区とも同じ出典・同じ対象期間なので、値のあるどれかから対象期間を取る
    const marketStates = districts.flatMap((district) => MARKET_CATEGORIES.map((category) => district.market[category]));
    const marketStat = marketStates.find((state) => state.status === "available");
    const marketPeriod =
      marketStat?.status === "available" ? formatQuarterRange(marketStat.value.periodFrom, marketStat.value.periodTo) : undefined;
    for (const state of marketStates) add(state, marketPeriod);
    // 借家に住む世帯の数（034）。国勢調査の時点を対象として出す
    for (const district of districts) {
      const tenure = district.housingTenure;
      add(tenure, tenure.status === "available" ? `${formatJaDate(tenure.value.asOf)}時点` : undefined);
    }
  }
  if (topics.includes("school")) {
    for (const district of districts) {
      // 通う学校（市の通学区域の規則の別表。039）
      add(district.schoolZones);
    }
  }
  for (const row of FACILITY_COUNT_ROWS) {
    if (!topics.includes(row.topic)) continue;
    for (const district of districts) add(row.pick(district));
    // 電車の本数の行（031）は駅の行のすぐ後ろに並べるので、出典も駅の後ろにする
    if (row.id === "train-stations") for (const district of districts) add(trainTrips(district));
  }
  if (topics.includes("population")) {
    for (const district of districts) {
      const { population } = district;
      add(population, population.status === "available" ? `${formatJaDate(population.value.asOf)}時点` : undefined);
    }
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

// 開く前の出典の欄に添える短い名前。出どころが複数なら最初の1つに「ほか」を付ける
export function sourcesSummary(publishers: readonly string[]): string | null {
  const unique = [...new Set(publishers)];
  if (unique.length === 0) return null;
  return unique.length === 1 ? unique[0] : `${unique[0]} ほか`;
}

// 行事の名前。中心市街地は地区（丸山・東野など）を添える
export function eventLabel(event: DistrictEvent): string {
  return event.chushinArea ? `${event.name}（${event.chushinArea}）` : event.name;
}
