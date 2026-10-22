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

- [ ] 実行する処理の振り分け（その日に何をやるか）を作る
- [ ] 外部呼び出しの共通処理（1.5 秒以上の間隔・タイムアウト・リトライ・呼び出し回数の上限管理）を作り、テストを書く
- [ ] （まさゆきさん）`SUPABASE_SERVICE_ROLE_KEY` を Secret に登録する（書き込みを作る直前にお願いする。値はチャット・コードに書かない）
  - `npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config workers/ingest/wrangler.jsonc`
- [ ] Supabase への書き込みの共通処理を作る
- [ ] `ingest_runs` への記録（開始・終了・件数・エラー）を作る
- [ ] 管理者への通知方法を決めて作る（候補：Cloudflare Email Sending でまさゆきさんにメール／Supabase に記録して画面のない確認手順にする）
- [ ] 町名→地区の振り分けの共通処理を作る（004 の引き継ぎ）：実行の最初に `town_district_map` を Supabase から読み、`src/lib/town-district/resolve.ts` の `createTownResolver` に渡す（Worker からは相対パスで import する。`@/` は使えない）。当たらなかった住所は `townNameForRecord` で町名にし、1回の取得の最後に `rpc/record_unmapped_towns` でまとめて記録する
- [ ] 未反映の `unmapped_towns`（`resolved_at is null`）も管理者への通知に含める（要件 5章-2・10章）
- [ ] `npm run ingest:dev` と `/__scheduled` でローカル実行できることを確認する
- [ ] Worker をデプロイし、Cron が動くこと・ログに出ることを確認する（初回デプロイ。001 から移した）
- [ ] Git 連携の自動デプロイを `dear-life-ingest` にも設定するか決める（Deploy command は `npx wrangler deploy --config workers/ingest/wrangler.jsonc`）

## 完了条件

- 中身が空の取得処理でも、Cron で起動 → 記録 → 失敗時の通知まで通しで動く
