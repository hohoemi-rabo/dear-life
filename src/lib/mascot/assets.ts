// マスコット（042）の動きの元のアニメーション（assets/mascot/）と、画面用の WebP の置き場所。
// まさゆきさんが地区ごとのしぐさを用意する（2026-11-15 は上郷だけ）。scripts/build-mascot.mjs と画面が使う
export const MASCOT_DIR = "mascot";

// マスコットの名前（2026-11-17 まさゆきさん決定）。読み上げとパレットの見出しに使う
export const MASCOT_NAME = "ぽてり";

// frameStep：元のコマを何コマに1つ使うか（上郷は元が 58コマ・1コマ 80ミリ秒。2コマに1つで29コマ・約125KB。
// 2026-11-15 まさゆきさん OK）
// 季節ごとに服装を替える（動きは同じ。2026-11-15 まさゆきさん）。春は着物風、夏はエプロン、秋はニット、冬は帽子とマフラー
export const MASCOT_SOURCES = {
  // 上郷：石段をほうきで掃く（地区の目印の石段。くらしの絵の右上の石段に置く）
  "kamisato-sweep-spring": { source: "kamisato-sweep-spring.gif", frameStep: 2 },
  "kamisato-sweep-summer": { source: "kamisato-sweep-summer.gif", frameStep: 2 },
  // 秋の GIF は背景の内側に、ふちとほんの少しちがう色の四角があるので、ふちの色との差が5以内の色も背景として消す
  "kamisato-sweep-autumn": { source: "kamisato-sweep-autumn.gif", frameStep: 2, nearBackground: 5 },
  "kamisato-sweep-winter": { source: "kamisato-sweep-winter.gif", frameStep: 2 },
  // 鼎：公園で縄跳び（2026-11-15 まさゆきさん。くらしの絵の公園に置く）。元が12〜16コマなので全部のコマを使う。
  // 春・夏・秋はマゼンタの背景で作り直した（2026-11-15。白っぽい背景では跳ぶたびに頭のてっぺんが欠けて見えた）。
  // 冬は白っぽい背景のまま。rope：縄の輪の内側の背景も消す
  "kanae-jumprope-spring": { source: "kanae-jumprope-spring.gif", frameStep: 1, key: "magenta" },
  "kanae-jumprope-summer": { source: "kanae-jumprope-summer.gif", frameStep: 1, key: "magenta" },
  "kanae-jumprope-autumn": { source: "kanae-jumprope-autumn.gif", frameStep: 1, key: "magenta" },
  "kanae-jumprope-winter": { source: "kanae-jumprope-winter.gif", frameStep: 1, rope: "brown" },
  // 伊賀良：コップのジュースをストローで飲む（2026-11-17 まさゆきさん。はじめの案の画架から変えた。
  // くらしの絵の高速バスと路線バスのあいだに置く）。4季節ともマゼンタの背景・20〜28コマ・1コマ80ミリ秒
  "igara-drink-spring": { source: "igara-drink-spring.gif", frameStep: 1, key: "magenta" },
  "igara-drink-summer": { source: "igara-drink-summer.gif", frameStep: 1, key: "magenta" },
  "igara-drink-autumn": { source: "igara-drink-autumn.gif", frameStep: 1, key: "magenta" },
  "igara-drink-winter": { source: "igara-drink-winter.gif", frameStep: 1, key: "magenta" },
  // 中心市街地：くるっと回って踊る（2026-11-17 まさゆきさん。はじめの案のりんごを見上げる・拾うから変わった。
  // くらしの絵のりんご並木の道に置く）。4季節ともマゼンタの背景・13〜17コマ・1コマ80ミリ秒
  "chushin-spin-spring": { source: "chushin-spin-spring.gif", frameStep: 1, key: "magenta" },
  "chushin-spin-summer": { source: "chushin-spin-summer.gif", frameStep: 1, key: "magenta" },
  "chushin-spin-autumn": { source: "chushin-spin-autumn.gif", frameStep: 1, key: "magenta" },
  "chushin-spin-winter": { source: "chushin-spin-winter.gif", frameStep: 1, key: "magenta" },
} as const satisfies Record<string, {
  source: string;
  frameStep: number;
  nearBackground?: number;
  rope?: "brown" | "any";
  // 背景をマゼンタ・緑にしてもらった GIF（scripts/build-mascot.mjs の chromaKey）。steadyScale はカメラの寄り引きをならす。frameHeight は1コマの高さ（px）
  key?: "magenta" | "green";
  steadyScale?: boolean;
  frameHeight?: number;
}>;

export type MascotMotionId = keyof typeof MASCOT_SOURCES;

export function mascotSrc(id: MascotMotionId): string {
  return `/${MASCOT_DIR}/${id}.webp`;
}
