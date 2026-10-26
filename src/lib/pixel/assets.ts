// ドット絵の一覧。画面はここから大きさと代替テキストを読み、PNG は public/pixel/<id>.png にある（npm run pixel で書き出す）。
// 描き方は art/index.ts。大きさが描いた絵と合っていることはテストで確かめる
import type { DistrictId } from "../town-district/resolve.ts";

export const PIXEL_DIR = "/pixel";

export const PIXEL_ASSETS = {
  // 季節の背景（地区共通）
  "bg-spring": { width: 160, height: 90, alt: "春の景色。雪の残る山と盆地の家並み、満開の桜と、草地のあいだの道" },
  "bg-summer": { width: 160, height: 90, alt: "夏の景色。入道雲と緑の山、青々とした田んぼと、緑の木のあいだの道" },
  "bg-autumn": { width: 160, height: 90, alt: "秋の景色。色づいた山と実った田んぼ、紅葉した木のあいだの道" },
  "bg-winter": { width: 160, height: 90, alt: "冬の景色。雪をかぶった山と家並み、雪の積もった畑と、葉の落ちた木のあいだの道" },
  // 家族（大人の数・子どもの数）
  "family-a1-c0": { width: 12, height: 21, alt: "大人1人" },
  "family-a1-c1": { width: 23, height: 21, alt: "大人1人と子ども1人の家族" },
  "family-a1-c2": { width: 34, height: 21, alt: "大人1人と子ども2人の家族" },
  "family-a1-c3": { width: 45, height: 21, alt: "大人1人と子ども3人の家族" },
  "family-a2-c0": { width: 25, height: 21, alt: "大人2人" },
  "family-a2-c1": { width: 36, height: 21, alt: "大人2人と子ども1人の家族" },
  "family-a2-c2": { width: 47, height: 21, alt: "大人2人と子ども2人の家族" },
  "family-a2-c3": { width: 58, height: 21, alt: "大人2人と子ども3人の家族" },
  // 施設（春・夏の場面）
  "facility-school": { width: 40, height: 24, alt: "時計台のある小学校の校舎" },
  "facility-nursery": { width: 28, height: 18, alt: "三角屋根の保育園の建物" },
  "facility-public": { width: 34, height: 18, alt: "公民館などの公共施設の建物" },
  "facility-shelter": { width: 40, height: 22, alt: "避難場所の体育館と、避難場所の案内板" },
  // 行事（district_events.art の種類ごと）
  "event-festival": { width: 34, height: 24, alt: "提灯を下げた舞台と人形" },
  "event-sports": { width: 36, height: 22, alt: "旗を渡したロープと運動会のテント" },
  "event-culture": { width: 34, height: 22, alt: "絵を掛けた展示板と、花を生けた机" },
  "event-other": { width: 28, height: 22, alt: "行事のお知らせを貼った地区の掲示板" },
  // 乗り物（冬の場面）
  "vehicle-car": { width: 26, height: 14, alt: "屋根に雪の積もった車" },
  "vehicle-bus": { width: 42, height: 20, alt: "屋根に雪の積もった路線バス" },
  "vehicle-train": { width: 52, height: 22, alt: "線路を走る電車" },
  // 地区の目印
  "landmark-chushin": { width: 48, height: 20, alt: "赤い実の付いたりんご並木" },
  "landmark-kanae": { width: 44, height: 20, alt: "すべり台とぶらんこのある公園" },
  "landmark-igara": { width: 24, height: 26, alt: "風景画を載せた画架" },
  "landmark-kamisato": { width: 60, height: 26, alt: "家並みの手前に見える緑の山" },
  "landmark-chushin-winter": { width: 48, height: 20, alt: "雪の積もったりんご並木" },
  "landmark-kanae-winter": { width: 44, height: 20, alt: "雪の積もったすべり台とぶらんこのある公園" },
  "landmark-igara-winter": { width: 24, height: 26, alt: "雪の積もった、風景画を載せた画架" },
  "landmark-kamisato-winter": { width: 60, height: 26, alt: "家並みの手前に見える、雪をかぶった山" },
  // 場面全体に重ねるもの
  "overlay-rain": { width: 160, height: 90, alt: "暗い雲と大雨、道の水たまり" },
} as const satisfies Record<string, { width: number; height: number; alt: string }>;

export type PixelAssetId = keyof typeof PIXEL_ASSETS;

export function pixelAssetSrc(id: PixelAssetId): string {
  return `${PIXEL_DIR}/${id}.png`;
}

// 家族の絵の id。人数の範囲は えらぶ画面の選択肢（014）に合わせる
export function familyAssetId(adults: 1 | 2, children: 0 | 1 | 2 | 3): PixelAssetId {
  return `family-a${adults}-c${children}` as const;
}

export type Season = "spring" | "summer" | "autumn" | "winter";

// 地区 → 目印（2026-10-26 にまさゆきさんが決めた）。冬は雪の積もった絵にする
export function landmarkAssetId(district: DistrictId, season: Season): PixelAssetId {
  return season === "winter" ? (`landmark-${district}-winter` as const) : (`landmark-${district}` as const);
}

// 行事の絵の種類（district_events.art）→ 絵
export const EVENT_ART_ASSET = {
  祭り: "event-festival",
  運動会: "event-sports",
  文化祭: "event-culture",
  その他: "event-other",
} as const satisfies Record<string, PixelAssetId>;

export type EventArt = keyof typeof EVENT_ART_ASSET;
