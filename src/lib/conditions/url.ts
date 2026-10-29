// 条件 ⇔ URL パラメータ（F-02）。条件はサーバーに送らず、URL だけで持つ。
// URL は外部入力なので、知らない値は黙って初期値に戻す（共有された古い URL でも画面が開けるように）。
// 人数だけは範囲の端に丸める（028 で選べる人数を減らす前の URL の「子ども3人」は、初期値の1人より2人のほうが近い）
import type { DistrictId } from "../town-district/resolve.ts";
import { DISTRICT_NAMES, HOUSING_LABELS, PRIORITIES, type CarCount, type Housing, type Priority } from "./labels.ts";
import { ADULTS_RANGE, CHILDREN_RANGE, DEFAULT_CONDITIONS, type Conditions } from "./model.ts";

// パラメータ名は短く固定する。変えると共有された URL が読めなくなる
export const CONDITION_PARAMS = {
  district: "d",
  adults: "a",
  children: "k",
  housing: "h",
  car: "c",
  priorities: "p",
} as const;

const CONDITION_PARAM_NAMES: readonly string[] = Object.values(CONDITION_PARAMS);

type ReadableParams = { get(name: string): string | null };

function parseCount(value: string | null, range: { min: number; max: number }, fallback: number): number {
  if (value === null || !/^\d+$/.test(value)) return fallback;
  return Math.min(Math.max(Number(value), range.min), range.max);
}

function isDistrictId(value: string | null): value is DistrictId {
  return value !== null && Object.hasOwn(DISTRICT_NAMES, value);
}

function isHousing(value: string | null): value is Housing {
  return value !== null && Object.hasOwn(HOUSING_LABELS, value);
}

function parseCar(value: string | null): CarCount | null {
  if (value === "0" || value === "1" || value === "2") return Number(value) as CarCount;
  return null;
}

// 知らない分野と重なりは捨て、既定の並び順にそろえる
function parsePriorities(value: string | null): Priority[] {
  if (!value) return [];
  const picked = new Set(value.split(","));
  return PRIORITIES.filter((priority) => picked.has(priority));
}

export function parseConditions(params: ReadableParams): Conditions {
  const district = params.get(CONDITION_PARAMS.district);
  const housing = params.get(CONDITION_PARAMS.housing);
  return {
    district: isDistrictId(district) ? district : DEFAULT_CONDITIONS.district,
    adults: parseCount(params.get(CONDITION_PARAMS.adults), ADULTS_RANGE, DEFAULT_CONDITIONS.adults),
    children: parseCount(params.get(CONDITION_PARAMS.children), CHILDREN_RANGE, DEFAULT_CONDITIONS.children),
    housing: isHousing(housing) ? housing : DEFAULT_CONDITIONS.housing,
    car: parseCar(params.get(CONDITION_PARAMS.car)),
    priorities: parsePriorities(params.get(CONDITION_PARAMS.priorities)),
  };
}

// 条件を URL パラメータにする。base にある条件以外のパラメータ（季節など）は残す。
// 家族と家は初期値でも書き出し、URL だけ見ても選んだ条件がわかるようにする
export function writeConditions(conditions: Conditions, base?: ReadableParams & Iterable<[string, string]>): URLSearchParams {
  const params = new URLSearchParams();
  if (base) {
    for (const [name, value] of base) {
      if (!CONDITION_PARAM_NAMES.includes(name)) params.append(name, value);
    }
  }
  if (conditions.district) params.set(CONDITION_PARAMS.district, conditions.district);
  params.set(CONDITION_PARAMS.adults, String(conditions.adults));
  params.set(CONDITION_PARAMS.children, String(conditions.children));
  params.set(CONDITION_PARAMS.housing, conditions.housing);
  if (conditions.car !== null) params.set(CONDITION_PARAMS.car, String(conditions.car));
  const priorities = PRIORITIES.filter((priority) => conditions.priorities.includes(priority));
  if (priorities.length > 0) params.set(CONDITION_PARAMS.priorities, priorities.join(","));
  return params;
}

// 別の画面へ条件を持って移るためのリンク先
export function conditionsHref(path: string, conditions: Conditions): string {
  const query = writeConditions(conditions).toString();
  return query ? `${path}?${query}` : path;
}
