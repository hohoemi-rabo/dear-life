# 005 定期取得 Worker の基盤

- 主な要件：9章（データの流れ）、9.3（無料プランの上限）、8章（信頼性）、7.2（呼び出し間隔）
- 依存：001、003

## 目的

毎日1回の Cron で、その日にやる取得処理を選んで実行し、結果を Supabase に保存・記録する仕組みを作る。個別の取得処理（006・008・009・010）はこの上に載せる。

## 仕様メモ

- Cron は1個だけ（アカウント全体で5個まで）。中でやることを切り替える（例：毎日＝取引の新四半期チェック、4月以降の決まった日＝学区・学校・保育の取り直し）
- 1回の実行の CPU 時間は 10ms まで。Worker は「取得して保存するだけ」にし、集計は Supabase の SQL 関数で行う（通信の待ち時間は CPU 時間に含まれない）
- 1回の実行で外部への呼び出しは 50 回まで。多いときは数日に分けて取り込む（進み具合を `ingest_runs` に持つ）
- 外部 API の呼び出しの間は 1.5 秒以上あける
- タイムアウトと指数バックオフのリトライを入れる。失敗したら前回のデータを残したまま、`ingest_runs` に失敗を記録し、管理者に知らせる
- 毎日 Supabase に書き込むので、無料プランの7日間停止も防げる（9.2）
- Supabase への書き込みは `service_role` key（Secret）で REST を直接呼ぶか supabase-js を使う。バンドルが大きくなりすぎないほうを選ぶ

## Todo

- [×] 実行する処理の振り分け（その日に何をやるか）を作る
- [×] 外部呼び出しの共通処理（1.5 秒以上の間隔・タイムアウト・リトライ・呼び出し回数の上限管理）を作り、テストを書く
- [ ] （まさゆきさん）`SUPABASE_SERVICE_ROLE_KEY` を Secret に登録する（書き込みを作る直前にお願いする。値はチャット・コードに書かない）
  - `npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config workers/ingest/wrangler.jsonc`
- [×] Supabase への書き込みの共通処理を作る
- [×] `ingest_runs` への記録（開始・終了・件数・エラー）を作る
- [×] 管理者への通知方法を決めて作る（候補：Cloudflare Email Sending でまさゆきさんにメール／Supabase に記録して画面のない確認手順にする）
  - 2026-10-22 まさゆきさんの判断で Discord の Webhook に決定
- [ ] （まさゆきさん）Discord で通知用のチャンネルの Webhook を作り、URL を Secret に登録する（値はチャット・コードに書かない）
  - `npx wrangler secret put DISCORD_WEBHOOK_URL --config workers/ingest/wrangler.jsonc`
- [×] 町名→地区の振り分けの共通処理を作る（004 の引き継ぎ）：実行の最初に `town_district_map` を Supabase から読み、`src/lib/town-district/resolve.ts` の `createTownResolver` に渡す（Worker からは相対パスで import する。`@/` は使えない）。当たらなかった住所は `townNameForRecord` で町名にし、1回の取得の最後に `rpc/record_unmapped_towns` でまとめて記録する
- [×] 未反映の `unmapped_towns`（`resolved_at is null`）も管理者への通知に含める（要件 5章-2・10章）
- [ ] `npm run ingest:dev` と `/__scheduled` でローカル実行できることを確認する
- [ ] Worker をデプロイし、Cron が動くこと・ログに出ることを確認する（初回デプロイ。001 から移した）
- [ ] Git 連携の自動デプロイを `dear-life-ingest` にも設定するか決める（Deploy command は `npx wrangler deploy --config workers/ingest/wrangler.jsonc`）

## 作ったもの（2026-10-22）

`workers/ingest/src/` の構成。新しい取得処理は `jobs/` に `Job` を足し、`jobs/index.ts` の `JOBS` に並べるだけで、記録・通知・呼び出し回数の管理は runner が受け持つ。

| ファイル | 役割 |
| --- | --- |
| `index.ts` | Cron の入口。`runIngest` を呼ぶだけ |
| `runner.ts` | その日に動かす処理を選んで順に実行し、`ingest_runs` に記録し、必要なら通知する |
| `job.ts` | 取得処理の形（`Job`・`JobContext`）と `Env` |
| `jobs/` | 取得処理。今は `heartbeat`（毎日 `ingest_runs` に1行書くだけ。流れの確認と Supabase の7日間停止の防止） |
| `http.ts` | 通信の共通処理。間隔・タイムアウト（30秒）・リトライ（429・5xx・通信失敗。待ち時間を倍にしていく。Retry-After を守る）・呼び出し回数の予算 |
| `supabase.ts` | PostgREST を直接呼ぶ小さなクライアント（select・insert/upsert・update・rpc） |
| `runs.ts` | `ingest_runs` の開始・終了・続きの位置・止まった実行の後始末 |
| `towns.ts` | 対応表の読み込み（最初に使うときだけ）・対応表にない町名の記録・未反映の町名の一覧 |
| `notify.ts` | Discord の Webhook への投稿。URL がなければログに出す |

決めたこと：

- **supabase-js は使わない**。必要な操作が少ないので PostgREST を直接呼ぶ。バンドルは 17.8 KiB（gzip 6.2 KiB）
- **呼び出し回数の予算は外部 API・Supabase・Discord で共有する**（Workers の上限は宛先を問わず数えるため）。全体50回のうち、外部 API は記録と通知のために8回を残した分までしか使えない。リトライも1回と数える。使い切ったら `CallBudgetExceededError` で処理を失敗にする。外部 API を多く呼ぶ処理は、`shouldRun` で同じ日に重ならないようにする
- 外部 API の間隔は、前の応答が返ってから次を送るまでで 1.5 秒以上あける（リトライのときも）
- エラーメッセージには URL のホストとパスだけを出す（クエリに API キーが入ることがあるため）
- 処理が失敗したら、その処理で集めた「対応表にない町名」は記録しない（次の実行で数え直すと回数が二重になるため）
- 開始から1時間たっても `running` の実行は、CPU 時間の上限などで止められたとみなし、次の実行の最初に `failed` にして通知する
- 通知するのは：処理の失敗・止まっていた実行・今回新しく見つかった未反映の町名があるとき。以前からの未反映の町名だけなら、月曜にだけ知らせる。何もなければ送らない
- `SUPABASE_SERVICE_ROLE_KEY` が未登録なら、Supabase を呼ばずにそのことを通知する
- ローカル実行の秘密情報は `workers/ingest/.dev.vars`（雛形 `.dev.vars.example`。Git に入れない）
- テストは `workers/**/*.test.ts` も Vitest で動かす（`vitest.config.mts`）

## 完了条件

- 中身が空の取得処理でも、Cron で起動 → 記録 → 失敗時の通知まで通しで動く
