# 006 不動産取引価格の取得（XIT001）

- 主な要件：5章-1〜3（対象期間・地区の振り分け・除外する取引）、7章（不動産取引価格）、10章（取得頻度）
- 依存：004、005

## 目的

不動産情報ライブラリ API XIT001 から飯田市の取引価格を取得し、地区を振り分けて `real_estate_transactions` に保存する。

## 仕様メモ

- 対象：飯田市・直近20四半期（5年）。CSV と 1,313 件すべて一致することを確認済み（7章）。1,313件は取引価格と成約価格の合計（下の「決めたこと」）
- 毎日確認し、新しい四半期が公開されたときだけ取得する
- 地区の振り分けは API の町名（`DistrictName`）を対応表に当てはめる（当初は `DistrictCode` の予定だったが、対応表が町名で作られていて、コードは継続性が保証されないため。下の「決めたこと」）。対応表にない町名は集計から外し、`unmapped_towns` に記録する
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

- [×] （まさゆきさん）`REINFOLIB_API_KEY` を Secret に登録する（API を呼ぶ直前にお願いする。値はチャット・コードに書かない）
  - `npx wrangler secret put REINFOLIB_API_KEY --config workers/ingest/wrangler.jsonc`
  - 2026-10-23 登録済み（`wrangler secret list` で確認）。`workers/ingest/.dev.vars` にも入れてもらい、ローカルで API が 200 を返すことを確認した。本番の値が正しいかは、次の本番の Cron（`transactions` が `succeeded` になるか）で確かめる
- [×] XIT001 のリクエスト・レスポンスの型を作る（利用約款と API 仕様を確認）
- [×] 四半期ごとの取得と、新しい四半期が出たかの判定を作る
- [×] 地区の振り分けと除外フラグの付与を作り、テストを書く
- [×] Supabase への保存（同じ取引を二重に入れない）を作る
- [×] 初回の全件取り込み（20四半期分。呼び出し回数の上限に注意して分割）
  - 年ごとに取れるので分割は要らなかった。2026-10-23 にローカル（`npm run ingest:dev`）から本番の Supabase に取り込んだ（外部 API 9回・全体24回）。続けてもう一度動かし、次の四半期が出ていない日は API 1回だけで何も書かないことも確かめた
- [×] 取り込んだ件数が CSV の 1,313 件と一致することを確かめる
  - 2026-10-23 一致（2021年第1四半期〜2026年第1四半期で 1,313件 ＝ 取引価格 1,307件＋成約価格 6件）。除外は13件（調停・競売等 11、関係者間取引 1、隣地の購入 1）。対応表にない町名は0件
  - 保存した行から SQL（`percentile_cont`）で 5.1 の表を計算し直し、4地区の全項目が一致することも確かめた（007 の下見）
- [×] `data_sources` に出典・対象期間・取得日を記録する
  - 行（`reinfolib_xit001`）はマイグレーションで入れ、取り込んだ日に Worker が `fetched_at` と `period_label` を更新する。`is_published` は画面にクレジットを出せるようになるまで `false`（022 に Todo を足した）

- [ ] 本番の Cron（03:00 JST）で `transactions` が `succeeded`・外部 API 1回で終わることを確かめる（本番の API キーが正しいことの確認を兼ねる。失敗すれば Discord に通知が来る）

## 作ったもの（2026-10-23）

| ファイル | 役割 |
| --- | --- |
| `workers/ingest/src/jobs/transactions.ts` | 取得処理 `transactions`（毎日）。XIT001 の型・1行の変換・新しい四半期の判定・年ごとの取り込み |
| `workers/ingest/src/quarter.ts` | 四半期の計算（足し引き・比較・「2026年第1四半期」の読み書き） |
| `supabase/migrations/20261023021309_transactions_ingest.sql` | `price_category` 列、`replace_real_estate_transactions`（年ごとに消して入れ直す）、`real_estate_transaction_quarters`（取り込み済みの四半期と件数）、`data_sources` の行 |

動き：

1. `real_estate_transaction_quarters` で取り込み済みの四半期を読む
2. 取り込み済みがあれば、その次の四半期を XIT001 に聞く（ふだんはこの1回だけ。404 なら未公開）。出ていればさらに次も聞く（最大4回）。初回は今の四半期の1つ前からさかのぼって探す
3. 最新の四半期から20四半期前までの年のうち、まだない年と、新しい四半期が出た年を、年ごとに取り直す（`year` だけを指定すると、その年の公開済みの四半期がまとめて返る）
4. 1行ずつ町名を対応表に当て、除外フラグを付けて `replace_real_estate_transactions` に渡す（1年で1回の呼び出し。消すのと入れるのが1つのトランザクションなので、途中で失敗しても前のデータが残る）
5. 取り込んだら `data_sources` の取得日時と対象期間（例：2021年第1四半期〜2026年第1四半期）を更新する

決めたこと：

- **価格情報区分は指定しない（取引価格と成約価格の両方を取る）**。`priceClassification=01`（取引価格だけ）だと 1,307件で、5.1 の中古戸建ての値が合わなかった（中心市街地が83件→82件、鼎の築20年以内が12件→10件）。両方取ると 1,313件になり、5.1 と全項目一致した。基準の CSV に成約価格が入っていたため。どちらの行かは `price_category` 列に残す
- **地区の振り分けは `DistrictCode` ではなく町名（`DistrictName`）で行う**。対応表が町名で作られているため。API マニュアルにも「DistrictCode はデータ更新で変わることがあり、以前の値との継続性は保証しない」とある。`district_code` は保存だけする。対応表の当て方（いちばん長い町名の前方一致）は、2021〜2026年の90町名すべてで `aggregate_iida.py` の完全一致と同じ結果になることを確かめた
- 除外の判定は、取引の事情等を「、」で区切ったどれかが3種類のどれかなら除外とした（`aggregate_iida.py` は完全一致。今のデータには複数並んだ値がないので結果は同じ）
- 数でない値は空にする（建築年「戦前」→不明、面積「2000㎡以上」→空。`aggregate_iida.py` の `to_numeric(errors="coerce")` と同じ）。空の用途は null（集計では住宅に含める側）
- 取り込む範囲は年単位なので、最新の四半期から20四半期前より古い四半期も同じ年の分は残る。古い年の行は消さない（少ないため）。集計の期間は 007 で絞る
- API は 1.5 秒以上あけて呼ぶ（runner の共通処理）。404 は「該当なし」として扱い、それ以外の失敗（401 など）は処理の失敗にして通知する

## 完了条件## 完了条件

- 20四半期分が保存され、件数が一致する。新しい四半期が出たときだけ自動で取得される
