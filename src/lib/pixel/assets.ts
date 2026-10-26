// ドット絵の一覧。画面はここから大きさと代替テキストを読み、PNG は public/pixel/<id>.png にある（npm run pixel で書き出す）。
// 描き方は art/index.ts。大きさが描いた絵と合っていることはテストで確かめる
export const PIXEL_DIR = "/pixel";

export const PIXEL_ASSETS = {
  "bg-spring": {
    width: 160,
    height: 90,
    alt: "春の景色。雪の残る山と盆地の家並み、満開の桜と、草地のあいだの道",
  },
  "family-a2-c1": {
    width: 36,
    height: 21,
    alt: "大人2人と子ども1人の家族",
  },
} as const satisfies Record<string, { width: number; height: number; alt: string }>;

export type PixelAssetId = keyof typeof PIXEL_ASSETS;

export function pixelAssetSrc(id: PixelAssetId): string {
  return `${PIXEL_DIR}/${id}.png`;
}
