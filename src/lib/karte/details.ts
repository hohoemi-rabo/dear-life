// カルテの詳細のページ（図鑑の1ページ。028 見本 docs/design/karte-detail-housing.png）の文言。
// 住まいは見本の文、ほかの6つは同じ形で Claude が書いた案（2026-11-01。まさゆきさんの確認待ち）。
// どれも条件によらない一般的な助言で、データの値や「おすすめ」の判定ではない（要件 6章の「想定」にあたる）
import type { Housing, KarteCard } from "../conditions/labels.ts";
import type { MarketCategory } from "../data/screen-data.ts";

export type DetailTexts = {
  // 見出しの問い。PC は長い問い（見本「家を買うとしたら、いくらくらい？」）、スマホは短い問い
  question: { long: string; short: string };
  // 「この数字から分かること」の1文目と、その下の札（見本「予算を考える入口に。」）。{district} を地区名に置きかえる。
  // null なら箱を出さない（子育て・学校。2026-11-12 まさゆきさん）
  knows: { text: string; tip: { title: string; body: string } } | null;
  // 「現地で確かめたいこと」の見出しと項目
  checkTitle: string;
  checks: readonly string[];
  // 「現地で確かめたいこと」の下に出す、黄色の注意書きの帯（防災。040 見本）
  notice?: string;
  // 「数字の根拠を見る」の下の一言
  basisNote?: string;
};

// 住まいの相場の種類ごとに、何の参考値か（「この数字から分かること」）
const HOUSING_KNOWS: Readonly<Record<MarketCategory, string>> = {
  house_built_within_20y: "{district}で過去に取引された住宅の参考値です。",
  house_built_over_20y: "{district}で過去に取引された住宅の参考値です。",
  land: "{district}で過去に取引された土地の参考値です。",
};

export function housingKnows(category: MarketCategory): string {
  return HOUSING_KNOWS[category];
}

function housingTexts(housing: Housing): DetailTexts {
  if (housing === "rent") {
    // 借りる：家賃は飯田市全体の平均、借家の世帯数は地区の値（034）。売買の相場はとなりのタブで参考に見る
    return {
      question: { long: "家を借りるとしたら、いくらくらい？", short: "家を借りるとしたら？" },
      knows: {
        text: "飯田市全体の民営借家の家賃の平均と、{district}で借家に住む世帯の数です。",
        tip: { title: "予算を考える入口に。", body: "今募集している物件の家賃とあわせて見てみましょう。" },
      },
      checkTitle: "現地・物件で確かめたいこと",
      checks: ["家賃のほかにかかる費用（共益費・駐車場など）", "建物の状態や広さ", "通学や買い物の動線"],
      basisNote: "家賃と売買の相場は、調べ方も対象の時点も異なるため、単純に比較できません。",
    };
  }
  return {
    question: { long: "家を買うとしたら、いくらくらい？", short: "家を買うとしたら？" },
    knows: {
      text: HOUSING_KNOWS.house_built_within_20y,
      tip: { title: "予算を考える入口に。", body: "個別の物件情報とあわせて見てみましょう。" },
    },
    checkTitle: "現地・物件で確かめたいこと",
    checks: ["建物の状態や修繕の必要性", "土地・建物の広さ", "通学や買い物の動線"],
    basisNote: "期間と築年数の条件が異なる情報とは、単純に比較できません。",
  };
}

const OTHER_TEXTS: Readonly<Record<Exclude<KarteCard, "housing" | "transport">, DetailTexts>> = {
  childcare: {
    question: { long: "子どもの通う場所は、どこにある？", short: "子どもの通う場所は？" },
    // 「この数字から分かること」は出さない（2026-11-12 まさゆきさん）
    knows: null,
    checkTitle: "現地で確かめたいこと",
    checks: ["家から学校までの通学路", "保育園・幼稚園の空き状況", "放課後児童クラブの利用のしかた"],
  },
  disaster: {
    question: { long: "もしものとき、どこへ逃げる？", short: "もしものとき、どこへ？" },
    // 「この数字から分かること」は出さない。確かめたいことと注意書きは見本の文（040。2026-11-13 まさゆきさん）
    knows: null,
    checkTitle: "現地で確かめたいこと",
    checks: ["候補の家から避難場所まで歩いてみる", "家族の集合場所を話し合う"],
    notice: "災害時は、飯田市の最新の避難情報を確認してください。",
  },
  population: {
    question: { long: "どんな人が暮らしている？", short: "どんな人が暮らしている？" },
    knows: {
      text: "{district}の人口と、年齢の割合です。",
      tip: { title: "地区の顔ぶれを知る入口に。", body: "行事や近所づきあいの様子もあわせて見てみましょう。" },
    },
    checkTitle: "現地で確かめたいこと",
    checks: ["近所に子どもや同じ世代の家族がいるか", "地区の行事や自治会の活動", "買い物やお店の様子"],
  },
  public_facilities: {
    question: { long: "身近な施設は、どこにある？", short: "身近な施設は？" },
    knows: {
      text: "{district}にある公民館・図書館・公園などです。",
      tip: { title: "ふだん使う場所を思い浮かべて。", body: "家からの道のりも、あわせて確かめましょう。" },
    },
    checkTitle: "現地で確かめたいこと",
    checks: ["よく使いそうな施設までの道", "開いている日と時間", "子どもが遊べる場所"],
  },
  support: {
    question: { long: "使える支援制度は、どんなもの？", short: "使える支援制度は？" },
    knows: {
      text: "飯田市の移住・子育ての支援制度です。地区によらず、市全体の制度です。",
      tip: { title: "暮らしの計画といっしょに。", body: "引っ越しの時期や家の買い方で、使える制度が変わることがあります。" },
    },
    checkTitle: "窓口で確かめたいこと",
    checks: ["申し込みの時期と期限", "対象になる条件", "相談できる窓口"],
  },
};

const TRANSPORT_TEXTS: Omit<DetailTexts, "question"> = {
  // 「この数字から分かること」は出さない（2026-11-13 まさゆきさん。車の台数によらず。印刷も）
  knows: null,
  checkTitle: "現地で確かめたいこと",
  checks: ["家からバス停・駅までの道", "朝と夕方の便の時間", "冬の道の様子"],
};

export function detailTexts(card: KarteCard, options: { housing: Housing; transportQuestion: string }): DetailTexts {
  if (card === "housing") return housingTexts(options.housing);
  if (card === "transport") {
    return { ...TRANSPORT_TEXTS, question: { long: options.transportQuestion, short: options.transportQuestion } };
  }
  return OTHER_TEXTS[card];
}

export function withDistrict(text: string, districtName: string): string {
  return text.replaceAll("{district}", districtName);
}

// 詳細のいちばん上のカードの注意書き（住まいの「現在の売り出し価格ではなく…」の箱）。
// 子育て・学校、交通（車0台）、支援制度は NOTICES の決まった文を使う。防災は下の帯（DetailTexts.notice）
export const DETAIL_NOTICES = {
  public_facilities: { title: "開いている日と時間は、施設のページで確かめてください。" },
} as const;

// 図鑑の番号（「01」）。一覧の並び（karteLayout）で何番目か
export function entryNumber(cards: readonly KarteCard[], card: KarteCard): string {
  return String(cards.indexOf(card) + 1).padStart(2, "0");
}
