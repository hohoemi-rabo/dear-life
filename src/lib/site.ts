export const SITE_NAME = "DearLife";
export const SITE_NAME_JA = "飯田移住カルテ";
export const SITE_CATCHPHRASE = "家族に合わせて、飯田の暮らしを見える化";

// 地区の一覧そのものは 004 の地区マスタが正。ここは画面の表記だけを持つ
export const TARGET_DISTRICTS_LABEL = "上郷・鼎・伊賀良・中心市街地";

export const ABOUT_DATA_PATH = "/about-data";

export type Step = {
  number: string;
  label: string;
  path: string;
};

// 基本の流れ「01 えらぶ → 02 くらしを見る → 03 カルテ」（要件 3章）
export const STEPS: readonly Step[] = [
  { number: "01", label: "えらぶ", path: "/erabu" },
  { number: "02", label: "くらしを見る", path: "/kurashi" },
  { number: "03", label: "カルテ", path: "/karte" },
];
