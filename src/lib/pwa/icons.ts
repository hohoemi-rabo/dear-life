// ホーム画面のアイコンの一覧（024）。PNG は public/icons/ にあり、npm run pixel で書き出す。
// manifest（src/app/manifest.ts）・iPhone 用のアイコン（layout.tsx）と書き出しの両方がここを読む
export const ICON_DIR = "/icons";

export type AppIcon = {
  file: string;
  // 描くドット数と、整数倍の拡大。ドット数 × 拡大 が px の大きさになる
  dots: number;
  scale: number;
};

export const APP_ICONS = {
  // Android・manifest 用。家と木は真ん中の円に収めてあるので、同じ絵を maskable にも使う
  icon192: { file: "icon-192.png", dots: 32, scale: 6 },
  icon512: { file: "icon-512.png", dots: 32, scale: 16 },
  // iPhone のホーム画面用（180px）。32 では割り切れないので 36ドットで描き、空と草地を広げる
  apple: { file: "apple-touch-icon.png", dots: 36, scale: 5 },
} as const satisfies Record<string, AppIcon>;

export function appIconSrc(icon: AppIcon): string {
  return `${ICON_DIR}/${icon.file}`;
}

export function appIconPx(icon: AppIcon): number {
  return icon.dots * icon.scale;
}
