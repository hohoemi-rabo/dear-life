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
