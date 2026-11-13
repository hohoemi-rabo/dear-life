// カルテの詳細のページ（図鑑の1ページ。028 見本 docs/design/karte-detail-housing.png）の文言。
// 住まいは見本の文、ほかの6つは同じ形で Claude が書いた案（2026-11-01。まさゆきさんの確認待ち）。
// どれも条件によらない一般的な助言で、データの値や「おすすめ」の判定ではない（要件 6章の「想定」にあたる）
import type { Housing, KarteCard } from "../conditions/labels.ts";

export type DetailTexts = {
  // 見出しの問い。PC は長い問い（見本「家を買うとしたら、いくらくらい？」）、スマホは短い問い
  question: { long: string; short: string };
  // 「現地で確かめたいこと」の見出しと項目。「この数字から分かること」の箱は7つの詳細すべてで出さない（2026-11-13 まさゆきさん）
  checkTitle: string;
  checks: readonly string[];
  // 箇条書きの代わりに出す1つの文（支援制度の「申し込む前に確かめたいこと」。040 見本）
  checkNote?: string;
  // 「現地で確かめたいこと」の下に出す、黄色の注意書きの帯（防災。040 見本）
  notice?: string;
  // 「数字の根拠を見る」の下の一言
  basisNote?: string;
};

function housingTexts(housing: Housing): DetailTexts {
  if (housing === "rent") {
    // 借りる：家賃は飯田市全体の平均、借家の世帯数は地区の値（034）。売買の相場はとなりのタブで参考に見る
    return {
      question: { long: "家を借りるとしたら、いくらくらい？", short: "家を借りるとしたら？" },
      checkTitle: "現地・物件で確かめたいこと",
      checks: ["家賃のほかにかかる費用（共益費・駐車場など）", "建物の状態や広さ", "通学や買い物の動線"],
      basisNote: "家賃と売買の相場は、調べ方も対象の時点も異なるため、単純に比較できません。",
    };
  }
  return {
    question: { long: "家を買うとしたら、いくらくらい？", short: "家を買うとしたら？" },
    checkTitle: "現地・物件で確かめたいこと",
    checks: ["建物の状態や修繕の必要性", "土地・建物の広さ", "通学や買い物の動線"],
    basisNote: "期間と築年数の条件が異なる情報とは、単純に比較できません。",
  };
}

const OTHER_TEXTS: Readonly<Record<Exclude<KarteCard, "housing" | "transport">, DetailTexts>> = {
  childcare: {
    question: { long: "子どもの通う場所は、どこにある？", short: "子どもの通う場所は？" },
    checkTitle: "現地で確かめたいこと",
    checks: ["家から学校までの通学路", "保育園・幼稚園の空き状況", "放課後児童クラブの利用のしかた"],
  },
  disaster: {
    question: { long: "もしものとき、どこへ逃げる？", short: "もしものとき、どこへ？" },
    checkTitle: "現地で確かめたいこと",
    checks: ["候補の家から避難場所まで歩いてみる", "家族の集合場所を話し合う"],
    notice: "災害時は、飯田市の最新の避難情報を確認してください。",
  },
  population: {
    question: { long: "どんな人が暮らしている？", short: "どんな人が暮らしている？" },
    checkTitle: "現地で確かめたいこと",
    checks: ["近所に子どもや同じ世代の家族がいるか", "地区の行事や自治会の活動", "買い物やお店の様子"],
  },
  public_facilities: {
    question: { long: "身近な施設は、どこにある？", short: "身近な施設は？" },
    // 見本の見出しと文（040。2026-11-13 まさゆきさん）
    checkTitle: "下見で確かめたいこと",
    checks: ["候補の家から、よく使いそうな施設まで歩いてみる", "親子で使いやすい道や入口を確認する"],
  },
  support: {
    question: { long: "使える支援制度は、どんなもの？", short: "使える支援制度は？" },
    // 今までの注意書きと「窓口で確かめたいこと」の3つを、見本の箱1つにまとめた（見本の「申請のタイミング」を分かりやすくした。2026-11-13 まさゆきさん）
    checkTitle: "申し込む前に確かめたいこと",
    checks: [],
    checkNote: "対象になる条件・受付の期間・申し込む時期を、公式ページや窓口で確かめてください。",
  },
};

const TRANSPORT_TEXTS: Omit<DetailTexts, "question"> = {
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

// 図鑑の番号（「01」）。一覧の並び（karteLayout）で何番目か
export function entryNumber(cards: readonly KarteCard[], card: KarteCard): string {
  return String(cards.indexOf(card) + 1).padStart(2, "0");
}
