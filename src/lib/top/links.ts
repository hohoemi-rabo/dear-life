// トップから各画面へのリンク先（033）
import { CONDITION_PARAMS } from "../conditions/url.ts";
import type { DistrictId } from "../town-district/resolve.ts";
import { ERABU_PATH } from "../site.ts";

// 地区のカード：その地区を選んだ状態で、えらぶの最初の質問（地区）から始める。
// ほかの条件は書かず、えらぶの初期値のままにする（質問の番号 q も書かない。地区を選んであれば最初の質問が開く）
export function erabuHrefFor(district: DistrictId): string {
  return `${ERABU_PATH}?${new URLSearchParams({ [CONDITION_PARAMS.district]: district })}`;
}
