// 1回の Cron の実行：その日に動かす処理を選んで順に実行し、ingest_runs に記録し、必要なら管理者に知らせる。
// 処理が失敗しても、保存済みのデータは消さない（前回のデータを表示し続ける。要件 8章の信頼性）
import { CallBudget, createHttpClient } from "./http";
import type { Env, Job, JobContext } from "./job";
import { JOBS } from "./jobs";
import { createDiscordNotifier, type Notifier } from "./notify";
import { closeStaleRuns, finishRun, latestProgress, startRun } from "./runs";
import { createSupabaseRest } from "./supabase";
import { toJstDate, type JstDate } from "./time";
import { listUnresolvedTowns, loadTownResolver, UnmappedTownCollector, type TownResolver, type UnresolvedTown } from "./towns";

// 外部 API の呼び出しの間隔（要件 7.2）
export const EXTERNAL_MIN_INTERVAL_MS = 1500;

// 取得処理が呼び出し回数を使い切っても、記録と通知のために残しておく回数。
// 内訳：町名の記録・終了の記録・後に続く処理の開始と終了・未反映の町名の読み込み・通知と、そのリトライの余裕
export const CALLS_KEPT_FOR_BOOKKEEPING = 8;

// 通知に並べる未反映の町名の数（Discord の本文の長さに収めるため）
const UNRESOLVED_TOWNS_SHOWN = 30;

// 未反映の町名は、新しく見つかった日のほか、週に1回（月曜）も知らせる
const UNRESOLVED_REMINDER_WEEKDAY = 1;

export type JobFailure = { job: string; message: string };

export type IngestSummary = {
  today: JstDate;
  ran: string[];
  failures: JobFailure[];
  staleRuns: { id: number; job: string }[];
  unresolvedTowns: UnresolvedTown[];
  notified: boolean;
};

