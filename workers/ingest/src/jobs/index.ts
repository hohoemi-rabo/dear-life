import type { Job } from "../job";
import { busFeeds } from "./bus-feeds";
import { cityTransactions } from "./city-transactions";
import { heartbeat } from "./heartbeat";
import { schools } from "./schools";
import { transactions } from "./transactions";

// 定期取得で動かす処理の一覧。並びの順に実行する。
// 呼び出し回数の上限（9.3）は全部で分け合うので、外部 API を多く呼ぶ処理は同じ日に重ならないよう shouldRun で分ける
// schools は取り直しの時期だけ外部 API を多く呼ぶ（1日に1段階・12回まで）。
// city_transactions は飯田の取引（transactions）が決めた最新の四半期を使うので、その後ろに置く。初回は数日に分けて取る（041）
export const JOBS: readonly Job[] = [heartbeat, transactions, cityTransactions, busFeeds, schools];
