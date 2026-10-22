// Cron は UTC で動くので、その日に何をやるかは日本時間の日付で決める
export type JstDate = {
  year: number;
  // 1〜12
  month: number;
  day: number;
  // 0（日）〜6（土）
  weekday: number;
  // 例：2026-10-22
  iso: string;
};

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function toJstDate(epochMs: number): JstDate {
  const shifted = new Date(epochMs + JST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
    iso: shifted.toISOString().slice(0, 10),
  };
}
