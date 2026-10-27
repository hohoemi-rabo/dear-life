// 地図のデータを1回だけ読む。キャッシュの決めごとは画面のデータ（load-screen-data.ts）と同じで、
// ページを開いているあいだは同じ応答を使い、読み直すのは「もう一度読み込む」を押したときだけ。圏外のときも同じく端末の応答を使う（024）
import { supabaseConfigFromEnv, type SupabaseConfig } from "../data/fetch-screen-data.ts";
import { fetchRpcWithOfflineCopy, reportLoaded, type OfflineFetchOptions } from "../data/offline-data.ts";
import { parseMapData, type MapData } from "./map-data.ts";

let pending: Promise<MapData> | null = null;

export function loadMapData(options: OfflineFetchOptions & { config?: SupabaseConfig } = {}): Promise<MapData> {
  if (!pending) {
    const { config, ...fetchOptions } = options;
    pending = Promise.resolve()
      .then(() => fetchRpcWithOfflineCopy(config ?? supabaseConfigFromEnv(), "map_data", fetchOptions))
      .then(({ raw, offline }) => {
        const data = parseMapData(raw);
        reportLoaded("map_data", data.generatedAt, offline);
        return data;
      });
  }
  return pending;
}

export function clearMapDataCache(): void {
  pending = null;
}
