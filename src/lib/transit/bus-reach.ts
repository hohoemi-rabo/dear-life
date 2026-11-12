// 冬・車0台のバスのおでかけを、バス停の名前を出さずに伝える一文（036。2026-11-11 まさゆきさん：
// 乗る所は住む場所で決まるので、名前を出すと「そのバス停から乗る」と受け取られる）。
// 家の近くのバス停からの便は gofreely で調べてもらう（要件 1.1）
import type { BusOuting } from "../data/screen-data.ts";
import { formatJaDateWithWeekday } from "../format.ts";

// 「11か所すべて」「16か所のうち8か所」。行けるバス停がなければ null
export function reachableStopsPhrase(outing: Pick<BusOuting, "districtStopCount" | "reachableStopCount">): string | null {
  const { districtStopCount: all, reachableStopCount: reachable } = outing;
  if (reachable === 0) return null;
  return reachable === all ? `${all}か所すべて` : `${all}か所のうち${reachable}か所`;
}

// 「上郷のバス停11か所すべてから、飯田駅へ乗りかえなしで行けるバスがあります。」
export function busReachSentence(districtName: string, outing: BusOuting): string {
  const phrase = reachableStopsPhrase(outing);
  return phrase === null
    ? `${districtName}のバス停からは、${outing.destinationPlace}へ乗りかえなしで行けるバスはありません。`
    : `${districtName}のバス停${phrase}から、${outing.destinationPlace}へ乗りかえなしで行けるバスがあります。`;
}

// いつの時刻表で数えたか（「2027年1月16日（土）の時刻表で数えました」）
export function busReachDateNote(outing: Pick<BusOuting, "serviceDate">): string {
  return `${formatJaDateWithWeekday(outing.serviceDate)}の時刻表で数えました`;
}

// 行ける場所（036・038）の1日の本数：「4〜14本／日」。どのバス停も同じなら「4本／日」（038 見本）
export function tripsPerDayRange(min: number, max: number): string {
  return min === max ? `${min}本／日` : `${min}〜${max}本／日`;
}
