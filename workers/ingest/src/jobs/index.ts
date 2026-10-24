import type { Job } from "../job";
import { busFeeds } from "./bus-feeds";
import { heartbeat } from "./heartbeat";
import { schools } from "./schools";
import { transactions } from "./transactions";

// 定期取得で動かす処理の一覧。並びの順に実行する。
// 呼び出し回数の上限（9.3）は全部で分け合うので、外部 API を多く呼ぶ処理は同じ日に重ならないよう shouldRun で分ける
// schools は取り直しの時期だけ外部 API を多く呼ぶ（1日に1段階・12回まで）
export const JOBS: readonly Job[] = [heartbeat, transactions, busFeeds, schools];
