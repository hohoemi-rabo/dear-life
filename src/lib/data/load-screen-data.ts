// 画面のデータを1回だけ読み、えらぶ・くらし・カルテ・地区くらべで使い回す。
// 4地区分がまとめて届くので、地区を切り替えても読み直さない。
//
// キャッシュの決めごと：ページを開いているあいだ（画面の移動をまたいで）同じ応答を使う。データの更新は毎日1回（03:00）なので、
// 開いているあいだに古くなっても困らない。読み直すのは、ページを開き直したときと、失敗して「もう一度読み込む」を押したときだけ。
// 通信できないときは、端末に残した前回の応答を使う（024。offline-data.ts）
import { supabaseConfigFromEnv, type SupabaseConfig } from "./fetch-screen-data.ts";
import { fetchRpcWithOfflineCopy, reportLoaded, type OfflineFetchOptions } from "./offline-data.ts";
import { japanDate, parseScreenData, type ScreenData } from "./screen-data.ts";

let pending: Promise<ScreenData> | null = null;

export type LoadOptions = OfflineFetchOptions & { config?: SupabaseConfig; now?: () => Date };

// 同じ Promise を返す（React の use() に渡すため）。失敗した Promise もそのまま残し、clearScreenDataCache() まで読み直さない。
// 失敗のたびに勝手に読み直すと、エラーの表示が出ずに通信を繰り返すことになる
export function loadScreenData(options: LoadOptions = {}): Promise<ScreenData> {
  if (!pending) {
    const { config, now = () => new Date(), ...fetchOptions } = options;
    pending = Promise.resolve()
      .then(() => fetchRpcWithOfflineCopy(config ?? supabaseConfigFromEnv(), "screen_data", fetchOptions))
      .then(({ raw, offline }) => {
        const data = parseScreenData(raw, japanDate(now()));
        reportLoaded("screen_data", data.generatedAt, offline);
        return data;
      });
  }
  return pending;
}

export function clearScreenDataCache(): void {
  pending = null;
}
