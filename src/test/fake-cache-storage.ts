// テスト用の Cache API。jsdom にはないので、URL ごとに応答を持つだけのものを作る。
// match の ignoreSearch（URL パラメータを除いて探す）だけを本物と同じに扱う
const BASE = "https://dearlife.test";

function keyOf(request: RequestInfo | URL, ignoreSearch = false): string {
  const url = new URL(typeof request === "string" || request instanceof URL ? request : request.url, BASE);
  if (ignoreSearch) url.search = "";
  return url.href;
}

export class FakeCache {
  readonly entries = new Map<string, Response>();

  async put(request: RequestInfo | URL, response: Response): Promise<void> {
    this.entries.set(keyOf(request), response.clone());
  }

  async match(request: RequestInfo | URL, options: CacheQueryOptions = {}): Promise<Response | undefined> {
    const wanted = keyOf(request, options.ignoreSearch);
    for (const [key, response] of this.entries) {
      if (keyOf(key, options.ignoreSearch) === wanted) return response.clone();
    }
    return undefined;
  }
}

export class FakeCacheStorage {
  readonly caches = new Map<string, FakeCache>();

  async open(name: string): Promise<FakeCache> {
    let cache = this.caches.get(name);
    if (!cache) {
      cache = new FakeCache();
      this.caches.set(name, cache);
    }
    return cache;
  }

  async keys(): Promise<string[]> {
    return [...this.caches.keys()];
  }

  async delete(name: string): Promise<boolean> {
    return this.caches.delete(name);
  }

  asCacheStorage(): CacheStorage {
    return this as unknown as CacheStorage;
  }
}

export const FAKE_ORIGIN = BASE;
