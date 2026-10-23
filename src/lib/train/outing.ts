// 冬・車0台の「おでかけ」の電車の便と本数を、時刻の CSV から決める（026・要件 6.3）。
// 場面にはバス（010）の便と並べて出す（2026-10-23 まさゆきさん決定）。便の選び方はバスと同じ（chooseOutingTrips）。
// 特急は特急券が要るので、おでかけの便にも本数にも入れない（2026-10-23 まさゆきさん決定）
import { parseCsv } from "../gtfs/csv.ts";
import { formatGtfsTime, parseClock } from "../gtfs/feed.ts";
import { chooseOutingTrips, type OutingChoice } from "../gtfs/outing.ts";
import { TARGET_DISTRICT_IDS } from "../town-district/csv.ts";
import type { DistrictId } from "../town-district/resolve.ts";
import { departuresAt, type Timetable } from "./timetable.ts";

const EXPRESS_PREFIX = "特急";

export type TrainOutingConfig = {
  districtId: DistrictId;
  sortOrder: number;
  origin: string;
  destination: string;
  departAfter: string;
  returnAfter: string;
};

const HEADER = ["地区", "並び順", "乗る駅", "行き先", "行きの時刻以降", "帰りの時刻以降"];

function toClockLabel(value: string, label: string): string {
  const seconds = parseClock(value);
  if (seconds >= 24 * 3600) throw new Error(`${label} は 24:00 より前にしてください: ${value}`);
  return formatGtfsTime(seconds);
}

export function parseTrainOutingsCsv(text: string): TrainOutingConfig[] {
  const firstLine = text.replace(/^﻿/, "").split(/\r?\n/, 1)[0];
  if (firstLine !== HEADER.join(",")) throw new Error(`電車のおでかけの見出しが ${HEADER.join(",")} ではありません: ${firstLine}`);
  const seen = new Set<string>();
  return parseCsv(text).map((record, index) => {
    const at = `train_outings.csv ${index + 2}行目`;
    const districtId = TARGET_DISTRICT_IDS[record["地区"]];
    if (!districtId) throw new Error(`${at}：地区が4地区のどれでもない: ${record["地区"]}`);
    const sortOrder = Number(record["並び順"]);
    if (!Number.isInteger(sortOrder) || sortOrder < 1) throw new Error(`${at}：並び順は1以上の整数にする: ${record["並び順"]}`);
    const key = `${districtId}:${sortOrder}`;
    if (seen.has(key)) throw new Error(`${at}：${record["地区"]}の並び順 ${sortOrder} が重複している`);
    seen.add(key);
    if (!record["乗る駅"] || !record["行き先"]) throw new Error(`${at}：乗る駅と行き先が必要`);
    if (record["乗る駅"] === record["行き先"]) throw new Error(`${at}：乗る駅と行き先が同じ: ${record["乗る駅"]}`);
    return {
      districtId,
      sortOrder,
      origin: record["乗る駅"],
      destination: record["行き先"],
      departAfter: toClockLabel(record["行きの時刻以降"], `${at}：行きの時刻`),
      returnAfter: toClockLabel(record["帰りの時刻以降"], `${at}：帰りの時刻`),
    };
  });
}

export type TrainTrip = { trainId: string; trainType: string; departure: number; arrival: number };

const isExpress = (trainType: string) => trainType.startsWith(EXPRESS_PREFIX);

function requireStation(timetables: readonly Timetable[], station: string): void {
  if (!timetables.some((timetable) => timetable.stations.includes(station))) {
    throw new Error(`駅「${station}」が時刻の CSV にない（train_outings.csv の書き間違い？）`);
  }
}

// from で乗って to で降りられる列車（特急を除く）。発車の早い順。行き先がその列車の終点でもよい
export function findDirectTrains(timetables: readonly Timetable[], from: string, to: string): TrainTrip[] {
  requireStation(timetables, from);
  requireStation(timetables, to);
  return timetables
    .flatMap((timetable) => timetable.trains)
    .filter((train) => !isExpress(train.trainType))
    .flatMap((train) => {
      const fromIndex = train.stops.findIndex((stop) => stop.station === from);
      const toIndex = train.stops.findIndex((stop) => stop.station === to);
      if (fromIndex < 0 || toIndex <= fromIndex) return [];
      const departure = train.stops[fromIndex].departure;
      const toStop = train.stops[toIndex];
      const arrival = toStop.arrival ?? toStop.departure;
      if (departure === null || arrival === null) return [];
      return [{ trainId: train.id, trainType: train.trainType, departure, arrival }];
    })
    .sort((a, b) => a.departure - b.departure);
}

// その駅を発車する列車の数（上り・下りの合計、特急を除く）
export function countTrainDepartures(timetables: readonly Timetable[], station: string): number {
  return timetables.flatMap((timetable) => departuresAt(timetable, station)).filter((departure) => !isExpress(departure.trainType)).length;
}

export type TrainOutingRow = TrainOutingConfig &
  OutingChoice<TrainTrip> & {
    outboundTripsPerDay: number;
    returnTripsPerDay: number;
    originDeparturesPerDay: number;
  };

export function buildTrainOutings(timetables: readonly Timetable[], configs: readonly TrainOutingConfig[]): TrainOutingRow[] {
  return configs.map((config) => {
    const outboundTrips = findDirectTrains(timetables, config.origin, config.destination);
    const returnTrips = findDirectTrains(timetables, config.destination, config.origin);
    return {
      ...config,
      ...chooseOutingTrips(outboundTrips, returnTrips, parseClock(config.departAfter), parseClock(config.returnAfter)),
      outboundTripsPerDay: outboundTrips.length,
      returnTripsPerDay: returnTrips.length,
      originDeparturesPerDay: countTrainDepartures(timetables, config.origin),
    };
  });
}
