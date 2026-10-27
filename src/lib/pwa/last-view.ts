// 最後に見た画面と条件を端末に残し、ホーム画面のアイコンから開いたとき（いつも「/」から始まる）に続きへ戻れるようにする（024・要件 8.2）。
// 残すのは画面の場所と URL パラメータの条件だけ（要件 8.2「端末に残すもの」）。条件はもともと URL に出ているもの（F-02）
import { KARTE_PATH, KURABE_PATH, KURASHI_PATH, MAP_PATH } from "../site.ts";

const STORAGE_KEY = "dearlife:last-view";

// 続きとして戻る画面。えらぶ（途中の質問）とデータについては残さない
export const RESUMABLE_VIEWS: Readonly<Record<string, string>> = {
  [KURASHI_PATH]: "くらしの場面",
  [KARTE_PATH]: "カルテ",
  [KURABE_PATH]: "地区くらべ",
  [MAP_PATH]: "地図",
};

// 自分で書いた値でも、端末の保存領域は書きかえられるので読むときに確かめる。条件のパラメータに使う文字だけを通す
const SEARCH_PATTERN = /^(\?[\w=&,%.-]{0,500})?$/;

export type LastView = { href: string; label: string };

function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    // Safari のプライベートモードなどで、読むだけで止まることがある
    return null;
  }
}

export function saveLastView(path: string, search: string): void {
  if (!Object.hasOwn(RESUMABLE_VIEWS, path) || !SEARCH_PATTERN.test(search)) return;
  try {
    storage()?.setItem(STORAGE_KEY, `${path}${search}`);
  } catch {
    // 容量が足りないときなど。続きに戻れないだけで、画面は使える
  }
}

export function readLastViewHref(): string | null {
  let value: string | null = null;
  try {
    value = storage()?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
  if (value === null) return null;
  const match = /^(\/[a-z-]+)(.*)$/.exec(value);
  if (!match || !Object.hasOwn(RESUMABLE_VIEWS, match[1]) || !SEARCH_PATTERN.test(match[2])) return null;
  return value;
}

export function lastViewOf(href: string | null): LastView | null {
  if (href === null) return null;
  const path = href.replace(/\?.*$/, "");
  return Object.hasOwn(RESUMABLE_VIEWS, path) ? { href, label: RESUMABLE_VIEWS[path] } : null;
}
