// 条件と分野の表示名（014）。画面に出す名前はここだけで管理する。
// 家・分野の名前は Supabase の enum（housing_choice・karte_card）と同じ文字にそろえ、型で食い違いを防ぐ
import type { Database } from "../supabase/database.types.ts";
import type { DistrictId } from "../town-district/resolve.ts";

type Enums = Database["public"]["Enums"];

export type Housing = "new" | "old" | "rent";
// 2 は「2台以上」
export type CarCount = 0 | 1 | 2;
export type KarteCard = "housing" | "childcare" | "transport" | "disaster" | "population" | "support";
// 大切にしたいことの選択肢。支援制度は入れない（要件 4章）
export type Priority = Exclude<KarteCard, "support">;

// 並びは画面の表記「上郷・鼎・伊賀良・中心市街地」と districts.sort_order に合わせる（003 の seed）
export const DISTRICTS: readonly { id: DistrictId; name: string }[] = [
  { id: "kamisato", name: "上郷" },
  { id: "kanae", name: "鼎" },
  { id: "igara", name: "伊賀良" },
  { id: "chushin", name: "中心市街地" },
];

export const DISTRICT_NAMES = Object.fromEntries(DISTRICTS.map(({ id, name }) => [id, name])) as Readonly<
  Record<DistrictId, string>
>;

export const HOUSING_LABELS: Readonly<Record<Housing, Enums["housing_choice"]>> = {
  new: "買う・新しめ",
  old: "買う・古め",
  rent: "借りる",
};

export const CAR_LABELS: Readonly<Record<CarCount, string>> = {
  0: "0台",
  1: "1台",
  2: "2台以上",
};

// カルテの既定の並び（要件 4章）。支援制度は常に最後
export const KARTE_CARDS: readonly KarteCard[] = [
  "housing",
  "childcare",
  "transport",
  "disaster",
  "population",
  "support",
];

export const KARTE_CARD_LABELS: Readonly<Record<KarteCard, Enums["karte_card"]>> = {
  housing: "住まい",
  childcare: "子育て・学校",
  transport: "交通",
  disaster: "防災",
  population: "人口",
  support: "支援制度",
};

export const PRIORITIES: readonly Priority[] = KARTE_CARDS.filter(
  (card): card is Priority => card !== "support",
);

export function familyLabel(adults: number, children: number): string {
  return `大人${adults}人・子ども${children}人`;
}
