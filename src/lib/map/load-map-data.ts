// 地図のデータを1回だけ読む。キャッシュの決めごとは画面のデータ（load-screen-data.ts）と同じで、
// ページを開いているあいだは同じ応答を使い、読み直すのは「もう一度読み込む」を押したときだけ
import { fetchRpc, supabaseConfigFromEnv, type FetchOptions, type SupabaseConfig } from "../data/fetch-screen-data.ts";
import { parseMapData, type MapData } from "./map-data.ts";

let pending: Promise<MapData> | null = null;

export function loadMapData(options: FetchOptions & { config?: SupabaseConfig } = {}): Promise<MapData> {
  if (!pending) {
    const { config, ...fetchOptions } = options;
    pending = Promise.resolve()
      .then(() => fetchRpc(config ?? supabaseConfigFromEnv(), "map_data", fetchOptions))
      .then(parseMapData);
  }
  return pending;
}

export function clearMapDataCache(): void {
  pending = null;
}
