// Supabase への読み書き（PostgREST を直接呼ぶ）。supabase-js は使わない：
// Worker は取得して保存するだけで、必要なのは select・insert・update・rpc だけなので、バンドルを小さく保つ（005 の仕様メモ）
import type { HttpClient } from "./http";

export type SupabaseRest = {
  // query は PostgREST のクエリ文字列（例：select=town_name&resolved_at=is.null）
  select<T>(table: string, query: string): Promise<T[]>;
  // onConflict を渡すと、その列で重なる行は上書きする（upsert）
  insert<T = unknown>(
    table: string,
    rows: Record<string, unknown> | Record<string, unknown>[],
    options?: { returning?: boolean; onConflict?: string },
  ): Promise<T[]>;
  // filter は PostgREST の絞り込み（例：id=eq.1）。絞り込みなしの全件更新は受け付けない
  update<T = unknown>(
    table: string,
    filter: string,
    patch: Record<string, unknown>,
    options?: { returning?: boolean },
  ): Promise<T[]>;
  rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T>;
};

export function createSupabaseRest(config: { url: string; serviceRoleKey: string; http: HttpClient }): SupabaseRest {
  const base = `${config.url.replace(/\/$/, "")}/rest/v1`;
  // 新しい形式（sb_secret_...）の key も旧形式（JWT）も、supabase-js と同じく apikey と Authorization の両方に入れる
  const headers = {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    "Content-Type": "application/json",
  };

  async function send<T>(path: string, init: RequestInit): Promise<T> {
    const response = await config.http.request(`${base}/${path}`, {
      ...init,
      headers: { ...headers, ...init.headers },
    });
    const text = await response.text();
    return (text === "" ? null : JSON.parse(text)) as T;
  }

  function prefer(returning: boolean | undefined, extra: string[] = []): Record<string, string> {
    return { Prefer: [returning ? "return=representation" : "return=minimal", ...extra].join(",") };
  }

  return {
    async select<T>(table: string, query: string) {
      return send<T[]>(`${table}?${query}`, { method: "GET" });
    },

    async insert<T>(
      table: string,
      rows: Record<string, unknown> | Record<string, unknown>[],
      options: { returning?: boolean; onConflict?: string } = {},
    ) {
      const query = options.onConflict ? `?on_conflict=${encodeURIComponent(options.onConflict)}` : "";
      const result = await send<T[] | null>(`${table}${query}`, {
        method: "POST",
        headers: prefer(options.returning, options.onConflict ? ["resolution=merge-duplicates"] : []),
        body: JSON.stringify(rows),
      });
      return result ?? [];
    },

    async update<T>(
      table: string,
      filter: string,
      patch: Record<string, unknown>,
      options: { returning?: boolean } = {},
    ) {
      if (filter.trim() === "") throw new Error(`${table} の更新に絞り込みがない`);
      const result = await send<T[] | null>(`${table}?${filter}`, {
        method: "PATCH",
        headers: prefer(options.returning),
        body: JSON.stringify(patch),
      });
      return result ?? [];
    },

    async rpc<T>(fn: string, args: Record<string, unknown>) {
      return send<T>(`rpc/${fn}`, { method: "POST", body: JSON.stringify(args) });
    },
  };
}
