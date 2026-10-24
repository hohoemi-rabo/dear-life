// 取り込んだ GTFS から、バス停（facilities）とおでかけの便（bus_outings）の行を作り、そろえる SQL を書く（010）。
// 通信やファイルの読み書きは scripts/build-bus-sql.mjs が受け持ち、ここは決まった入力から決まった出力を作るだけにする
import { sqlJson, sqlLiteral } from "../sql.ts";
import { TARGET_DISTRICT_IDS } from "../town-district/csv.ts";
import type { DistrictId, TownMapEntry } from "../town-district/resolve.ts";
import { parseCsv } from "./csv.ts";
import { formatGtfsTime, parseClock, type GtfsFeed } from "./feed.ts";
import { DAY_TYPES, planOuting, winterReferenceDate, type DayType, type DirectTrip } from "./outing.ts";

export const BUS_SOURCE_ID = "gtfs_minamishinshu_bus";
export const IIDA_MUNI_CODE = "20205";

// 取り込むフィード（2026-10-23 にまさゆきさんと決めた）。どれも南信州地域交通問題協議会の配布で CC BY 4.0。
// 電気小型バス「プッチー」（Minamishinshu-iida-2）は今回は入れない
export const BUS_FEEDS = [
  { organizationId: "minamishinshu", feedId: "Minamishinshu-Iidacity-1" },
  { organizationId: "minamishinshu", feedId: "Minamishinshu-Shinnan-1" },
  { organizationId: "minamishinshu", feedId: "Minamishinshu-iidacity-3" },
] as const;

export const EXPECTED_LICENSE = "CC BY 4.0";

// GTFS データリポジトリの、フィードの版の情報（/v2/organizations/{org}/feeds/{feed} の gtfs_files の current）
export type FeedMeta = {
  feedId: string;
  organizationId: string;
  feedName: string;
  license: string;
  fileUid: string;
  // feed_info.txt の feed_version
  feedVersion: string | null;
  publishedAt: string;
  // YYYY-MM-DD
  fromDate: string;
  toDate: string;
};

export type LoadedFeed = { meta: FeedMeta; feed: GtfsFeed };

// 緯度経度 → 国土地理院の逆ジオコーダの結果（市区町村コードと町名）。キーは stops.txt の書き方のまま "緯度,経度"
export type StopTown = { muniCode: string; townName: string };

export function coordinateKey(lat: number, lon: number): string {
  return `${lat},${lon}`;
}

// ---------------------------------------------------------------------------
// おでかけの設定（data/bus_outings.csv）

export type OutingConfig = {
  districtId: DistrictId;
  sortOrder: number;
  dayType: DayType;
  origin: string;
  destination: string;
  departAfter: string;
  returnAfter: string;
};

const OUTINGS_HEADER = ["地区", "並び順", "曜日", "乗り場", "行き先", "行きの時刻以降", "帰りの時刻以降"];

function toClockLabel(value: string, label: string): string {
  const seconds = parseClock(value);
  if (seconds >= 24 * 3600) throw new Error(`${label} は 24:00 より前にしてください: ${value}`);
  return formatGtfsTime(seconds);
}

export function parseOutingsCsv(text: string): OutingConfig[] {
  const firstLine = text.replace(/^﻿/, "").split(/\r?\n/, 1)[0];
  if (firstLine !== OUTINGS_HEADER.join(",")) {
    throw new Error(`おでかけの設定の見出しが ${OUTINGS_HEADER.join(",")} ではありません: ${firstLine}`);
  }
  const seen = new Set<string>();
  return parseCsv(text).map((record, index) => {
    const at = `bus_outings.csv ${index + 2}行目`;
    const districtId = TARGET_DISTRICT_IDS[record["地区"]];
    if (!districtId) throw new Error(`${at}：地区が4地区のどれでもない: ${record["地区"]}`);
    const sortOrder = Number(record["並び順"]);
    if (!Number.isInteger(sortOrder) || sortOrder < 1) throw new Error(`${at}：並び順は1以上の整数にする: ${record["並び順"]}`);
    const key = `${districtId}:${sortOrder}`;
    if (seen.has(key)) throw new Error(`${at}：${record["地区"]}の並び順 ${sortOrder} が重複している`);
    seen.add(key);
    const dayType = record["曜日"] as DayType;
    if (!DAY_TYPES.includes(dayType)) throw new Error(`${at}：曜日は ${DAY_TYPES.join("・")} のどれか: ${record["曜日"]}`);
    if (!record["乗り場"] || !record["行き先"]) throw new Error(`${at}：乗り場と行き先が必要`);
    return {
      districtId,
      sortOrder,
      dayType,
      origin: record["乗り場"],
      destination: record["行き先"],
      departAfter: toClockLabel(record["行きの時刻以降"], `${at}：行きの時刻`),
      returnAfter: toClockLabel(record["帰りの時刻以降"], `${at}：帰りの時刻`),
    };
  });
}

