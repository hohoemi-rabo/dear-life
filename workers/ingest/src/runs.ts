// ingest_runs への実行記録（開始・終了・件数・エラー・続きの位置）
import type { SupabaseRest } from "./supabase";

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export type RunOutcome =
  | { status: "succeeded"; rowsWritten: number; externalCalls: number; progress: Json | null }
  | { status: "failed"; externalCalls: number; errorMessage: string };

// エラーの全文はログに出し、記録と通知には読める長さだけを残す
const MAX_ERROR_LENGTH = 1000;

// これより前に始まって終わっていない実行は、途中で止まったとみなす（Cron の実行は最大15分）
export const STALE_RUN_MS = 60 * 60 * 1000;

export async function startRun(db: SupabaseRest, job: string, sourceId: string | null): Promise<number> {
  const [row] = await db.insert<{ id: number }>("ingest_runs", { job, source_id: sourceId }, { returning: true });
  if (!row) throw new Error(`ingest_runs に ${job} の開始を記録できなかった`);
  return row.id;
}

// 終了日時はデータベースのトリガーが付ける（開始日時と同じ時計にそろえるため）
export async function finishRun(db: SupabaseRest, runId: number, outcome: RunOutcome): Promise<void> {
  const patch =
    outcome.status === "succeeded"
      ? { rows_written: outcome.rowsWritten, progress: outcome.progress }
      : { error_message: outcome.errorMessage.slice(0, MAX_ERROR_LENGTH) };
  await db.update("ingest_runs", `id=eq.${runId}`, {
    status: outcome.status,
    external_calls: outcome.externalCalls,
    ...patch,
  });
}

// 数日に分けて取り込む処理の続きの位置。最後に成功した実行の progress を返す
export async function latestProgress(db: SupabaseRest, job: string): Promise<Json | null> {
  const rows = await db.select<{ progress: Json | null }>(
    "ingest_runs",
    `select=progress&job=eq.${encodeURIComponent(job)}&status=eq.succeeded&order=started_at.desc&limit=1`,
  );
  return rows[0]?.progress ?? null;
}

// CPU 時間の上限などで Worker が止められると、実行が running のまま残る。失敗として閉じ、通知に含める
export async function closeStaleRuns(db: SupabaseRest, now: number): Promise<{ id: number; job: string }[]> {
  const before = new Date(now - STALE_RUN_MS).toISOString();
  return db.update<{ id: number; job: string }>(
    "ingest_runs",
    `status=eq.running&started_at=lt.${encodeURIComponent(before)}`,
    {
      status: "failed",
      error_message: "実行が途中で止まった（CPU 時間の上限などで Worker が止められた可能性がある）",
    },
    { returning: true },
  );
}
