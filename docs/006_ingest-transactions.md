# 006 不動産取引価格の取得（XIT001）

- 主な要件：5章-1〜3（対象期間・地区の振り分け・除外する取引）、7章（不動産取引価格）、10章（取得頻度）
- 依存：004、005

## 目的

不動産情報ライブラリ API XIT001 から飯田市の取引価格を取得し、地区を振り分けて `real_estate_transactions` に保存する。

## 仕様メモ

- 対象：飯田市・直近20四半期（5年）。CSV と 1,313 件すべて一致することを確認済み（7章）
- 毎日確認し、新しい四半期が公開されたときだけ取得する
- 地区の振り分けは API の `DistrictCode` を対応表に当てはめる。対応表にない町名は集計から外し、`unmapped_towns` に記録する
- 除外する取引：「調停・競売等」「関係者間取引」「隣地の購入」。行は保存し、除外フラグを立てる（「データについて」で除外件数を出すため）
- API キーは `REINFOLIB_API_KEY`（Secret）。ブラウザからは呼ばない
- 集計ロジックは `aggregate_iida.py` と同じにする（007 で検証）

## 005 からの引き継ぎ（2026-10-23）

- 取得処理は `workers/ingest/src/jobs/` に `Job`（`workers/ingest/src/job.ts`）として作り、`jobs/index.ts` の `JOBS` に足す。記録（`ingest_runs`）・通知（Discord）・呼び出し回数の管理は runner が受け持つ。構成と決めたことは `docs/005_ingest-worker-base.md` の「作ったもの」
- API は `context.external.request(url)` で呼ぶ（1.5 秒以上の間隔・タイムアウト・リトライ付き）。1回の実行で外部 API に使えるのは、全体50回から記録用の8回を引いた42回まで。20四半期の初回取り込みは `JobResult.progress` と `context.previousProgress()` で数日に分ける
- 地区の振り分けは `await context.townResolver()` で得た関数に住所（町名）を渡す。当たらなければ `context.unmappedTowns.add(住所)` に入れる。処理が成功したら runner が `sourceId` で `record_unmapped_towns` に記録し、新しい町名は Discord に通知される
- Supabase への保存は `context.db`（PostgREST を直接呼ぶ小さなクライアント）。同じ取引を二重に入れないよう `insert(..., { onConflict })` で upsert する。1回の呼び出しでまとめて送り、呼び出し回数を節約する
- テストは `workers/ingest/src/*.test.ts`（`// @vitest-environment node`）。`runner.test.ts` の偽の Supabase を参考にする
- Secret は**別のターミナルで** `wrangler secret put` を実行してもらう（Claude Code の `!` から実行すると値を聞かれず、空の値が登録されてしまう。005 で起きた）。ローカル実行では `workers/ingest/.dev.vars` にも同じ値を入れてもらう

## Todo

- [ ] （まさゆきさん）`REINFOLIB_API_KEY` を Secret に登録する（API を呼ぶ直前にお願いする。値はチャット・コードに書かない）
  - `npx wrangler secret put REINFOLIB_API_KEY --config workers/ingest/wrangler.jsonc`
- [ ] XIT001 のリクエスト・レスポンスの型を作る（利用約款と API 仕様を確認）
- [ ] 四半期ごとの取得と、新しい四半期が出たかの判定を作る
- [ ] 地区の振り分けと除外フラグの付与を作り、テストを書く
- [ ] Supabase への保存（同じ取引を二重に入れない）を作る
- [ ] 初回の全件取り込み（20四半期分。呼び出し回数の上限に注意して分割）
- [ ] 取り込んだ件数が CSV の 1,313 件と一致することを確かめる
- [ ] `data_sources` に出典・対象期間・取得日を記録する

## 完了条件

- 20四半期分が保存され、件数が一致する。新しい四半期が出たときだけ自動で取得される