// ---------------------------------------------------------------------------
// バス停

export type BusStopRow = {
  sourceKey: string;
  name: string;
  townName: string;
  districtId: DistrictId;
  lat: number;
  lon: number;
  feedIds: string[];
  stopIds: string[];
  routeNames: string[];
};

export type BusStopsResult = {
  rows: BusStopRow[];
  // 逆ジオコーダの結果がない乗り場の緯度経度（取り込みスクリプトが先にそろえる）
  missingCoordinates: string[];
  // 飯田市内なのに対応表にない町名（data/iida_district_map.csv に足すまで取り込めない）
  unmappedTowns: string[];
};

const round = (value: number) => Math.round(value * 1e7) / 1e7;

// 対象4地区の乗り場を、名前と地区ごとに1つのバス停にまとめる。対象外の地区（松尾・羽場など）の乗り場は入れないが、
// 対応表に当てはまるかは確かめる（市内の町名の抜けに気づけるように）。
// 向きごとに分かれた乗り場（1001_01・1001_02 など）は1つに数え、位置は乗り場の平均にする。
// 地区の境にあって乗り場が両側の地区に分かれるバス停は、それぞれの地区に1つずつ数える
export function buildBusStops(
  feeds: readonly LoadedFeed[],
  stopTowns: ReadonlyMap<string, StopTown>,
  resolveTown: (address: string) => TownMapEntry | null,
): BusStopsResult {
  const missingCoordinates = new Set<string>();
  const unmappedTowns = new Set<string>();
  type Group = { name: string; towns: string[]; districtId: DistrictId; cityDistrict: string; poles: { feedId: string; stopId: string; lat: number; lon: number }[]; routes: Set<string> };
  const groups = new Map<string, Group>();

  for (const { feed } of feeds) {
    const routesByStop = new Map<string, Set<string>>();
    for (const trip of feed.trips) {
      for (const stopTime of trip.stopTimes) {
        const routes = routesByStop.get(stopTime.stopId) ?? new Set<string>();
        routes.add(trip.routeName);
        routesByStop.set(stopTime.stopId, routes);
      }
    }
    for (const stop of feed.stops.values()) {
      // 便の止まらない乗り場はバス停として数えない
      const routes = routesByStop.get(stop.stopId);
      if (!routes) continue;
      const key = coordinateKey(stop.lat, stop.lon);
      const town = stopTowns.get(key);
      if (!town) {
        missingCoordinates.add(key);
        continue;
      }
      if (town.muniCode !== IIDA_MUNI_CODE) continue;
      const entry = resolveTown(town.townName);
      if (!entry) {
        unmappedTowns.add(town.townName);
        continue;
      }
      if (entry.districtId === null) continue;
      const groupKey = `${stop.name}|${entry.cityDistrict}`;
      const group = groups.get(groupKey) ?? {
        name: stop.name,
        towns: [],
        districtId: entry.districtId,
        cityDistrict: entry.cityDistrict,
        poles: [],
        routes: new Set<string>(),
      };
      group.towns.push(town.townName);
      group.poles.push({ feedId: feed.feedId, stopId: stop.stopId, lat: stop.lat, lon: stop.lon });
      routes.forEach((route) => group.routes.add(route));
      groups.set(groupKey, group);
    }
  }

  const rows = [...groups.entries()]
    .map(([sourceKey, group]): BusStopRow => ({
      sourceKey,
      name: group.name,
      // 乗り場の町名が分かれるときは、いちばん多い町名（同じ数なら名前の順で先のもの）
      townName: mostCommon(group.towns),
      districtId: group.districtId,
      lat: round(group.poles.reduce((sum, pole) => sum + pole.lat, 0) / group.poles.length),
      lon: round(group.poles.reduce((sum, pole) => sum + pole.lon, 0) / group.poles.length),
      feedIds: [...new Set(group.poles.map((pole) => pole.feedId))].sort(),
      stopIds: group.poles.map((pole) => `${pole.feedId}:${pole.stopId}`).sort(),
      routeNames: [...group.routes].sort(),
    }))
    .sort((a, b) => a.sourceKey.localeCompare(b.sourceKey, "ja"));

  return { rows, missingCoordinates: [...missingCoordinates].sort(), unmappedTowns: [...unmappedTowns].sort() };
}

