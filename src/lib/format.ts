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
