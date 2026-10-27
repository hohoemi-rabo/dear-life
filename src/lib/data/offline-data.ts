// 圏外でも最後に読めたデータを出す（024・要件 8.2）。
// 通信できたら応答を端末（Cache API）に残し、通信に失敗したら残してある応答を返す。つながっていれば毎回最新を読む（ネットワーク優先）。
// Service Worker ではなく画面の側でやるのは、端末の応答を使ったことを画面が知って「オフライン表示中」と出すため。
// 端末に残すのは公開データ（RPC の応答）だけで、条件や個人の情報は入れない
import { fetchRpc, rpcUrl, ScreenDataError, type FetchOptions, type ScreenRpc, type SupabaseConfig } from "./fetch-screen-data.ts";

// 画面の版が変わっても消さない（Service Worker は static の版だけを入れ替える。public/sw.js の DATA_CACHE と同じ名前）
export const DATA_CACHE_NAME = "dearlife-data";

export type OfflineFetchOptions = FetchOptions & {
  // 使えないとき（古いブラウザ・テスト）は null。端末に残さず、ふつうに読むだけにする
  caches?: CacheStorage | null;
};

export type RpcResult = { raw: unknown; offline: boolean };

function defaultCaches(): CacheStorage | null {
  return typeof caches === "undefined" ? null : caches;
}

export async function fetchRpcWithOfflineCopy(config: SupabaseConfig, rpc: ScreenRpc, options: OfflineFetchOptions = {}): Promise<RpcResult> {
  const { caches: storage = defaultCaches(), ...fetchOptions } = options;
  const key = rpcUrl(config, rpc);
  let raw: unknown;
  try {
    raw = await fetchRpc(config, rpc, fetchOptions);
  } catch (error) {
    // 4xx（キーの誤りなど）は端末のデータで隠さない。直さないと次に開いたときも読めないため
    if (!(error instanceof ScreenDataError) || !error.retryable || !storage) throw error;
    const copy = await readCopy(storage, key);
    if (copy === undefined) throw error;
    return { raw: copy, offline: true };
  }
  if (storage) await saveCopy(storage, key, raw);
  return { raw, offline: false };
}

// 残せなくても画面は出せるので、失敗は知らせるだけにする（容量が足りない・プライベートモードなど）
async function saveCopy(storage: CacheStorage, key: string, raw: unknown): Promise<void> {
  try {
    const cache = await storage.open(DATA_CACHE_NAME);
    await cache.put(key, new Response(JSON.stringify(raw), { headers: { "Content-Type": "application/json" } }));
  } catch (error) {
    console.warn("圏外のときのためのデータを端末に残せませんでした", error);
  }
}

async function readCopy(storage: CacheStorage, key: string): Promise<unknown> {
  try {
    const response = await (await storage.open(DATA_CACHE_NAME)).match(key);
    return response ? await response.json() : undefined;
  } catch (error) {
    console.warn("端末に残したデータを読めませんでした", error);
    return undefined;
  }
}

// いま画面に出しているデータのうち、端末に残してあった応答から作ったもの（RPC ごとに、その応答の generatedAt）。
// 画面の上に「オフライン表示中」を1つだけ出すため、データを読んだ側（load-screen-data.ts・load-map-data.ts）が知らせる
const offlineCopies = new Map<ScreenRpc, string>();
const listeners = new Set<() => void>();
let oldestOfflineCopy: string | null = null;

export function reportLoaded(rpc: ScreenRpc, generatedAt: string, offline: boolean): void {
  if (offline) offlineCopies.set(rpc, generatedAt);
  else offlineCopies.delete(rpc);
  // いちばん古いデータの日付を出す（画面のデータと地図のデータで日付が違うことがあるため）
  const next = [...offlineCopies.values()].sort((a, b) => Date.parse(a) - Date.parse(b))[0] ?? null;
  if (next === oldestOfflineCopy) return;
  oldestOfflineCopy = next;
  for (const listener of listeners) listener();
}

export function subscribeOfflineCopy(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// 端末のデータを出していなければ null
export function offlineCopyGeneratedAt(): string | null {
  return oldestOfflineCopy;
}

const MONTH_DAY = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "long", day: "numeric" });

// 「オフライン表示中・データは10月27日時点」。日付はデータベースが応答を作った日（generatedAt）で、日本時間で出す
export function offlineNoticeText(generatedAt: string): string {
  return `オフライン表示中・データは${MONTH_DAY.format(new Date(generatedAt))}時点`;
}
