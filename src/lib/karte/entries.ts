// カルテの図鑑の形（028、見本 docs/design/karte-*.png）。一覧のカードの分け方・問い・詳細のページの場所を決める。
// 並び順は karteLayout（014）のまま変えない。ここでは大きいカードと小さいカードに分けるだけ
import { CAR_LABELS, type CarCount, type Housing, type KarteCard } from "../conditions/labels.ts";
import type { MarketCategory } from "../data/screen-data.ts";
import { KARTE_PATH } from "../site.ts";

// 見本の上の段（絵と問いのある大きいカード）。残り（人口・公共施設・支援制度）は下の段の小さいカード
const MAIN_CARDS = ["housing", "childcare", "transport", "disaster"] as const satisfies readonly KarteCard[];
export type MainKarteCard = (typeof MAIN_CARDS)[number];
export type MinorKarteCard = Exclude<KarteCard, MainKarteCard>;

export function isMainCard(card: KarteCard): card is MainKarteCard {
  return (MAIN_CARDS as readonly KarteCard[]).includes(card);
}

// 並び順を保ったまま、大きいカードと小さいカードに分ける
export function splitKarteCards(cards: readonly KarteCard[]): { main: MainKarteCard[]; minor: MinorKarteCard[] } {
  const main: MainKarteCard[] = [];
  const minor: MinorKarteCard[] = [];
  for (const card of cards) {
    if (isMainCard(card)) main.push(card);
    else minor.push(card);
  }
  return { main, minor };
}

// 詳細のページの URL の名前（/karte/<slug>）。静的書き出しなので generateStaticParams でこの7つを列挙する
export const KARTE_DETAIL_SLUGS: Readonly<Record<KarteCard, string>> = {
  housing: "housing",
  childcare: "childcare",
  transport: "transport",
  disaster: "disaster",
  population: "population",
  public_facilities: "public-facilities",
  support: "support",
};

export function karteDetailPath(card: KarteCard): string {
  return `${KARTE_PATH}/${KARTE_DETAIL_SLUGS[card]}`;
}

export function karteCardFromSlug(slug: string): KarteCard | null {
  const found = Object.entries(KARTE_DETAIL_SLUGS).find(([, value]) => value === slug);
  return found ? (found[0] as KarteCard) : null;
}

// 住まいの問い（見本「家を買うとしたら？」）
export function housingQuestion(housing: Housing): string {
  return housing === "rent" ? "家を借りるとしたら？" : "家を買うとしたら？";
}

// 相場の種類の言い方（見本「築20年以内の中古戸建て」）
export const MARKET_CATEGORY_PHRASES: Readonly<Record<MarketCategory, string>> = {
  house_built_within_20y: "築20年以内の中古戸建て",
  house_built_over_20y: "築21年以上の中古戸建て",
  land: "土地（宅地）",
};

// 交通の問い（見本「車1台で、どう動く？」）。車を選んでいないときは、台数にふれない
export function transportQuestion(car: CarCount | null): string {
  if (car === null) return "毎日、どう動く？";
  if (car === 0) return "車なしで、どう動く？";
  return `車${CAR_LABELS[car]}で、どう動く？`;
}

// 一覧のカードの、何が見られるかの一言（見本）。スマホの小さいカードは1行に収めるため短い言い方（short）を使う
export const KARTE_ENTRY_SUMMARIES: Readonly<Record<Exclude<KarteCard, "housing">, { text: string; short?: string }>> = {
  childcare: { text: "学区や施設の場所を一覧と地図で確認。" },
  transport: { text: "バス停・駅と運行情報を確認。" },
  disaster: { text: "避難場所と対象の災害を確認。" },
  population: { text: "地区の人口と年齢構成を確認。" },
  public_facilities: { text: "図書館・公園など身近な施設を確認。", short: "図書館・公園などを確認。" },
  support: { text: "移住・子育ての支援制度を確認。", short: "移住・子育ての制度を確認。" },
};

// 大きいカードの問い（住まい・交通は条件で変わるので関数）
export const KARTE_ENTRY_QUESTIONS = {
  childcare: "子どもの通う場所は？",
  disaster: "もしものとき、どこへ？",
} as const;

// 大きいカードの、確かめるときの一言（見本の灰色の札）。どれも条件によらない一般的な助言で、データの値ではない
export const KARTE_ENTRY_HINTS = {
  childcare: "通う学校は、住所ごとの確認が必要です。",
  transport: "バスの本数・時間帯もあわせて確認しましょう。",
  disaster: "場所ごとに対象となる災害が異なります。",
} as const;

// カードから詳細のページへのボタンの文字（見本）
export const KARTE_ENTRY_ACTIONS: Readonly<Record<KarteCard, string>> = {
  housing: "価格の内訳を見る",
  childcare: "学校・保育施設を見る",
  transport: "交通を確かめる",
  disaster: "避難場所を確かめる",
  population: "人口を確認する",
  public_facilities: "公共施設を確認する",
  support: "支援制度を確認する",
};
