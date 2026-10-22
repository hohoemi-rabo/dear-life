// Worker からの通信（外部 API・Supabase・Discord）の共通処理（要件 7.2・9.3・8章の信頼性）。
// どの通信も CallBudget から1回分を取ってから送る。Workers 無料プランの「1回の実行で外部への呼び出し50回まで」は
// 宛先を問わず数えられるので、外部 API と Supabase で同じ予算を分け合う

// 無料プランの上限。リトライも1回と数える
export const SUBREQUEST_LIMIT = 50;

export class CallBudgetExceededError extends Error {
  constructor(limit: number, keep: number) {
    super(`1回の実行で使える呼び出し回数（${limit}回のうち、記録用に残す${keep}回を除く）を使い切った`);
    this.name = "CallBudgetExceededError";
  }
}

export class CallBudget {
  private used = 0;

  constructor(readonly limit: number = SUBREQUEST_LIMIT) {}

  get remaining(): number {
    return this.limit - this.used;
  }

  // keep 回分は残したまま1回分を取る。取得処理が使い切っても、実行の記録と通知は送れるようにするため
  take(keep = 0): void {
    if (this.remaining - 1 < keep) throw new CallBudgetExceededError(this.limit, keep);
    this.used += 1;
  }
}

export class HttpRequestError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
    this.name = "HttpRequestError";
  }
}

export type HttpClientOptions = {
  budget: CallBudget;
  // 呼び出しの間をあける時間。前の応答が返ってから次を送るまでを数える
  minIntervalMs?: number;
  timeoutMs?: number;
  // 失敗したときに送り直す回数（最初の1回を含まない）
  maxRetries?: number;
  // リトライの待ち時間の基準。2回目以降は倍にしていく
  backoffBaseMs?: number;
  // この回数は使わずに残す（CallBudget.take の keep）
  keepCalls?: number;
  fetch?: typeof fetch;
};

export type HttpClient = {
  // 2xx の応答を返す。リトライしても 2xx にならなければ HttpRequestError を投げる
  request(url: string, init?: RequestInit): Promise<Response>;
  // このクライアントで送った回数（リトライを含む）
  readonly calls: number;
};

// Retry-After はこれより長ければ待たずに失敗にする（Cron の実行時間を使い切らないため）
const MAX_RETRY_AFTER_MS = 60_000;

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryAfterMs(response: Response): number | null {
  const value = response.headers.get("retry-after");
  if (value === null) return null;
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : null;
}

// URL のクエリには API キーが入ることがあるので、エラーメッセージにはホストとパスだけを出す
function describeUrl(url: string): string {
  const { host, pathname } = new URL(url);
  return `${host}${pathname}`;
}

export function createHttpClient(options: HttpClientOptions): HttpClient {
  const {
    budget,
    minIntervalMs = 0,
    timeoutMs = 30_000,
    maxRetries = 3,
    backoffBaseMs = 2_000,
    keepCalls = 0,
    fetch: fetchImpl = fetch,
  } = options;
  let calls = 0;
  let lastFinishedAt: number | null = null;

  async function waitForInterval(): Promise<void> {
    if (lastFinishedAt === null) return;
    const wait = lastFinishedAt + minIntervalMs - Date.now();
    if (wait > 0) await sleep(wait);
  }

  async function attempt(url: string, init: RequestInit | undefined): Promise<Response> {
    await waitForInterval();
    budget.take(keepCalls);
    calls += 1;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetchImpl(url, { ...init, signal: controller.signal });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new HttpRequestError(`${describeUrl(url)}：${timeoutMs}ms で応答がなかった`, null);
      }
      throw new HttpRequestError(`${describeUrl(url)}：通信に失敗した（${String(error)}）`, null);
    } finally {
      clearTimeout(timer);
      lastFinishedAt = Date.now();
    }
  }

  async function request(url: string, init?: RequestInit): Promise<Response> {
    for (let retry = 0; ; retry += 1) {
      let response: Response;
      try {
        response = await attempt(url, init);
      } catch (error) {
        if (error instanceof CallBudgetExceededError || retry >= maxRetries) throw error;
        await sleep(backoffBaseMs * 2 ** retry);
        continue;
      }
      if (response.ok) return response;

      const body = await response.text().catch(() => "");
      const message = `${describeUrl(url)}：HTTP ${response.status} ${body.slice(0, 300)}`.trim();
      const retryAfter = retryAfterMs(response);
      if (
        !isRetryableStatus(response.status) ||
        retry >= maxRetries ||
        (retryAfter !== null && retryAfter > MAX_RETRY_AFTER_MS)
      ) {
        throw new HttpRequestError(message, response.status);
      }
      await sleep(Math.max(backoffBaseMs * 2 ** retry, retryAfter ?? 0));
    }
  }

  return {
    request,
    get calls() {
      return calls;
    },
  };
}
