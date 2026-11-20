// カルテ一覧のタブ（048）。タブは表示を切りかえるもので、押すとそのタブのカードを出す。
// 大切にしたいことを選んだとき：わが家の大切なこと｜すべて｜項目7つ（karteLayout の順）。開いたときは「わが家の大切なこと」。
// 何も選ばなかったとき：すべて｜項目7つ。開いたときは「すべて」。
// 選んだタブは URL の tab に残す。開いたときのタブでは付けない（2026-11-20 まさゆきさん）
import { KARTE_CARDS, karteCardAnchor, type KarteCard, type Priority } from "../conditions/labels.ts";
import { KARTE_DETAIL_SLUGS, karteCardFromSlug } from "./entries.ts";

export const KARTE_TAB_PARAM = "tab";

export type KarteTab = "mine" | "all" | KarteCard;

export const KARTE_TAB_LABELS = {
  mine: "わが家の大切なこと",
  all: "すべて",
} as const satisfies Record<"mine" | "all", string>;

type ReadableParams = { get(name: string): string | null };

export function karteTabs(cards: readonly KarteCard[], priorities: readonly Priority[]): KarteTab[] {
  return [...(priorities.length > 0 ? (["mine"] as const) : []), "all", ...cards];
}

export function defaultKarteTab(priorities: readonly Priority[]): KarteTab {
  return priorities.length > 0 ? "mine" : "all";
}

// URL の値。項目は詳細のページと同じ名前（public-facilities など）
export function karteTabSlug(tab: KarteTab): string {
  return tab === "mine" || tab === "all" ? tab : KARTE_DETAIL_SLUGS[tab];
}

// 知らない値や、その条件では出ないタブ（大切なことを選んでいないのに mine）は、開いたときのタブに戻す
export function parseKarteTab(value: string | null, priorities: readonly Priority[]): KarteTab {
  if (value === "all") return "all";
  if (value === "mine") return priorities.length > 0 ? "mine" : "all";
  const card = value === null ? null : karteCardFromSlug(value);
  return card ?? defaultKarteTab(priorities);
}

// そのタブで出すカード。並びは karteLayout のまま
export function karteTabCards(tab: KarteTab, cards: readonly KarteCard[], priorities: readonly Priority[]): KarteCard[] {
  if (tab === "all") return [...cards];
  if (tab === "mine") return cards.filter((card) => (priorities as readonly KarteCard[]).includes(card));
  return [tab];
}

// tab を書きかえたパラメータ。開いたときのタブなら tab を消す。ほかのパラメータ（条件・季節）は残す
export function withKarteTab(
  params: ReadableParams & Iterable<[string, string]>,
  tab: KarteTab,
  priorities: readonly Priority[],
): URLSearchParams {
  const next = new URLSearchParams([...params]);
  if (tab === defaultKarteTab(priorities)) next.delete(KARTE_TAB_PARAM);
  else next.set(KARTE_TAB_PARAM, karteTabSlug(tab));
  return next;
}

// 一覧のカードの id（#karte-<card>）で来たときに、そのカードが出る項目のタブ
export function karteTabFromHash(hash: string): KarteCard | null {
  const id = hash.replace(/^#/, "");
  return KARTE_CARDS.find((card) => karteCardAnchor(card) === id) ?? null;
}
