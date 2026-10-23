// 冬・車0台の「おでかけ」の便と本数を、時刻表から決める（010・要件 6.3）。
// 乗り換えは探さない（経路検索は gofreely の役目）。乗り場から行き先まで1本で行ける便（直通便）だけを使う。
// 同じ条件なら必ず同じ便になるよう、日付と時間帯は呼ぶ側が固定で渡す
import { isServiceActive, weekdayIndex, type GtfsFeed, type GtfsTrip } from "./feed.ts";

export type DayType = "平日" | "土曜" | "日曜";

export const DAY_TYPES: readonly DayType[] = ["平日", "土曜", "日曜"];

export type DirectTrip = {
  feedId: string;
  tripId: string;
  routeName: string;
  headsign: string;
  fromStopId: string;
  toStopId: string;
  // 運行日の 0:00 からの秒（24時を超えることがある）
  departure: number;
  arrival: number;
};

function activeTrips(feeds: readonly GtfsFeed[], date: string): { feed: GtfsFeed; trip: GtfsTrip }[] {
  return feeds.flatMap((feed) =>
    feed.trips.filter((trip) => isServiceActive(feed, trip.serviceId, date)).map((trip) => ({ feed, trip })),
  );
}

// その日に、from（バス停の名前）で乗って to で降りられる便。発車の早い順。
// 乗り場は名前で探す（同じ名前の乗り場が向きごとに分かれていても、まとめて1つのバス停として扱う）。
// 循環線のように同じバス停を2回通る便では、降りる停留所より前で最後に乗れる所から乗る（乗っている時間がいちばん短い）
export function findDirectTrips(feeds: readonly GtfsFeed[], from: string, to: string, date: string): DirectTrip[] {
  if (from === to) throw new Error(`乗り場と行き先が同じです: ${from}`);
  const found: DirectTrip[] = [];
  for (const { feed, trip } of activeTrips(feeds, date)) {
    let boarding: number | null = null;
    for (let index = 0; index < trip.stopTimes.length; index += 1) {
      const stopTime = trip.stopTimes[index];
      const name = feed.stops.get(stopTime.stopId)?.name;
      if (name === to && stopTime.canAlight && boarding !== null) {
        const board = trip.stopTimes[boarding];
        found.push({
          feedId: feed.feedId,
          tripId: trip.tripId,
          routeName: trip.routeName,
          headsign: trip.headsign,
          fromStopId: board.stopId,
          toStopId: stopTime.stopId,
          departure: board.departure,
          arrival: stopTime.arrival,
        });
        break;
      }
      if (name === from && stopTime.canBoard) boarding = index;
    }
  }
  return found.sort((a, b) => a.departure - b.departure || a.arrival - b.arrival || a.tripId.localeCompare(b.tripId));
}

// その日に、そのバス停から乗れる便の数（行き先・向きを問わない）。終点で降りるだけの便は数えない
export function countDepartures(feeds: readonly GtfsFeed[], stopName: string, date: string): number {
  return activeTrips(feeds, date).filter(({ feed, trip }) =>
    trip.stopTimes.some(
      (stopTime, index) =>
        index < trip.stopTimes.length - 1 && stopTime.canBoard && feed.stops.get(stopTime.stopId)?.name === stopName,
    ),
  ).length;
}

function toDate(year: number, month: number, day: number): string {
  return `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;
}

const DAY_TYPE_WEEKDAYS: Record<DayType, readonly number[]> = { 平日: [0, 1, 2, 3, 4], 土曜: [5], 日曜: [6] };

// 冬の場面に使う日。1月15日〜2月末のうち、その曜日に当たる最初の日で、どのフィードでも有効期間内のもの。
// 年末年始と成人の日を避けるため1月15日から探す（1月15日〜2月10日に祝日はない）。見つからなければ null（データ未取得の扱い）
export function winterReferenceDate(feeds: readonly GtfsFeed[], dayType: DayType): string | null {
  const from = feeds.map((feed) => feed.validFrom).filter((date) => date !== null).sort().at(-1) ?? null;
  const to = feeds.map((feed) => feed.validTo).filter((date) => date !== null).sort().at(0) ?? null;
  if (from === null || to === null || from > to) return null;
  const weekdays = DAY_TYPE_WEEKDAYS[dayType];
  for (let year = Number(from.slice(0, 4)); year <= Number(to.slice(0, 4)); year += 1) {
    for (let offset = 0; offset < 45; offset += 1) {
      const day = new Date(Date.UTC(year, 0, 15 + offset));
      if (day.getUTCMonth() > 1) break;
      const date = toDate(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate());
      if (date >= from && date <= to && weekdays.includes(weekdayIndex(date))) return date;
    }
  }
  return null;
}

export type OutingRequest = {
  origin: string;
  destination: string;
  date: string;
  // 行きは departAfter 以降に出る最初の便、帰りは returnAfter 以降（かつ行きの到着より後）に出る最初の便とその次の便
  departAfter: number;
  returnAfter: number;
};

export type OutingStatus = "available" | "no_outbound" | "no_return";

export type OutingPlan = {
  status: OutingStatus;
  outbound: DirectTrip | null;
  return: DirectTrip | null;
  nextReturn: DirectTrip | null;
  // その日の、乗り場から行き先への直通便の数と、行き先から乗り場への直通便の数
  outboundTripsPerDay: number;
  returnTripsPerDay: number;
  // その日に乗り場から乗れる便の数（行き先を問わない）
  originDeparturesPerDay: number;
};

// 同じ時刻か後に出て、同じ時刻か先に着く便がある便を除く（循環線を遠回りする便など）。
// 残った便は、発車の順と到着の順が同じになる。発車も到着も同じ便が2本あれば、並びの後ろの方を残す。
// 1日の直通便は多くても数十本なので、すべての組を比べる
export function withoutOvertakenTrips(trips: readonly DirectTrip[]): DirectTrip[] {
  return trips.filter((trip, index) =>
    trips.every((other, otherIndex) => {
      if (otherIndex === index || other.departure < trip.departure || other.arrival > trip.arrival) return true;
      const sameTimes = other.departure === trip.departure && other.arrival === trip.arrival;
      return sameTimes && otherIndex < index;
    }),
  );
}

export function planOuting(feeds: readonly GtfsFeed[], request: OutingRequest): OutingPlan {
  const outboundTrips = findDirectTrips(feeds, request.origin, request.destination, request.date);
  const returnTrips = findDirectTrips(feeds, request.destination, request.origin, request.date);
  const outbound = withoutOvertakenTrips(outboundTrips).find((trip) => trip.departure >= request.departAfter) ?? null;
  const returns = outbound
    ? withoutOvertakenTrips(returnTrips).filter((trip) => trip.departure >= Math.max(request.returnAfter, outbound.arrival))
    : [];
  return {
    status: outbound === null ? "no_outbound" : returns.length === 0 ? "no_return" : "available",
    outbound,
    return: returns[0] ?? null,
    nextReturn: returns[1] ?? null,
    outboundTripsPerDay: outboundTrips.length,
    returnTripsPerDay: returnTrips.length,
    originDeparturesPerDay: countDepartures(feeds, request.origin, request.date),
  };
}
