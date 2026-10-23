import type { Job } from "../job";
import { heartbeat } from "./heartbeat";
import { transactions } from "./transactions";

// 定期取得で動かす処理の一覧。並びの順に実行する。
// 呼び出し回数の上限（9.3）は全部で分け合うので、外部 API を多く呼ぶ処理は同じ日に重ならないよう shouldRun で分ける
export const JOBS: readonly Job[] = [heartbeat, transactions];
