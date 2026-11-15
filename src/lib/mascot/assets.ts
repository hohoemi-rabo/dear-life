// マスコット（042）の動きの元のアニメーション（assets/mascot/）と、画面用の WebP の置き場所。
// まさゆきさんが地区ごとのしぐさを用意する（2026-11-15 は上郷だけ）。scripts/build-mascot.mjs と画面が使う
export const MASCOT_DIR = "mascot";

// frameStep：元のコマを何コマに1つ使うか（上郷は元が 58コマ・1コマ 80ミリ秒。2コマに1つで29コマ・約125KB。
// 2026-11-15 まさゆきさん OK）
export const MASCOT_SOURCES = {
  // 上郷：石段をほうきで掃く（地区の目印の石段。くらしの絵の右上の石段に置く）
  "kamisato-sweep": { source: "kamisato-sweep.gif", frameStep: 2 },
} as const satisfies Record<string, { source: string; frameStep: number }>;

export type MascotMotionId = keyof typeof MASCOT_SOURCES;

export function mascotSrc(id: MascotMotionId): string {
  return `/${MASCOT_DIR}/${id}.webp`;
}
