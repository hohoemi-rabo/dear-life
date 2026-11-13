// ドット絵の一覧。画面はここから大きさと代替テキストを読み、PNG は public/pixel/<id>.png にある（npm run pixel で書き出す）。
// 描き方は art/index.ts。大きさが描いた絵と合っていることはテストで確かめる

export const PIXEL_DIR = "/pixel";

export const PIXEL_ASSETS = {
  // 行事（district_events.art の種類ごと。行事ごとの絵 EVENT_ILLUSTS がない行事に出す）
  "event-festival": { width: 34, height: 24, alt: "提灯を下げた舞台と人形" },
  "event-sports": { width: 36, height: 22, alt: "旗を渡したロープと運動会のテント" },
  "event-culture": { width: 34, height: 22, alt: "絵を掛けた展示板と、花を生けた机" },
  "event-other": { width: 28, height: 22, alt: "行事のお知らせを貼った地区の掲示板" },
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
  "icon-checklist": { width: 16, height: 16, alt: "チェックの付いた表" },
  "icon-print": { width: 16, height: 16, alt: "紙の出てくるプリンター" },
  // ロゴと飾り（027）
  logo: { width: 24, height: 20, alt: "赤い屋根の家と芽" },
  "deco-grass": { width: 48, height: 10, alt: "花の咲いた草むら" },
} as const satisfies Record<string, { width: number; height: number; alt: string }>;

export type PixelAssetId = keyof typeof PIXEL_ASSETS;

export function pixelAssetSrc(id: PixelAssetId): string {
  return `${PIXEL_DIR}/${id}.png`;
}

// 行事の絵の種類（district_events.art）→ 絵
export const EVENT_ART_ASSET = {
  祭り: "event-festival",
  運動会: "event-sports",
  文化祭: "event-culture",
  その他: "event-other",
} as const satisfies Record<string, PixelAssetId>;

export type EventArt = keyof typeof EVENT_ART_ASSET;
