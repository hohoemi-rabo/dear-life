// GTFS-JP のフィードを読み、運行日と時刻を扱う（010・要件 6.3）。
// 取り込みスクリプトから Node で直接読み込むので、外部に依存せず、相対パスの import は拡張子 .ts まで書く
import { parseCsv, type CsvRecord } from "./csv.ts";

// フィードのうち使うファイル。shapes・fare_rules などは読まない
export const REQUIRED_FILES = ["stops.txt", "routes.txt", "trips.txt", "stop_times.txt"] as const;
export const OPTIONAL_FILES = ["calendar.txt", "calendar_dates.txt", "feed_info.txt"] as const;

export type GtfsStop = { stopId: string; name: string; lat: number; lon: number };

export type GtfsStopTime = {
  stopId: string;
  sequence: number;
  // その運行日の 0:00 からの秒。24時を超える便は 86400 以上になる
  arrival: number;
  departure: number;
  // GTFS の pickup_type・drop_off_type が 0（空も 0）のときだけ乗れる・降りられるとみなす。
  // 1 は不可、2・3（電話予約・運転手に申し出）は決まった便として案内できないので不可として扱う
  canBoard: boolean;
  canAlight: boolean;
};

export type GtfsTrip = {
  tripId: string;
  routeName: string;
  serviceId: string;
  headsign: string;
  // stop_sequence の順
  stopTimes: GtfsStopTime[];
};

type WeeklyCalendar = { days: boolean[]; start: string; end: string };

export type GtfsFeed = {
  feedId: string;
  stops: Map<string, GtfsStop>;
  trips: GtfsTrip[];
  calendars: Map<string, WeeklyCalendar>;
  // service_id → 日付（YYYYMMDD）→ 1（追加）/ 2（運休）
  exceptions: Map<string, Map<string, 1 | 2>>;
  // feed_info.txt の有効期間（YYYYMMDD）。ないときは null
  validFrom: string | null;
  validTo: string | null;
  version: string | null;
};

const DATE = /^\d{8}$/;

function requireDate(value: string, label: string): string {
  if (!DATE.test(value)) throw new Error(`${label} の日付が YYYYMMDD ではありません: ${value}`);
  return value;
}

function optionalDate(value: string | undefined, label: string): string | null {
  return value ? requireDate(value, label) : null;
}

