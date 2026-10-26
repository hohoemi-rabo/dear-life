// 選ぶたびの返事（F-10・要件 4章の「えらぶ画面での返事」の列）。どの質問で・どの選択のときに・何を返すかをここだけで決める。
// 点数化・おすすめはしない。値はすべて DataState のまま渡し、「該当なし」と「データ未取得」の出し分けは画面に任せる
import { hasChildren, hasNoCar, type Conditions } from "../conditions/model.ts";
import type { DataState, Facility, MarketStat, ScreenData } from "../data/screen-data.ts";
import type { QuestionId } from "./questions.ts";

export type ErabuReply =
  // 住む地区：地区の範囲と、土地の真ん中の値・件数
  | { kind: "district"; districtName: string; area: string; land: DataState<MarketStat> }
  // 子ども1人以上：保育園・幼稚園等と小学校の数
  | {
      kind: "children";
      districtName: string;
      childcare: DataState<number>;
      elementarySchools: DataState<number>;
    }
  // 家：買う・新しめ／古め：中古戸建ての真ん中の値と件数。新しめは件数によらず「件数少なめ・参考程度」を付ける
  | { kind: "house"; districtName: string; housing: "new" | "old"; house: DataState<MarketStat>; alwaysFew: boolean }
  // 家：借りる
  | { kind: "rent" }
  // 車：0台：バス停の数
  | { kind: "busStops"; districtName: string; busStops: DataState<number> };

// 一覧の数を数える。出典は公開済みで当てはまるものが0件なら「該当なし」にする
function countOf<T>(state: DataState<readonly T[]>, match: (item: T) => boolean = () => true): DataState<number> {
  if (state.status !== "available") return state;
  const count = state.value.filter(match).length;
  return count > 0 ? { status: "available", value: count, source: state.source } : { status: "none", source: state.source };
}

const isElementarySchool = (facility: Facility) => facility.subkind === "小学校";

// 今の質問と選んだ条件に対する返事。返事がない選択（子ども0人・車1台以上・大切にしたいこと など）は null
export function erabuReply(question: QuestionId, conditions: Conditions, data: ScreenData): ErabuReply | null {
  if (conditions.district === null) return null;
  const district = data.districts[conditions.district];
  const districtName = district.name;

  switch (question) {
    case "district":
      return { kind: "district", districtName, area: district.areaDescription, land: district.market.land };
    case "family":
      if (!hasChildren(conditions)) return null;
      return {
        kind: "children",
        districtName,
        childcare: countOf(district.childcare),
        elementarySchools: countOf(district.schools, isElementarySchool),
      };
    case "housing":
      if (conditions.housing === "rent") return { kind: "rent" };
      return conditions.housing === "new"
        ? { kind: "house", districtName, housing: "new", house: district.market.house_built_within_20y, alwaysFew: true }
        : { kind: "house", districtName, housing: "old", house: district.market.house_built_over_20y, alwaysFew: false };
    case "car":
      if (!hasNoCar(conditions)) return null;
      return { kind: "busStops", districtName, busStops: countOf(district.busStops) };
    case "priorities":
      return null;
  }
}
