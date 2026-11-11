// カルテの交通「用事の場所」（037。2026-11-11 まさゆきさん）の中身の組み立て。
// 行き先はエリアごと：市役所はすべての地区、病院・学校・店は地区ごと（バスの本数は bus_errands）。
// 診療所は数だけ、駅はその駅を出る電車の本数、高校は名前だけ（紹介程度）を出す
import type { BusErrand, DataState, DistrictData } from "../data/screen-data.ts";
import type { DistrictId } from "../town-district/resolve.ts";
import { trainTrips } from "./train.ts";

type MissingState = Exclude<DataState<unknown>, { status: "available" }>;

// 地区の人が使う駅（まさゆきさんの指定）。伊賀良は地区内に駅がない
export const ERRAND_STATIONS: Readonly<Record<DistrictId, string | null>> = {
  kamisato: "伊那上郷",
  kanae: "鼎",
  igara: null,
  chushin: "飯田",
};

// 店の名前と住所を、各店の公式ページで確かめた日（data/bus_errands.csv の公式ページ）
export const STORES_CHECKED_ON = "2026-11-11";

export type ErrandGroup = "office" | "school" | "store";

const GROUP_KINDS: Readonly<Record<ErrandGroup, readonly BusErrand["kind"][]>> = {
  office: ["市役所", "病院"],
  school: ["小学校", "中学校"],
  store: ["店"],
};

export function errandsOf(errands: readonly BusErrand[], group: ErrandGroup): BusErrand[] {
  return errands.filter((errand) => GROUP_KINDS[group].includes(errand.kind));
}

export type ErrandStation =
  | { status: "none" }
  | { status: "trips"; stationName: string; total: number; up: number; down: number; withTimes: boolean }
  | { status: "missing"; stationName: string; state: MissingState };

// 地区の駅を出る電車の1日の本数（特急を除く）。時刻が出せないあいだは運行本数データ（平日）の本数（031）
export function errandStation(district: Pick<DistrictData, "id" | "trainDepartures" | "trainCounts">): ErrandStation {
  const stationName = ERRAND_STATIONS[district.id];
  if (stationName === null) return { status: "none" };
  const state = trainTrips(district);
  if (state.status !== "available") return { status: "missing", stationName, state };
  const rows = state.value.filter((row) => row.stationName === stationName);
  if (rows.length === 0) return { status: "missing", stationName, state: { status: "unavailable" } };
  const sum = (direction: "上り" | "下り") => rows.filter((row) => row.direction === direction).reduce((total, row) => total + row.tripsPerDay, 0);
  const up = sum("上り");
  const down = sum("下り");
  const withTimes = district.trainDepartures.status === "available";
  return { status: "trips", stationName, total: up + down, up, down, withTimes };
}

// 地区の高校の名前（紹介程度。市「教育機関一覧」の、その地区の住所の高校）
export function highSchoolNames(district: Pick<DistrictData, "schools">): string[] | null {
  if (district.schools.status === "unavailable") return null;
  if (district.schools.status === "none") return [];
  return district.schools.value.filter((school) => school.subkind === "高等学校").map((school) => school.name);
}
