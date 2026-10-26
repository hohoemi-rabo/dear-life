// カルテのカードの並び順と、上部の一文（要件 4章・F-03）。
// 並べ替えるだけで、どのカードも隠さない。点数化・おすすめの判定はしない
import { KARTE_CARD_LABELS, KARTE_CARDS, type KarteCard } from "./labels.ts";
import { hasChildren, hasNoCar, type Conditions } from "./model.ts";

export const NO_CAR_NOTICE = "本数や時間帯によっては、車なしの暮らしが難しいことがあります。";

export type KarteLayout = {
  cards: KarteCard[];
  // 条件がどう並びに反映されたかを伝える文。子どもの有無でかならず1文は入る
  leads: string[];
  // 車0台のときの交通の注意書き。それ以外は null
  transportNotice: string | null;
};

// 並べ方：大切にしたいこと（既定の並び順）→ 子ども1人以上なら子育て・学校 → 車0台なら交通 → 残りを既定の順 → 支援制度。
// 子ども0人のときは、子育て・学校を支援制度のすぐ前（いちばん下の分野）に置く。
// 大切にしたいことで選んだ分野は、子どもや車の条件より先に置いたまま動かさない
export function karteLayout(conditions: Pick<Conditions, "children" | "car" | "priorities">): KarteLayout {
  const prioritized = KARTE_CARDS.filter((card) => card !== "support" && conditions.priorities.includes(card));
  const raiseChildcare = hasChildren(conditions) && !prioritized.includes("childcare");
  const lowerChildcare = !hasChildren(conditions) && !prioritized.includes("childcare");
  const raiseTransport = hasNoCar(conditions) && !prioritized.includes("transport");

  const raised: KarteCard[] = [
    ...prioritized,
    ...(raiseChildcare ? (["childcare"] as const) : []),
    ...(raiseTransport ? (["transport"] as const) : []),
  ];
  const rest = KARTE_CARDS.filter(
    (card) => card !== "support" && !raised.includes(card) && !(lowerChildcare && card === "childcare"),
  );
  const cards: KarteCard[] = [...raised, ...rest, ...(lowerChildcare ? (["childcare"] as const) : []), "support"];

  const leads: string[] = [];
  if (prioritized.length > 0) {
    leads.push(`${prioritized.map((card) => KARTE_CARD_LABELS[card]).join("・")}に関する情報を先に表示しています。`);
  }
  if (raiseChildcare) leads.push("子どもがいるので、子育て・学校の情報を前の方に表示しています。");
  if (lowerChildcare) leads.push("子どもがいないので、子育て・学校の情報は下の方に表示しています。");
  if (raiseTransport) leads.push("車を持たない暮らしなので、交通の情報を前の方に表示しています。");

  return { cards, leads, transportNotice: hasNoCar(conditions) ? NO_CAR_NOTICE : null };
}
