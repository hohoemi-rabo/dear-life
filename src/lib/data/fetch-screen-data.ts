// screen_data()（015）・map_data()（021）を Supabase の REST から読む。@supabase/supabase-js は使わない（RPC を1つ GET で呼ぶだけなので。
// 2026-10-26 に測った大きさは gzip 後で supabase-js 58KB・postgrest-js 5.6KB に対し、fetch は0）。
// 画面に渡すのは URL と publishable key だけ。service_role key は絶対に使わない（CLAUDE.md）

export type SupabaseConfig = { url: string; publishableKey: string };

// NEXT_PUBLIC_ の値はビルド時に埋め込まれる。process.env を分解して読むと埋め込まれないので、1つずつ書く
export function supabaseConfigFromEnv(): SupabaseConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY を .env.local に設定してください（雛形は .env.example）");
  }
  return { url, publishableKey };
}

export type ScreenDataErrorKind = "timeout" | "network" | "http";

// 通信の失敗。画面は「もう一度読み込む」ボタンを出す
export class ScreenDataError extends Error {
  readonly kind: ScreenDataErrorKind;
  readonly status: number | null;

  constructor(kind: ScreenDataErrorKind, message: string, status: number | null = null) {
    super(message);
    this.name = "ScreenDataError";
    this.kind = kind;
    this.status = status;
  }

  // 一時的な失敗だけ自動で再試行する。4xx（キーの誤り・関数がないなど）は何度呼んでも同じなので再試行しない
  get retryable(): boolean {
    return this.kind !== "http" || this.status === null || this.status === 429 || this.status >= 500;
  }
}

export type FetchOptions = {
  fetch?: typeof fetch;
  // 1回の通信の待ち時間。スマホの回線で3秒以内に出す目安（要件 8章）に対して、遅い回線でも待ちすぎない長さにする
  timeoutMs?: number;
  // 一時的な失敗のときに自動でやり直す回数。待ち時間は backoffMs から倍々にする
  retries?: number;
  backoffMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

const DEFAULT_TIMEOUT_MS = 6_000;
const DEFAULT_RETRIES = 1;
const DEFAULT_BACKOFF_MS = 1_000;

// 画面が呼ぶ RPC。どれも引数なしで、anon が実行できる
export type ScreenRpc = "screen_data" | "map_data";

export function rpcUrl(config: SupabaseConfig, rpc: ScreenRpc): string {
  return `${config.url.replace(/\/+$/, "")}/rest/v1/rpc/${rpc}`;
}

async function fetchOnce(config: SupabaseConfig, rpc: ScreenRpc, fetchImpl: typeof fetch, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // GET で呼ぶのは、応答を URL ごとに Cache API に残せるようにするため（POST は残せない。024 の offline-data.ts）
    const response = await fetchImpl(rpcUrl(config, rpc), {
      method: "GET",
      headers: { apikey: config.publishableKey, Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new ScreenDataError("http", `データの読み込みに失敗しました（HTTP ${response.status}）`, response.status);
    }
    return await response.json();
  } catch (error) {
    if (error instanceof ScreenDataError) throw error;
    if (controller.signal.aborted) {
      throw new ScreenDataError("timeout", `データの読み込みが ${timeoutMs / 1000} 秒で終わりませんでした`);
    }
    throw new ScreenDataError("network", `データを読み込めませんでした（${error instanceof Error ? error.message : String(error)}）`);
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchRpc(config: SupabaseConfig, rpc: ScreenRpc, options: FetchOptions = {}): Promise<unknown> {
  const {
    fetch: fetchImpl = globalThis.fetch.bind(globalThis),
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    backoffMs = DEFAULT_BACKOFF_MS,
    sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
  } = options;
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetchOnce(config, rpc, fetchImpl, timeoutMs);
    } catch (error) {
      if (!(error instanceof ScreenDataError) || !error.retryable || attempt >= retries) throw error;
      await sleep(backoffMs * 2 ** attempt);
    }
  }
}
