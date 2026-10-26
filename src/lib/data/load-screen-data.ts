// 画面のデータを1回だけ読み、えらぶ・くらし・カルテ・地区くらべで使い回す。
// 4地区分がまとめて届くので、地区を切り替えても読み直さない。
//
// キャッシュの決めごと：ページを開いているあいだ（画面の移動をまたいで）同じ応答を使う。データの更新は毎日1回（03:00）なので、
// 開いているあいだに古くなっても困らない。読み直すのは、ページを開き直したときと、失敗して「もう一度読み込む」を押したときだけ。
// 圏外のときに端末のデータを使うのは 024（Service Worker）で行う
import { fetchScreenData, supabaseConfigFromEnv, type FetchOptions, type SupabaseConfig } from "./fetch-screen-data.ts";
import { japanDate, parseScreenData, type ScreenData } from "./screen-data.ts";

let pending: Promise<ScreenData> | null = null;

export type LoadOptions = FetchOptions & { config?: SupabaseConfig; now?: () => Date };

// 同じ Promise を返す（React の use() に渡すため）。失敗した Promise もそのまま残し、clearScreenDataCache() まで読み直さない。
// 失敗のたびに勝手に読み直すと、エラーの表示が出ずに通信を繰り返すことになる
export function loadScreenData(options: LoadOptions = {}): Promise<ScreenData> {
  if (!pending) {
    const { config, now = () => new Date(), ...fetchOptions } = options;
    pending = Promise.resolve()
      .then(() => fetchScreenData(config ?? supabaseConfigFromEnv(), fetchOptions))
      .then((raw) => parseScreenData(raw, japanDate(now())));
  }
  return pending;
}

export function clearScreenDataCache(): void {
  pending = null;
}
