// ホーム画面のアイコンの一覧（024）。PNG は public/icons/ にあり、npm run illust がロゴの家（logo-mark）から書き出す。
// manifest（src/app/manifest.ts）・iPhone 用のアイコン（layout.tsx）と書き出しの両方がここを読む
export const ICON_DIR = "/icons";

// アイコンの背景（2026-11-17 まさゆきさん決定。ロゴの家の壁に近いクリーム色）。透明にすると、端末によって黒や白で埋められる
export const APP_ICON_BACKGROUND = "#FFF8E7";

// 家をどの大きさで置くか。
//   - "fit"：家の縦横の長いほうを、アイコンの一辺の ART_RATIO にする（iPhone・ふつうのアイコン。四すみが少し丸く切られるだけ）
//   - "maskable"：家のどの角も、真ん中の円（直径の80%）に収める。Android は丸や角丸に切り抜くので、切れても家が欠けないようにする
export type AppIconFit = "fit" | "maskable";
export const ART_RATIO = 0.75;
export const MASKABLE_SAFE_DIAMETER = 0.8;

export type AppIcon = {
  file: string;
  px: number;
  fit: AppIconFit;
};

export const APP_ICONS = {
  icon192: { file: "icon-192.png", px: 192, fit: "fit" },
  icon512: { file: "icon-512.png", px: 512, fit: "fit" },
  maskable512: { file: "icon-maskable-512.png", px: 512, fit: "maskable" },
  // iPhone のホーム画面用
  apple: { file: "apple-touch-icon.png", px: 180, fit: "fit" },
} as const satisfies Record<string, AppIcon>;

// ブラウザのタブのファビコン（src/app/favicon.ico。2026-11-17 にロゴの家にした）。小さい場所なので背景は透明にし、家を正方形いっぱいに置く。
// 1つの .ico に 16・32・48px を入れ、ブラウザが画面の細かさに合わせて選ぶ
export const FAVICON_FILE = "src/app/favicon.ico";
export const FAVICON_SIZES = [16, 32, 48] as const;

export function appIconSrc(icon: AppIcon): string {
  return `${ICON_DIR}/${icon.file}`;
}

export function appIconSizes(icon: AppIcon): string {
  return `${icon.px}x${icon.px}`;
}

// 家（縦横 artWidth × artHeight）を一辺 icon.px のアイコンに置くときの、家の横幅・高さ（px）
export function appIconArtSize(icon: AppIcon, artWidth: number, artHeight: number): { width: number; height: number } {
  const scale =
    icon.fit === "fit"
      ? (icon.px * ART_RATIO) / Math.max(artWidth, artHeight)
      : (icon.px * MASKABLE_SAFE_DIAMETER) / Math.hypot(artWidth, artHeight);
  return { width: Math.round(artWidth * scale), height: Math.round(artHeight * scale) };
}
