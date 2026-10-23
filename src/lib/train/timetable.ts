// JR飯田線の時刻の CSV（data/jr_iida_line_up.csv・data/jr_iida_line_down.csv）を読み、駅ごとの発車時刻を取り出す（026）。
// 元は飯田市「公共交通総合案内」の時刻表の PDF（上片桐〜平岡）を、まさゆきさんが書き写したもの。
// 取り込みスクリプトから Node で直接読み込むので、相対パスの import に拡張子を付ける
import { parseCsv } from "../gtfs/csv.ts";
import { formatGtfsTime, parseClock } from "../gtfs/feed.ts";

export const DIRECTIONS = ["上り", "下り"] as const;
export type Direction = (typeof DIRECTIONS)[number];

// 空欄はその区間を走らない、「↓」は通過
const PASS = "↓";

export type TrainStop = { station: string; arrival: number | null; departure: number | null };

export type Train = {
  id: string;
  // 普通・快速 みすず・特急 ワイドビュー伊那路2号 など（元の表記のまま）
  trainType: string;
  // 時刻のある駅だけを、走る順に並べたもの
  stops: TrainStop[];
};

export type Timetable = { direction: Direction; stations: string[]; trains: Train[] };

// 「飯田着」「飯田発」のように、着と発の2行に分かれている駅
const ARRIVAL_SUFFIX = "着";
const DEPARTURE_SUFFIX = "発";

type StationRow = { station: string; kind: "both" | "arrival" | "departure"; cells: string[] };

// 着・発の行は、同じ駅名の行が隣り合っているときだけそう読む（「千代」のように「代」で終わる駅名と混ざらないように）
function readStationRows(rows: string[][]): StationRow[] {
  const result: StationRow[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    const [label, ...cells] = rows[i];
    const next = rows[i + 1]?.[0];
    if (label.endsWith(ARRIVAL_SUFFIX) && next === label.slice(0, -1) + DEPARTURE_SUFFIX) {
      const station = label.slice(0, -1);
      result.push({ station, kind: "arrival", cells }, { station, kind: "departure", cells: rows[i + 1].slice(1) });
      i += 1;
      continue;
    }
    result.push({ station: label, kind: "both", cells });
  }
  return result;
}

function parseCell(value: string, at: string): number | null {
  if (value === "" || value === PASS) return null;
  if (!/^\d{1,2}:\d{2}$/.test(value)) throw new Error(`${at}：時刻は H:MM・空欄・${PASS} のどれか: ${value}`);
  return parseClock(value);
}

export function parseTimetableCsv(text: string, direction: Direction): Timetable {
  const header = text.replace(/^﻿/, "").split(/\r?\n/, 1)[0].split(",");
  if (header[0] !== "駅" || header.length < 2) throw new Error(`時刻の CSV（${direction}）の1行目は「駅,列車1,列車2,…」にする: ${header.join(",")}`);
  const trainIds = header.slice(1);
  if (new Set(trainIds).size !== trainIds.length) throw new Error(`時刻の CSV（${direction}）の列車の名前が重複している`);

  // 1列目の見出し「駅」を列の名前にして読み、行ごとに列車の順に並べ直す
  const rows = parseCsv(text).map((record) => [record["駅"], ...trainIds.map((id) => record[id] ?? "")]);
  const [typeRow, ...body] = rows;
  if (typeRow?.[0] !== "種別") throw new Error(`時刻の CSV（${direction}）の2行目は「種別,…」にする`);
  const stationRows = readStationRows(body);
  const stations = [...new Set(stationRows.map((row) => row.station))];
  if (stations.length !== stationRows.filter((row) => row.kind !== "departure").length) {
    throw new Error(`時刻の CSV（${direction}）に同じ駅の行が2つある`);
  }

  const trains = trainIds.map((id, column): Train => {
    const trainType = typeRow[column + 1];
    if (!trainType) throw new Error(`時刻の CSV（${direction}）の ${id} に種別がない`);
    const stops: TrainStop[] = [];
    for (const row of stationRows) {
      const time = parseCell(row.cells[column], `${direction} ${id} ${row.station}`);
      if (time === null) continue;
      const last = stops.at(-1);
      if (row.kind === "departure" && last?.station === row.station) {
        last.departure = time;
        continue;
      }
      stops.push({
        station: row.station,
        arrival: row.kind === "departure" ? null : time,
        departure: row.kind === "arrival" ? null : time,
      });
    }
    // 着だけの行（その駅止まり）は発車しない。時刻が戻っていたら書き写しの誤りとして止める
    let previous = -1;
    for (const stop of stops) {
      for (const time of [stop.arrival, stop.departure]) {
        if (time === null) continue;
        if (time < previous) throw new Error(`${direction} ${id} の ${stop.station} の時刻（${formatGtfsTime(time)}）が前の駅より早い`);
        previous = time;
      }
    }
    return { id, trainType, stops };
  });

  return { direction, stations, trains };
}

export type Departure = { direction: Direction; departure: string; trainType: string; trainId: string };

// その駅を発車する列車（時刻の早い順）。その駅止まりの列車と、通過する列車は入れない
export function departuresAt(timetable: Timetable, station: string): Departure[] {
  if (!timetable.stations.includes(station)) throw new Error(`駅「${station}」が時刻の CSV（${timetable.direction}）にない`);
  return timetable.trains
    .flatMap((train) => {
      const index = train.stops.findIndex((stop) => stop.station === station);
      const stop = train.stops[index];
      if (!stop || index === train.stops.length - 1 || stop.departure === null) return [];
      return [{ direction: timetable.direction, departure: stop.departure, trainType: train.trainType, trainId: train.id }];
    })
    .sort((a, b) => a.departure - b.departure)
    .map((item) => ({ ...item, departure: formatGtfsTime(item.departure) }));
}