function mostCommon(values: readonly string[]): string {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ja"))[0][0];
}

// ---------------------------------------------------------------------------
// おでかけの便

export type OutingRow = OutingConfig & {
  serviceDate: string;
  status: "available" | "no_outbound" | "no_return";
  outbound: DirectTrip | null;
  return: DirectTrip | null;
  nextReturn: DirectTrip | null;
  outboundTripsPerDay: number;
  returnTripsPerDay: number;
  originDeparturesPerDay: number;
  validUntil: string;
};

function isoDate(date: string): string {
  return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
}

// 乗り場・行き先の名前がどのフィードにもないときは、書き間違いとして止める（「便がない」と区別する）
export function buildOutings(feeds: readonly LoadedFeed[], configs: readonly OutingConfig[]): OutingRow[] {
  const gtfsFeeds = feeds.map((loaded) => loaded.feed);
  const stopNames = new Set(gtfsFeeds.flatMap((feed) => [...feed.stops.values()].map((stop) => stop.name)));
  const validUntil = gtfsFeeds.map((feed) => feed.validTo).filter((date) => date !== null).sort()[0];
  if (!validUntil) throw new Error("どのフィードにも有効期間（feed_info.txt）がない");

  return configs.map((config) => {
    for (const name of [config.origin, config.destination]) {
      if (!stopNames.has(name)) throw new Error(`バス停「${name}」がフィードにない（bus_outings.csv の書き間違い？）`);
    }
    const serviceDate = winterReferenceDate(gtfsFeeds, config.dayType);
    if (serviceDate === null) throw new Error(`フィードの有効期間に、冬の${config.dayType}の日がない`);
    const plan = planOuting(gtfsFeeds, {
      origin: config.origin,
      destination: config.destination,
      date: serviceDate,
      departAfter: parseClock(config.departAfter),
      returnAfter: parseClock(config.returnAfter),
    });
    return { ...config, ...plan, serviceDate: isoDate(serviceDate), validUntil: isoDate(validUntil) };
  });
}

// ---------------------------------------------------------------------------
// SQL

function tripColumns(trip: DirectTrip | null): string[] {
  return trip === null
    ? ["null", "null", "null"]
    : [sqlLiteral(formatGtfsTime(trip.departure)), sqlLiteral(formatGtfsTime(trip.arrival)), sqlLiteral(trip.routeName)];
}

function japaneseDate(isoDateText: string): string {
  const [year, month, day] = isoDateText.split("-").map(Number);
  return `${year}年${month}月${day}日`;
}

// CC BY 4.0 の表示：作者・データ名・ライセンスとそのリンク・加工したこと
export function buildCreditText(feeds: readonly FeedMeta[]): string {
  const names = feeds.map((feed) => `「${feed.feedName.trim()}」`).join("");
  return (
    `出典：南信州地域交通問題協議会${names}（GTFSデータリポジトリ）。` +
    "CC BY 4.0（https://creativecommons.org/licenses/by/4.0/deed.ja）。" +
    "時刻表から、乗り場と行き先の間の便と本数を抜き出して作成"
  );
}

// フィードごとに有効期間が違うので、どれも有効な期間の終わり（画面がデータ未取得に切り替わる日）を書く
export function buildPeriodLabel(feeds: readonly FeedMeta[]): string {
  const to = feeds.map((feed) => feed.toDate).sort().at(0);
  if (to === undefined) throw new Error("フィードがない");
  return `${japaneseDate(to)}まで有効なダイヤ`;
}

export type BusSqlInput = {
  feeds: readonly FeedMeta[];
  stops: readonly BusStopRow[];
  outings: readonly OutingRow[];
  // 取り込んだ日時（ISO 8601）
  importedAt: string;
};

