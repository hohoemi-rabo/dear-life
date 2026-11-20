// カルテのカードの並び順と、上部の一文（要件 4章・F-03）。
// 並べ替えるだけで、どのカードも隠さない（どのタブに出すかは 048 の src/lib/karte/tabs.ts）。点数化・おすすめの判定はしない
import { KARTE_CARD_LABELS, KARTE_CARDS, PRIORITIES, type KarteCard } from "./labels.ts";
import { hasChildren, hasNoCar, type Conditions } from "./model.ts";

export const NO_CAR_NOTICE = "本数や時間帯によっては、車なしの暮らしが難しいことがあります。";

export type KarteLayout = {
  cards: KarteCard[];
  // 大切にしたいことを選んだときだけ、「わが家の大切なこと」のタブにまとめたことを伝える文（048）。
  // 子ども・車の文は、開いたときの画面（選んだカードだけ）と合わないので出さない（2026-11-20 まさゆきさん）
  leads: string[];
  // 車0台のときの交通の注意書き。それ以外は null
  transportNotice: string | null;
};

// 並べ方：大切にしたいこと（既定の並び順）→ 子ども1人以上なら子育て・学校 → 車0台なら交通 → 残りを既定の順（公共施設を含む）→ 支援制度。
// 子ども0人のときは、子育て・学校を支援制度のすぐ前（いちばん下の分野）に置く。
// 大切にしたいことで選んだ分野は、子どもや車の条件より先に置いたまま動かさない
export function karteLayout(conditions: Pick<Conditions, "children" | "car" | "priorities">): KarteLayout {
  const prioritized = PRIORITIES.filter((card) => conditions.priorities.includes(card));
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

  const leads =
    prioritized.length > 0 ? [`${prioritized.map((card) => KARTE_CARD_LABELS[card]).join("・")}を「わが家の大切なこと」にまとめています。`] : [];

  return { cards, leads, transportNotice: hasNoCar(conditions) ? NO_CAR_NOTICE : null };
}
