// カルテの最初の「わが家の確認メモ」（2026-11-07 まさゆきさんの提案。028）。
// 選んだ条件から、まず確かめたい問いを1〜3個つくる。カードを前に出すだけでは選んだ意味が伝わりにくいので、条件を言葉にして添える。
// どれも一般的な問いかけで、データの値や「おすすめ」の判定ではない（要件 6章の「想定」にあたる）
import type { Housing, KarteCard } from "../conditions/labels.ts";
import { hasChildren, hasNoCar, type Conditions } from "../conditions/model.ts";

export type CheckMemoItem = {
  id: "childcare" | "car-free" | "housing";
  // 問いの上の札。カルテのカードにも同じ札を付けて、メモとカードを結びつける
  tag: string;
  question: string;
  note: string;
  action: string;
  // ボタンの移り先：カルテの項目の詳細か、地図
  target: { kind: "detail"; card: KarteCard } | { kind: "map" };
  // 札を付けるカルテのカード
  card: KarteCard;
};

const HOUSING_TAGS: Readonly<Record<Housing, string>> = {
  new: "新しめの家を買うなら",
  old: "古めの家を買うなら",
  rent: "家を借りるなら",
};

function housingItem(housing: Housing): CheckMemoItem {
  // 借りるは家賃の情報がないので、住まいのカードと同じく土地の取引を参考として案内する（2026-11-01 まさゆきさん）
  const rent = housing === "rent";
  return {
    id: "housing",
    tag: HOUSING_TAGS[housing],
    question: rent ? "値段の目安と、住む前の確認点は？" : "価格の目安と、購入前の確認点は？",
    note: rent ? "家賃の情報はまだありません。土地の取引を参考に見てみよう。" : "過去の取引と、現地で見る点を確かめよう。",
    action: "住まいの詳細を見る",
    target: { kind: "detail", card: "housing" },
    card: "housing",
  };
}

// 並び：子ども → 車0台 → 住まい。住まいはどの家族にも出すので、メモが空になることはない
export function checkMemoItems(conditions: Pick<Conditions, "children" | "car" | "housing">): CheckMemoItem[] {
  const items: CheckMemoItem[] = [];
  if (hasChildren(conditions)) {
    items.push({
      id: "childcare",
      tag: "子どもがいるわが家へ",
      question: "子どもが通う学校や保育施設は、どこにある？",
      note: "学区や施設の場所を見てみよう。",
      action: "学校・保育施設を見る",
      target: { kind: "detail", card: "childcare" },
      card: "childcare",
    });
  }
  if (hasNoCar(conditions)) {
    items.push({
      id: "car-free",
      tag: "車を持たないなら",
      question: "車を持たずに暮らすなら、どんな移動手段がある？",
      note: "駅やバス停の場所を地図で見てみよう。",
      action: "駅・バス停を地図で見る",
      target: { kind: "map" },
      card: "transport",
    });
  }
  items.push(housingItem(conditions.housing));
  return items;
}

// カルテのカードに付ける札（メモの問いと同じ札）。メモに出ていないカードは null
export function checkMemoTagFor(items: readonly CheckMemoItem[], card: KarteCard): string | null {
  return items.find((item) => item.card === card)?.tag ?? null;
}