// "25:10:00" → 90600。GTFS では翌日にかかる便を 24 時以上で書く
export function parseGtfsTime(value: string): number {
  const match = /^(\d{1,3}):([0-5]\d):([0-5]\d)$/.exec(value);
  if (!match) throw new Error(`時刻の形式が H:MM:SS ではありません: ${value}`);
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

// 90600 → "25:10"。24時を超える時刻はそのまま書く（画面で「翌1:10」などに直す）
export function formatGtfsTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

// "09:00" → 32400（取り込みの設定の時間帯に使う）
export function parseClock(value: string): number {
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(value.trim());
  if (!match) throw new Error(`時刻の形式が H:MM ではありません: ${value}`);
  return Number(match[1]) * 3600 + Number(match[2]) * 60;
}

function canUse(type: string | undefined): boolean {
  return (type ?? "") === "" || type === "0";
}

function parseNumber(value: string, label: string): number {
  const number = Number(value);
  if (value === "" || !Number.isFinite(number)) throw new Error(`${label} が数ではありません: ${value}`);
  return number;
}

function routeName(record: CsvRecord): string {
  return record.route_long_name || record.route_short_name || record.route_id;
}

// ファイル名 → 中身（UTF-8 の文字列）から、フィードを組み立てる
export function parseFeed(feedId: string, files: Record<string, string | undefined>): GtfsFeed {
  for (const name of REQUIRED_FILES) {
    if (files[name] === undefined) throw new Error(`${feedId}：${name} がありません`);
  }
  const read = (name: string) => (files[name] === undefined ? [] : parseCsv(files[name]));

  const stops = new Map<string, GtfsStop>();
  for (const record of read("stops.txt")) {
    // 駅（location_type=1）などの親の行は乗り場ではないので除く
    if (record.location_type && record.location_type !== "0") continue;
    stops.set(record.stop_id, {
      stopId: record.stop_id,
      name: record.stop_name,
      lat: parseNumber(record.stop_lat, `${feedId} stops.txt ${record.stop_id} の緯度`),
      lon: parseNumber(record.stop_lon, `${feedId} stops.txt ${record.stop_id} の経度`),
    });
  }

  const routes = new Map(read("routes.txt").map((record) => [record.route_id, routeName(record)]));

  const stopTimesByTrip = new Map<string, GtfsStopTime[]>();
  for (const record of read("stop_times.txt")) {
    if (!stops.has(record.stop_id)) throw new Error(`${feedId}：stop_times.txt に stops.txt にない ${record.stop_id} がある`);
    // 時刻のない途中の停留所（timepoint=0 で空欄）は、決まった時刻を案内できないので乗り降りの対象にしない
    if (record.arrival_time === "" && record.departure_time === "") continue;
    const arrival = parseGtfsTime(record.arrival_time || record.departure_time);
    const departure = parseGtfsTime(record.departure_time || record.arrival_time);
    const list = stopTimesByTrip.get(record.trip_id) ?? [];
    list.push({
      stopId: record.stop_id,
      sequence: parseNumber(record.stop_sequence, `${feedId} stop_times.txt の stop_sequence`),
      arrival,
      departure,
      canBoard: canUse(record.pickup_type),
      canAlight: canUse(record.drop_off_type),
    });
    stopTimesByTrip.set(record.trip_id, list);
  }

  const trips: GtfsTrip[] = read("trips.txt").map((record) => {
    const name = routes.get(record.route_id);
    if (name === undefined) throw new Error(`${feedId}：trips.txt の ${record.trip_id} の路線 ${record.route_id} がない`);
    const stopTimes = (stopTimesByTrip.get(record.trip_id) ?? []).sort((a, b) => a.sequence - b.sequence);
    return { tripId: record.trip_id, routeName: name, serviceId: record.service_id, headsign: record.trip_headsign, stopTimes };
  });

  const calendars = new Map<string, WeeklyCalendar>();
  for (const record of read("calendar.txt")) {
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => record[day] === "1");
    calendars.set(record.service_id, {
      days,
      start: requireDate(record.start_date, `${feedId} calendar.txt`),
      end: requireDate(record.end_date, `${feedId} calendar.txt`),
    });
  }

  const exceptions = new Map<string, Map<string, 1 | 2>>();
  for (const record of read("calendar_dates.txt")) {
    if (record.exception_type !== "1" && record.exception_type !== "2") {
      throw new Error(`${feedId}：calendar_dates.txt の exception_type が 1・2 ではない: ${record.exception_type}`);
    }
    const dates = exceptions.get(record.service_id) ?? new Map<string, 1 | 2>();
    dates.set(requireDate(record.date, `${feedId} calendar_dates.txt`), record.exception_type === "1" ? 1 : 2);
    exceptions.set(record.service_id, dates);
  }

  const [info] = read("feed_info.txt");
  return {
    feedId,
    stops,
    trips,
    calendars,
    exceptions,
    validFrom: optionalDate(info?.feed_start_date, `${feedId} feed_info.txt`),
    validTo: optionalDate(info?.feed_end_date, `${feedId} feed_info.txt`),
    version: info?.feed_version || null,
  };
}

// YYYYMMDD の曜日（0 = 月曜 … 6 = 日曜。calendar.txt の列の順）
export function weekdayIndex(date: string): number {
  const day = new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(4, 6)) - 1, Number(date.slice(6, 8)))).getUTCDay();
  return (day + 6) % 7;
}

// その日にフィードのデータが有効か。feed_info の有効期間の外は、どの便も走らないとみなす（要件 6.3）
export function isWithinFeed(feed: GtfsFeed, date: string): boolean {
  return (feed.validFrom === null || date >= feed.validFrom) && (feed.validTo === null || date <= feed.validTo);
}

// その日に service_id の便が走るか。calendar_dates の追加・運休を calendar より優先する
export function isServiceActive(feed: GtfsFeed, serviceId: string, date: string): boolean {
  if (!isWithinFeed(feed, date)) return false;
  const exception = feed.exceptions.get(serviceId)?.get(date);
  if (exception !== undefined) return exception === 1;
  const calendar = feed.calendars.get(serviceId);
  if (!calendar) return false;
  return date >= calendar.start && date <= calendar.end && calendar.days[weekdayIndex(date)];
}
