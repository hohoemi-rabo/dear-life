// カルテ・地区くらべに出す電車の本数（026・031）。時刻（市の PDF を書き写したもの）が公開されていればそこから数えた本数と始発・最終、
// 市の許可が出るまでは全国鉄道運行本数データの本数（平日・始発・最終なし）を出す
import type { DataState, DistrictData, StationTrips } from "../data/screen-data.ts";

export type StationTripsRow = StationTrips & { firstDeparture?: string; lastDeparture?: string };

export function trainTrips(district: Pick<DistrictData, "trainDepartures" | "trainCounts">): DataState<readonly StationTripsRow[]> {
  return district.trainDepartures.status === "available" ? district.trainDepartures : district.trainCounts;
}

// 始発・最終があるのは時刻から数えたときだけ。運行本数データは平日だけを数えている
export function hasServiceTimes(rows: readonly StationTripsRow[]): boolean {
  return rows.length > 0 && rows.every((row) => row.firstDeparture !== undefined && row.lastDeparture !== undefined);
}

// 駅ごとの上り・下りの合計がいちばん多い駅。いちばん多い駅が2つ以上あれば tied にする
// （鼎・中心市街地は3駅とも同じ本数。並びで最初の駅だけを出すと、その駅が地区の代表に見えてしまうため）
export type BusiestStation = { stationName: string; trips: number; tied: boolean; stationCount: number };

export function busiestStation(rows: readonly StationTrips[]): BusiestStation | null {
  const totals = new Map<string, number>();
  for (const row of rows) totals.set(row.stationName, (totals.get(row.stationName) ?? 0) + row.tripsPerDay);
  let best: { stationName: string; trips: number } | null = null;
  for (const [stationName, trips] of totals) if (!best || trips > best.trips) best = { stationName, trips };
  if (!best) return null;
  const top = [...totals.values()].filter((trips) => trips === best.trips).length;
  return { ...best, tied: top > 1, stationCount: totals.size };
}
