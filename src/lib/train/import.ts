// SENA の駅の CSV と JR飯田線の時刻の CSV から、4地区の駅（facilities）と発車時刻（train_departures）の行を作り、
// そろえる SQL を書く（026）。通信やファイルの読み書きは scripts/build-train-sql.mjs が受け持つ
import { parseCsv } from "../gtfs/csv.ts";
import { IIDA_MUNI_CODE, coordinateKey, type StopTown } from "../gtfs/import.ts";
import type { DistrictId, TownMapEntry } from "../town-district/resolve.ts";
import { departuresAt, type Departure, type Timetable } from "./timetable.ts";

export const STATION_SOURCE_ID = "sena_iida_line_stations";
export const TIMETABLE_SOURCE_ID = "iida_jr_timetable";

// 時刻表の版。ダイヤ改正で CSV を作り直したら、ここも直す（手順は docs/026_train-stations-timetable.md）
export const TIMETABLE_REVISION = { revisedOn: "2026-03-14", eraLabel: "令和8年3月14日改正" } as const;

export const STATIONS_CSV_URL = "https://sena-opendata.jp/uploads/dataset/270.csv";
const STATIONS_HEADER = ["No", "駅名", "ふりがな", "起点からの距離", "所在市町村", "郵便番号", "住所", "経度", "緯度"];
const IIDA_CITY_LABEL = "長野県飯田市";

export type SenaStation = { name: string; kana: string; kilometers: number; city: string; lat: number; lon: number };

export function parseStationsCsv(text: string): SenaStation[] {
  const header = text.replace(/^﻿/, "").split(/\r?\n/, 1)[0];
  if (header !== STATIONS_HEADER.join(",")) throw new Error(`駅の CSV の見出しが ${STATIONS_HEADER.join(",")} ではない: ${header}`);
  return parseCsv(text).map((record, index) => {
    const at = `駅の CSV ${index + 2}行目`;
    const lat = Number(record["緯度"]);
    const lon = Number(record["経度"]);
    // 飯田線の駅は北緯34〜36度・東経137〜138度にある。経度と緯度が入れ替わっていたら止める
    if (!(lat > 34 && lat < 36 && lon > 137 && lon < 138)) throw new Error(`${at}：緯度経度が飯田線の範囲にない: ${lat},${lon}`);
    const kilometers = Number(record["起点からの距離"].replace(/km$/, ""));
    if (!record["駅名"] || !Number.isFinite(kilometers)) throw new Error(`${at}：駅名か起点からの距離がない`);
    return { name: record["駅名"], kana: record["ふりがな"], kilometers, city: record["所在市町村"], lat, lon };
  });
}

export type StationRow = SenaStation & { townName: string; districtId: DistrictId };

export type StationsResult = {
  rows: StationRow[];
  // 逆ジオコーダの結果がない駅の緯度経度（取り込みスクリプトが先にそろえる）
  missingCoordinates: string[];
  // 飯田市内なのに対応表にない町名（data/iida_district_map.csv に足すまで取り込めない）
  unmappedTowns: string[];
};

// 飯田市内の駅を、位置の町名で4地区に振り分ける（バス停と同じ。010）。地区内の駅だけを入れ、近くの駅は入れない
// （2026-10-23 まさゆきさん決定。伊賀良は駅なし）
export function buildStations(
  stations: readonly SenaStation[],
  stationTowns: ReadonlyMap<string, StopTown>,
  resolveTown: (address: string) => TownMapEntry | null,
): StationsResult {
  const rows: StationRow[] = [];
  const missingCoordinates: string[] = [];
  const unmappedTowns = new Set<string>();
  for (const station of stations) {
    if (station.city !== IIDA_CITY_LABEL) continue;
    const key = coordinateKey(station.lat, station.lon);
    const town = stationTowns.get(key);
    if (!town) {
      missingCoordinates.push(key);
      continue;
    }
    if (town.muniCode !== IIDA_MUNI_CODE) continue;
    const entry = resolveTown(town.townName);
    if (!entry) {
      unmappedTowns.add(town.townName);
      continue;
    }
    if (entry.districtId === null) continue;
    rows.push({ ...station, townName: town.townName, districtId: entry.districtId });
  }
  return { rows, missingCoordinates, unmappedTowns: [...unmappedTowns].sort() };
}

export type DepartureRow = Departure & { station: string; districtId: DistrictId };

