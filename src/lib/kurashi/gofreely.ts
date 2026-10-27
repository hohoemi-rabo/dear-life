// 冬・車0台のおでかけの便を gofreely で調べるリンク（要件 1.1・6.3）。
// gofreely の検索の欄（出発地・目的地・日付・到着したい時刻・帰りに出発したい時刻）に入れる値を URL パラメータで渡す。
// 2026-10-27 時点の gofreely はパラメータを読まないので、トップページが開くだけになる。名前と形は 018 の「gofreely へ渡す値」が正
import type { BusOuting } from "../data/screen-data.ts";
import { GOFREELY_URL } from "../site.ts";

export const GOFREELY_PARAMS = {
  from: "from",
  to: "to",
  date: "date",
  arriveBy: "arrive",
  returnAfter: "return",
} as const;

export function gofreelyHref(outing: BusOuting): string {
  const params = new URLSearchParams({
    [GOFREELY_PARAMS.from]: outing.originName,
    [GOFREELY_PARAMS.to]: outing.destinationName,
    [GOFREELY_PARAMS.date]: outing.serviceDate,
    // 時刻は GTFS の書き方（HH:MM、24時以上もありうる）のまま渡す
    [GOFREELY_PARAMS.arriveBy]: outing.outbound.arrival,
    [GOFREELY_PARAMS.returnAfter]: outing.return.departure,
  });
  return `${GOFREELY_URL}?${params.toString()}`;
}