// バス停・おでかけ・フィードの版・出典を、この取り込みの中身にそろえる SQL。何度当てても同じ結果になる
export function buildBusSql({ feeds, stops, outings, importedAt }: BusSqlInput): string {
  // 空のまま当てると、今あるバス停や便を消してしまうので止める
  if (feeds.length === 0 || stops.length === 0 || outings.length === 0) {
    throw new Error("フィード・バス停・おでかけのどれかが空で、SQL を作れない");
  }
  const source = sqlLiteral(BUS_SOURCE_ID);
  const stopValues = stops
    .map((stop) =>
      [
        "'bus_stop'::public.facility_kind",
        sqlLiteral(stop.name),
        sqlLiteral(stop.townName),
        sqlLiteral(stop.districtId),
        String(stop.lat),
        String(stop.lon),
        source,
        sqlLiteral(stop.sourceKey),
        sqlJson({ feed_ids: stop.feedIds, stop_ids: stop.stopIds, route_names: stop.routeNames }),
      ].join(", "),
    )
    .map((tuple) => `  (${tuple})`)
    .join(",\n");

  const outingValues = outings
    .map((outing) =>
      [
        sqlLiteral(outing.districtId),
        String(outing.sortOrder),
        sqlLiteral(outing.dayType),
        `${sqlLiteral(outing.serviceDate)}::date`,
        sqlLiteral(outing.origin),
        sqlLiteral(outing.destination),
        sqlLiteral(outing.departAfter),
        sqlLiteral(outing.returnAfter),
        sqlLiteral(outing.status),
        ...tripColumns(outing.outbound),
        ...tripColumns(outing.return),
        ...tripColumns(outing.nextReturn),
        String(outing.outboundTripsPerDay),
        String(outing.returnTripsPerDay),
        String(outing.originDeparturesPerDay),
        `${sqlLiteral(outing.validUntil)}::date`,
        source,
      ].join(", "),
    )
    .map((tuple) => `  (${tuple})`)
    .join(",\n");

  const feedValues = feeds
    .map((feed) =>
      [
        sqlLiteral(feed.feedId),
        sqlLiteral(feed.organizationId),
        sqlLiteral(feed.feedName.trim()),
        source,
        sqlLiteral(feed.fileUid),
        sqlLiteral(feed.feedVersion),
        `${sqlLiteral(feed.fromDate)}::date`,
        `${sqlLiteral(feed.toDate)}::date`,
        `${sqlLiteral(feed.publishedAt)}::timestamptz`,
        `${sqlLiteral(importedAt)}::timestamptz`,
      ].join(", "),
    )
    .map((tuple) => `  (${tuple})`)
    .join(",\n");

  return `-- 010 バス（GTFS-JP）の中身を、GTFS データリポジトリの今の版にそろえる。
-- このファイルは npm run bus:sql で作る。手で編集しない（手順は docs/010_ingest-bus-gtfs.md）
-- フィード：${feeds.map((feed) => `${feed.feedId}（${feed.fileUid}）`).join("、")}

update public.data_sources set
  credit_text = ${sqlLiteral(buildCreditText(feeds))},
  period_label = ${sqlLiteral(buildPeriodLabel(feeds))},
  fetched_at = ${sqlLiteral(importedAt)}::timestamptz
where id = ${source};

delete from public.gtfs_feeds where source_id = ${source};
insert into public.gtfs_feeds (feed_id, organization_id, feed_name, source_id, file_uid, feed_version, valid_from, valid_to, published_at, imported_at) values
${feedValues};

delete from public.facilities where source_id = ${source};
insert into public.facilities (kind, name, town_name, district_id, latitude, longitude, source_id, source_key, attributes) values
${stopValues};

delete from public.bus_outings where source_id = ${source};
insert into public.bus_outings (
  district_id, sort_order, day_type, service_date, origin_stop_name, destination_stop_name, depart_after, return_after, status,
  outbound_departure, outbound_arrival, outbound_route_name,
  return_departure, return_arrival, return_route_name,
  next_return_departure, next_return_arrival, next_return_route_name,
  outbound_trips_per_day, return_trips_per_day, origin_departures_per_day, valid_until, source_id
) values
${outingValues};
`;
}