// 4地区の駅の発車時刻。駅が時刻の CSV にないときは止める（駅名の書き方の違いに気づけるように）
export function buildDepartures(stations: readonly StationRow[], timetables: readonly Timetable[]): DepartureRow[] {
  return stations.flatMap((station) =>
    timetables.flatMap((timetable) =>
      departuresAt(timetable, station.name).map((departure) => ({ ...departure, station: station.name, districtId: station.districtId })),
    ),
  );
}

// ---------------------------------------------------------------------------
// SQL

function sqlLiteral(value: string | null): string {
  return value === null ? "null" : `'${value.replace(/'/g, "''")}'`;
}

function sqlJson(value: unknown): string {
  return `${sqlLiteral(JSON.stringify(value))}::jsonb`;
}

// CC BY 2.1 JP の表示と、SENA の利用規約 第6条の出所（作成者の組織名・リソースの名称・リソースの URL）
export const STATION_CREDIT_TEXT =
  "出典：三遠南信地域連携ビジョン推進会議（SENA）「JR飯田線の駅.csv」（https://sena-opendata.jp/dataset/detail/35）。" +
  "CC BY 2.1 JP（https://creativecommons.org/licenses/by/2.1/jp/）。飯田市内の4地区の駅を抜き出して作成";

export function buildTimetableCreditText(): string {
  return `出典：飯田市「公共交通総合案内」JR飯田線 時刻表（${TIMETABLE_REVISION.eraLabel}）をもとに作成`;
}

export type TrainSqlInput = {
  stations: readonly StationRow[];
  departures: readonly DepartureRow[];
  // 取り込んだ日（YYYY-MM-DD）
  importedOn: string;
};

// 駅・発車時刻・出典を、この取り込みの中身にそろえる SQL。何度当てても同じ結果になる
export function buildTrainSql({ stations, departures, importedOn }: TrainSqlInput): string {
  // 空のまま当てると、今ある駅や時刻を消してしまうので止める
  if (stations.length === 0 || departures.length === 0) throw new Error("駅か発車時刻が空で、SQL を作れない");
  const stationSource = sqlLiteral(STATION_SOURCE_ID);
  const timetableSource = sqlLiteral(TIMETABLE_SOURCE_ID);

  const stationValues = stations
    .map((station) =>
      [
        "'train_station'::public.facility_kind",
        sqlLiteral(station.name),
        sqlLiteral(station.townName),
        sqlLiteral(station.districtId),
        String(station.lat),
        String(station.lon),
        stationSource,
        sqlLiteral(station.name),
        sqlJson({ kana: station.kana, line: "JR飯田線", kilometers: station.kilometers }),
      ].join(", "),
    )
    .map((tuple) => `  (${tuple})`)
    .join(",\n");

  const departureValues = departures
    .map((departure) =>
      [
        sqlLiteral(departure.districtId),
        sqlLiteral(departure.station),
        sqlLiteral(departure.direction),
        sqlLiteral(departure.departure),
        sqlLiteral(departure.trainType),
        sqlLiteral(departure.trainId),
        timetableSource,
      ].join(", "),
    )
    .map((tuple) => `  (${tuple})`)
    .join(",\n");

  const [year, month, day] = TIMETABLE_REVISION.revisedOn.split("-").map(Number);
  return `-- 026 電車（JR飯田線）の駅と発車時刻を、data/jr_iida_line_*.csv と SENA の駅の CSV にそろえる。
-- このファイルは npm run train:sql で作る。手で編集しない（手順は docs/026_train-stations-timetable.md）

update public.data_sources set
  credit_text = ${sqlLiteral(STATION_CREDIT_TEXT)},
  checked_on = ${sqlLiteral(importedOn)}::date
where id = ${stationSource};

update public.data_sources set
  credit_text = ${sqlLiteral(buildTimetableCreditText())},
  period_label = ${sqlLiteral(`${year}年${month}月${day}日改正のダイヤ`)},
  checked_on = ${sqlLiteral(importedOn)}::date
where id = ${timetableSource};

delete from public.facilities where source_id = ${stationSource};
insert into public.facilities (kind, name, town_name, district_id, latitude, longitude, source_id, source_key, attributes) values
${stationValues};

delete from public.train_departures where source_id = ${timetableSource};
insert into public.train_departures (district_id, station_name, direction, departure, train_type, train_id, source_id) values
${departureValues};
`;
}
