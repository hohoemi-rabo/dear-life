const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

// 確認日・取得日は "YYYY-MM-DD" で持ち、画面では「2026年10月21日」と出す。
// Date を通さないのは、タイムゾーンで日付がずれないようにするため
export function formatJaDate(isoDate: string): string {
  const match = ISO_DATE.exec(isoDate);
  if (!match) {
    throw new RangeError(`日付は YYYY-MM-DD で渡してください: ${isoDate}`);
  }
  const [, year, month, day] = match;
  return `${year}年${Number(month)}月${Number(day)}日`;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

// 「2027年1月16日（土）」。バスの時刻表を見た日に使う。曜日は UTC で数え、タイムゾーンで日付がずれないようにする
export function formatJaDateWithWeekday(isoDate: string): string {
  const date = formatJaDate(isoDate);
  const [year, month, day] = isoDate.split("-").map(Number);
  return `${date}（${WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]}）`;
}

const SERVICE_TIME = /^(\d{2}):(\d{2})$/;

// バス・電車の時刻（HH:MM）を画面の書き方にする。GTFS では翌日にかかる便が24時以上になるので「翌0:30」と書く（010）
export function formatServiceTime(time: string): string {
  const match = SERVICE_TIME.exec(time);
  if (!match) {
    throw new RangeError(`時刻は HH:MM で渡してください: ${time}`);
  }
  const hours = Number(match[1]);
  const minutes = match[2];
  return hours >= 24 ? `翌${hours - 24}:${minutes}` : `${hours}:${minutes}`;
}

// 円を「万円」で出す（要件 5.1 の書き方）。100万円以上は整数に丸めて桁区切り（3,900万円）、
// それより小さい土地の㎡単価などは小数2桁までにして末尾の0を落とす（2.8万円・1.25万円・0.46万円）
export function formatManYen(yen: number): string {
  if (!Number.isFinite(yen) || yen < 0) {
    throw new RangeError(`金額は0以上の数で渡してください: ${yen}`);
  }
  const man = yen / 10000;
  if (man >= 100) return `${Math.round(man).toLocaleString("ja-JP")}万円`;
  return `${Number(man.toFixed(2))}万円`;
}

const QUARTER = /^(\d{4})Q([1-4])$/;

function formatQuarter(quarter: string): string {
  const match = QUARTER.exec(quarter);
  if (!match) {
    throw new RangeError(`四半期は 2021Q1 の形で渡してください: ${quarter}`);
  }
  return `${match[1]}年第${match[2]}四半期`;
}

// 相場の対象期間（market_stats.period_from・period_to）を「2021年第1四半期〜2026年第1四半期」にする
export function formatQuarterRange(from: string, to: string): string {
  return `${formatQuarter(from)}〜${formatQuarter(to)}`;
}
