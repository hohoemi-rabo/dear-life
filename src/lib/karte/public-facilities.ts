// カルテの公共施設の「使い道から施設を探す」（040。見本 docs/design/karte-detail-public.png）。
// 市「公共施設一覧」の種類（subkind）を、親が探すときの使い道のタブにまとめる（2026-11-13 まさゆきさん）
import type { Facility } from "../data/screen-data.ts";
import { groupBySubkind, type FacilityGroup } from "./facilities.ts";

export type PublicUse = "play" | "library" | "sports" | "community" | "office" | "medical";

export type PublicUseDef = {
  id: PublicUse;
  // タブの太字（使い道）
  title: string;
  // タブの小さい字と一覧の見出し（「上郷の公園」）に使う種類の名前
  kinds: string;
  // この使い道に入れる市の種類
  subkinds: readonly string[];
};

// タブの並び（見本：子どもと遊ぶ → 本を借りる → 体を動かす → 地域の活動・文化 → 手続きをする → 受診する）。
// 「学習・交流施設」「福祉施設」は「地域の活動・文化」に入れる
export const PUBLIC_USES: readonly PublicUseDef[] = [
  { id: "play", title: "子どもと遊ぶ", kinds: "公園", subkinds: ["公園"] },
  { id: "library", title: "本を借りる", kinds: "図書館", subkinds: ["図書館"] },
  { id: "sports", title: "体を動かす", kinds: "運動施設", subkinds: ["運動施設"] },
  {
    id: "community",
    title: "地域の活動・文化",
    kinds: "公民館・文化施設",
    subkinds: ["公民館", "文化施設", "学習・交流施設", "福祉施設"],
  },
  { id: "office", title: "手続きをする", kinds: "市役所・支所", subkinds: ["市役所・支所"] },
  { id: "medical", title: "受診する", kinds: "病院・診療所", subkinds: ["病院・診療所"] },
];

// どの使い道にもない種類（市の一覧に新しい種類が増えたときなど）は、落とさずに「地域の活動・文化」に入れる
const FALLBACK_USE: PublicUse = "community";

export function publicUseOf(facility: Facility): PublicUse {
  return PUBLIC_USES.find((use) => facility.subkind !== null && use.subkinds.includes(facility.subkind))?.id ?? FALLBACK_USE;
}

// 種類の並び（使い道のタブの順）。ここにない種類はその後ろに届いた順で置く
const SUBKIND_ORDER = PUBLIC_USES.flatMap((use) => use.subkinds);

function subkindRank(subkind: string | null): number {
  const index = subkind === null ? -1 : SUBKIND_ORDER.indexOf(subkind);
  return index === -1 ? SUBKIND_ORDER.length : index;
}

export type PublicUseTab = PublicUseDef & { facilities: Facility[] };

// 地区にある使い道のタブ。施設が0の使い道は出さない（鼎・伊賀良は「受診する」がない）。
// タブの中は種類の順（公民館 → 文化施設 …）、同じ種類の中は届いた順
export function publicUseTabs(facilities: readonly Facility[]): PublicUseTab[] {
  const sorted = [...facilities].sort((a, b) => subkindRank(a.subkind) - subkindRank(b.subkind));
  return PUBLIC_USES.map((use) => ({ ...use, facilities: sorted.filter((facility) => publicUseOf(facility) === use.id) })).filter(
    (tab) => tab.facilities.length > 0,
  );
}

// 「掲載施設をすべて見る」と印刷の一覧：地区の公共施設を種類ごとに、使い道のタブの順で
export function publicFacilityGroups(facilities: readonly Facility[]): FacilityGroup<Facility>[] {
  return groupBySubkind(facilities).sort((a, b) => subkindRank(a.subkind) - subkindRank(b.subkind));
}
