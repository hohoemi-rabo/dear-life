// 取得処理（006・008・009・010 など）の形。runner がその日に動かすものを選び、記録と通知を受け持つ
import type { HttpClient } from "./http";
import type { Json } from "./runs";
import type { SupabaseRest } from "./supabase";
import type { JstDate } from "./time";
import type { TownResolver, UnmappedTownCollector } from "./towns";

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  REINFOLIB_API_KEY?: string;
  DISCORD_WEBHOOK_URL?: string;
}

export type JobContext = {
  env: Env;
  // 日本時間の今日
  today: JstDate;
  // 外部 API 用。呼び出しの間を 1.5 秒以上あけ、タイムアウトとリトライ付き
  external: HttpClient;
  db: SupabaseRest;
  // 町名→地区の対応表。1回の実行で最初に使うときだけ読み込む
  townResolver(): Promise<TownResolver>;
  // 対応表に当たらなかった住所を入れる。取得が成功したら runner が記録する（出典を渡さなければ job.sourceId で）
  unmappedTowns: UnmappedTownCollector;
  // 前回成功した実行の続きの位置（数日に分けて取り込む処理用）
  previousProgress(): Promise<Json | null>;
};

export type JobResult = {
  rowsWritten: number;
  // 次の実行に引き継ぐ続きの位置。終わったら null
  progress?: Json | null;
};

export type Job = {
  // ingest_runs.job に入る名前
  name: string;
  // data_sources.id。対応表にない町名の記録にも使う。複数の出典を取り込む処理は null にし、町名ごとに出典を渡す
  sourceId: string | null;
  shouldRun(today: JstDate): boolean;
  run(context: JobContext): Promise<JobResult>;
};