export type IngestDeps = {
  fetch?: typeof fetch;
  jobs?: readonly Job[];
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// 通知の失敗で実行全体を失敗にはしない（記録は ingest_runs に残っている）
async function trySend(notify: Notifier, message: string): Promise<boolean> {
  try {
    await notify(message);
    return true;
  } catch (error) {
    console.error("ingest: notification failed", error);
    return false;
  }
}

export async function runIngest(env: Env, scheduledTime: number, deps: IngestDeps = {}): Promise<IngestSummary> {
  const { fetch: fetchImpl, jobs = JOBS } = deps;
  const startedAt = Date.now();
  const today = toJstDate(scheduledTime);
  const budget = new CallBudget();
  const db = createSupabaseRest({
    url: env.SUPABASE_URL,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    http: createHttpClient({ budget, maxRetries: 2, fetch: fetchImpl }),
  });
  const notify = createDiscordNotifier(createHttpClient({ budget, maxRetries: 2, fetch: fetchImpl }), env.DISCORD_WEBHOOK_URL);

  const failures: JobFailure[] = [];
  const ran: string[] = [];

  // key がないと Supabase へのどの呼び出しも 401 になるので、呼ぶ前に止めて原因をそのまま知らせる
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    failures.push({ job: "(設定)", message: "SUPABASE_SERVICE_ROLE_KEY が登録されていないので、何も取得・記録していない" });
    const notified = await trySend(
      notify,
      formatNotification({ today, failures, staleRuns: [], unresolvedTowns: [], newlySeenTowns: [] }),
    );
    return { today, ran, failures, staleRuns: [], unresolvedTowns: [], notified };
  }
  let resolverPromise: Promise<TownResolver> | null = null;

  let staleRuns: { id: number; job: string }[] = [];
  try {
    staleRuns = await closeStaleRuns(db, startedAt);
  } catch (error) {
    failures.push({ job: "(running のまま残った実行の確認)", message: errorMessage(error) });
  }

  for (const job of jobs.filter((candidate) => candidate.shouldRun(today))) {
    ran.push(job.name);
    // 外部 API の呼び出し回数を処理ごとに記録するため、クライアントは処理ごとに作る（予算は全体で共有）
    const external = createHttpClient({
      budget,
      minIntervalMs: EXTERNAL_MIN_INTERVAL_MS,
      keepCalls: CALLS_KEPT_FOR_BOOKKEEPING,
      fetch: fetchImpl,
    });
    const unmappedTowns = new UnmappedTownCollector();
    const context: JobContext = {
      env,
      today,
      external,
      db,
      townResolver: () => (resolverPromise ??= loadTownResolver(db)),
      unmappedTowns,
      previousProgress: () => latestProgress(db, job.name),
    };

    let runId: number;
    try {
      runId = await startRun(db, job.name, job.sourceId);
    } catch (error) {
      // 記録できない（Supabase に届かない）ときは、書き込みもできないので処理を動かさない
      failures.push({ job: job.name, message: `開始を記録できなかった：${errorMessage(error)}` });
      continue;
    }

    try {
      const result = await job.run(context);
      if (job.sourceId !== null) await unmappedTowns.flush(db, job.sourceId);
      else if (unmappedTowns.size > 0) throw new Error("sourceId のない処理が、対応表にない町名を記録しようとした");
      await finishRun(db, runId, {
        status: "succeeded",
        rowsWritten: result.rowsWritten,
        externalCalls: external.calls,
        progress: result.progress ?? null,
      });
    } catch (error) {
      console.error(`ingest: job ${job.name} failed`, error);
      failures.push({ job: job.name, message: errorMessage(error) });
      try {
        await finishRun(db, runId, { status: "failed", externalCalls: external.calls, errorMessage: errorMessage(error) });
      } catch (recordError) {
        failures.push({ job: job.name, message: `失敗を記録できなかった：${errorMessage(recordError)}` });
      }
    }
  }

  let unresolvedTowns: UnresolvedTown[] = [];
  try {
    unresolvedTowns = await listUnresolvedTowns(db, UNRESOLVED_TOWNS_SHOWN);
  } catch (error) {
    failures.push({ job: "(対応表にない町名の確認)", message: errorMessage(error) });
  }

  const newlySeenTowns = unresolvedTowns.filter((town) => Date.parse(town.last_seen_at) >= startedAt);
  const shouldNotify =
    failures.length > 0 ||
    staleRuns.length > 0 ||
    newlySeenTowns.length > 0 ||
    (unresolvedTowns.length > 0 && today.weekday === UNRESOLVED_REMINDER_WEEKDAY);

  const notified =
    shouldNotify &&
    (await trySend(notify, formatNotification({ today, failures, staleRuns, unresolvedTowns, newlySeenTowns })));

  const summary: IngestSummary = { today, ran, failures, staleRuns, unresolvedTowns, notified };
  console.log(
    `ingest: ${today.iso} ran=[${ran.join(",")}] failures=${failures.length} stale=${staleRuns.length} ` +
      `unresolvedTowns=${unresolvedTowns.length} notified=${notified} calls=${budget.limit - budget.remaining}`,
  );
  return summary;
}

export function formatNotification(input: {
  today: JstDate;
  failures: JobFailure[];
  staleRuns: { id: number; job: string }[];
  unresolvedTowns: UnresolvedTown[];
  newlySeenTowns: UnresolvedTown[];
}): string {
  const lines = [`**DearLife 定期取得（${input.today.iso}）**`];
  if (input.failures.length > 0) {
    lines.push("", "失敗した処理（保存済みのデータはそのまま残っています）：");
    for (const failure of input.failures) lines.push(`- ${failure.job}：${failure.message}`);
  }
  if (input.staleRuns.length > 0) {
    lines.push("", "途中で止まっていた実行（失敗として記録しました）：");
    for (const run of input.staleRuns) lines.push(`- #${run.id} ${run.job}`);
  }
  if (input.unresolvedTowns.length > 0) {
    lines.push(
      "",
      `対応表にない町名（未反映 ${input.unresolvedTowns.length}件${input.unresolvedTowns.length >= UNRESOLVED_TOWNS_SHOWN ? "以上" : ""}、` +
        `うち今回見つかったもの ${input.newlySeenTowns.length}件）：`,
    );
    for (const town of input.unresolvedTowns) {
      lines.push(`- ${town.town_name}（${town.source_id}、${town.occurrences}回）`);
    }
    lines.push("→ data/iida_district_map.csv に行を足して反映してください（手順は docs/004_district-master.md）");
  }
  return lines.join("\n");
}
