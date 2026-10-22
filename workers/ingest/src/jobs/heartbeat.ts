import type { Job } from "../job";

// 毎日の生存確認。外部には何も取りに行かず、ingest_runs に1行書くだけ。
// Cron → 記録 → 通知の流れが動いていることを確かめ、Supabase 無料プランの7日間停止も防ぐ（要件 9.2）
export const heartbeat: Job = {
  name: "heartbeat",
  sourceId: null,
  shouldRun: () => true,
  run: async () => ({ rowsWritten: 0 }),
};
