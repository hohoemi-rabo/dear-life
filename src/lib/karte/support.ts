// カルテの支援制度の「目的から支援制度を探す」（040。見本 docs/design/karte-detail-support.png）。
// 制度の種類（support_programs.category）を目的のタブにする。制度は飯田市全体のもので、4地区とも同じ
import type { SupportProgram } from "../data/screen-data.ts";

export type SupportCategory = SupportProgram["category"];

export type SupportPurposeDef = {
  category: SupportCategory;
  // タブの小さい字（その目的に入る制度の中身）
  kinds: string;
  // 一覧の見出し（「移住の支援」）
  heading: string;
};

// タブの並び（見本：移住 → 住まい → 子育て）。「その他」は今0件。制度が入ったら4つ目のタブになる
export const SUPPORT_PURPOSES: readonly SupportPurposeDef[] = [
  { category: "移住", kinds: "相談・体験・お金", heading: "移住の支援" },
  { category: "住まい", kinds: "家探し・お金", heading: "住まいの支援" },
  { category: "子育て", kinds: "妊娠・出産・子育て", heading: "子育ての支援" },
  { category: "その他", kinds: "そのほかの制度", heading: "そのほかの支援" },
];

export type SupportPurposeTab = SupportPurposeDef & { programs: SupportProgram[] };

// 制度のある目的のタブ。タブの中は届いた順（screen_data() が sort_order の順に返す）
export function supportPurposeTabs(programs: readonly SupportProgram[]): SupportPurposeTab[] {
  return SUPPORT_PURPOSES.map((purpose) => ({
    ...purpose,
    programs: programs.filter((program) => program.category === purpose.category),
  })).filter((tab) => tab.programs.length > 0);
}

// 「出典・確認日を見る」の確認日。制度ごとに確かめた日が違えば、いちばん古い日から新しい日までを書く
export function supportCheckedRange(programs: readonly SupportProgram[]): { oldest: string; newest: string } | null {
  if (programs.length === 0) return null;
  const dates = programs.map((program) => program.checkedOn).sort();
  return { oldest: dates[0], newest: dates[dates.length - 1] };
}
