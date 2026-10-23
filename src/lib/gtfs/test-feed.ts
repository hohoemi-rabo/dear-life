// テスト用の小さな GTFS フィードを作る（010 のテストだけで使う）
import { parseFeed, type GtfsFeed } from "./feed";

export type TestStopTime = {
  stop: string;
  time: string;
  // 0：通常、1：不可。省略は 0
  pickup?: string;
  dropOff?: string;
};

export type TestTrip = { id: string; route?: string; service: string; stops: TestStopTime[] };

export type TestFeedOptions = {
  feedId?: string;
  // 停留所の ID → 名前。同じ名前の乗り場を2つ（向きごと）作るときは ID を分ける
  stops: Record<string, string>;
  trips: TestTrip[];
  // service_id → 月〜日の 7 文字（例 "1111100"）
  calendars?: Record<string, string>;
  // service_id → 日付 → 1（追加）/ 2（運休）
  exceptions?: Record<string, Record<string, 1 | 2>>;
  validFrom?: string;
  validTo?: string;
};

export function buildTestFeed(options: TestFeedOptions): GtfsFeed {
  const {
    feedId = "test-feed",
    stops,
    trips,
    calendars = { 平日: "1111100", 土曜: "0000010", 日曜: "0000001" },
    exceptions = {},
    validFrom = "20260401",
    validTo = "20270331",
  } = options;
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const routes = [...new Set(trips.map((trip) => trip.route ?? "R1"))];
  return parseFeed(feedId, {
    "stops.txt": [
      "stop_id,stop_name,stop_lat,stop_lon",
      ...Object.entries(stops).map(([id, name], index) => `${id},${name},35.5${index},137.8${index}`),
    ].join("\n"),
    "routes.txt": ["route_id,route_long_name", ...routes.map((route) => `${route},${route}線`)].join("\n"),
    "trips.txt": ["route_id,service_id,trip_id,trip_headsign", ...trips.map((trip) => `${trip.route ?? "R1"},${trip.service},${trip.id},`)].join("\n"),
    "stop_times.txt": [
      "trip_id,arrival_time,departure_time,stop_id,stop_sequence,pickup_type,drop_off_type",
      ...trips.flatMap((trip) =>
        trip.stops.map((stopTime, index) =>
          [trip.id, stopTime.time, stopTime.time, stopTime.stop, index + 1, stopTime.pickup ?? "0", stopTime.dropOff ?? "0"].join(","),
        ),
      ),
    ].join("\n"),
    "calendar.txt": [
      `service_id,${days.join(",")},start_date,end_date`,
      ...Object.entries(calendars).map(([id, pattern]) => `${id},${pattern.split("").join(",")},${validFrom},${validTo}`),
    ].join("\n"),
    "calendar_dates.txt": [
      "service_id,date,exception_type",
      ...Object.entries(exceptions).flatMap(([id, dates]) => Object.entries(dates).map(([date, type]) => `${id},${date},${type}`)),
    ].join("\n"),
    "feed_info.txt": `feed_publisher_name,feed_lang,feed_start_date,feed_end_date,feed_version\nテスト,ja,${validFrom},${validTo},v1`,
  });
}
