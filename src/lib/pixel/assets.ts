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
  "family-a2-c0": { width: 25, height: 21, alt: "大人2人" },
  "family-a2-c1": { width: 36, height: 21, alt: "大人2人と子ども1人の家族" },
  "family-a2-c2": { width: 47, height: 21, alt: "大人2人と子ども2人の家族" },
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
  // 家の種類（えらぶ画面の「家」の選択肢）
  "house-new": { width: 32, height: 24, alt: "白い壁と大きな窓の、片流れ屋根の2階建ての家" },
  "house-old": { width: 32, height: 24, alt: "瓦屋根と障子の窓の、木造の平屋" },
  "house-rent": { width: 32, height: 24, alt: "外に階段のある3階建てのアパート" },
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
  // 画面のアイコン（027。16×16。そばの文字で中身がわかるので、ふつうは読み上げない）
  "icon-sprout": { width: 16, height: 16, alt: "土から出た双葉の芽" },
  "icon-calendar": { width: 16, height: 16, alt: "赤い見出しのカレンダー" },
  "icon-book": { width: 16, height: 16, alt: "開いた本" },
  "icon-districts": { width: 16, height: 16, alt: "雪をかぶった緑の山" },
  "icon-pin": { width: 16, height: 16, alt: "地図の赤いピン" },
  "icon-house": { width: 16, height: 16, alt: "赤い屋根の家" },
  "icon-car": { width: 16, height: 16, alt: "赤い車" },
  "icon-family": { width: 16, height: 16, alt: "大人2人と子ども1人" },
  "icon-spring": { width: 16, height: 16, alt: "桜の花" },
  "icon-summer": { width: 16, height: 16, alt: "雨の中の青い傘" },
  "icon-autumn": { width: 16, height: 16, alt: "紅葉したもみじの葉" },
  "icon-winter": { width: 16, height: 16, alt: "雪の結晶" },
  "icon-chart": { width: 16, height: 16, alt: "3本の棒グラフ" },
  "icon-map": { width: 16, height: 16, alt: "折りたたんだ地図" },
  "icon-gear": { width: 16, height: 16, alt: "歯車" },
  "icon-refresh": { width: 16, height: 16, alt: "ぐるりと回る2本の矢印" },
  "icon-school": { width: 16, height: 16, alt: "時計台のある校舎" },
  "icon-disaster": { width: 16, height: 16, alt: "黄色い防災ヘルメット" },
  "icon-transport": { width: 16, height: 16, alt: "路線バス" },
  "icon-population": { width: 16, height: 16, alt: "並んだ3人" },
  "icon-public": { width: 16, height: 16, alt: "旗の立つ公民館" },
  "icon-support": { width: 16, height: 16, alt: "手で包んだハート" },
  "icon-info": { width: 16, height: 16, alt: "丸の中の i の印" },
  "icon-document": { width: 16, height: 16, alt: "文字の並んだ書類" },
  // ロゴと飾り（027）
  logo: { width: 24, height: 20, alt: "赤い屋根の家と芽" },
  "deco-grass": { width: 48, height: 10, alt: "花の咲いた草むら" },
  "deco-tree": { width: 12, height: 12, alt: "小さな木" },
  "deco-mountains": { width: 96, height: 12, alt: "遠くの山並み" },
} as const satisfies Record<string, { width: number; height: number; alt: string }>;

export type PixelAssetId = keyof typeof PIXEL_ASSETS;

export function pixelAssetSrc(id: PixelAssetId): string {
  return `${PIXEL_DIR}/${id}.png`;
}

// 家族の絵の id。人数の範囲は えらぶ画面の選択肢（014）に合わせる
export function familyAssetId(adults: 1 | 2, children: 0 | 1 | 2): PixelAssetId {
  return `family-a${adults}-c${children}` as const;
}

// 選べる人数（大人1〜2人・子ども0〜2人。028）の家族の絵。範囲の外は描ける人数に丸める
export function familyArtFor(adults: number, children: number): PixelAssetId {
  return familyAssetId(Math.min(Math.max(adults, 1), 2) as 1 | 2, Math.min(Math.max(children, 0), 2) as 0 | 1 | 2);
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
