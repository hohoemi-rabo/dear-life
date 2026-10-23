# 003 Supabase テーブル設計とマイグレーション

- 主な要件：9.4（権限設定）、9.5（v2.0で足すテーブル）、7.2（出典・対象時点・確認日）、11.2-4
- 依存：なし

## 目的

データベースは **Supabase に決定**（プロジェクト `dear-life`、ref `ywugkkofnqkpnzkmucyv`、Tokyo）。要件 11.1 の「Supabase か D1 か」はこれで解決とする。全データのテーブルを設計し、権限込みのマイグレーションで作る。

## テーブル（最終版。2026-10-22 適用）

| テーブル | 中身 | 書く人 | anon |
| --- | --- | --- | --- |
| `districts` | 4地区（id・表示名・並び順・範囲の説明）。id は `kamisato` `kanae` `igara` `chushin` | マイグレーション | 全行 |
| `data_sources` | データごとの出典名・提供元・URL・ライセンス・クレジット表記・対象期間・取得日時・確認日・公開フラグ | Worker / 手動 | 公開済みのみ |
| `town_district_map` | 町名 → 飯田市の地区名（対象外も含む）・対象地区 id（4地区のときだけ）・中心市街地の元の地区名・確度・メモ | 004 | 全行 |
| `real_estate_transactions` | XIT001 の取引（年・四半期・種類・町名・DistrictCode・地区・価格・㎡単価・面積・建築年・用途・取引の事情等・除外フラグ・元の行） | Worker（006） | なし |
| `market_stats` | 地区×種類（`land` / `house_built_within_20y` / `house_built_over_20y`）の真ん中の値・下位25%・上位25%・件数・対象期間（`2021Q1` 形式） | SQL 関数（007） | 公開済みの出典のみ |
| `facilities` | 学校・保育施設・避難場所・公共施設・バス停・駅の点（種類・元の区分・名称・住所・町名・地区・緯度経度・出典・元データの識別子・追加の項目） | Worker / 手動 | 公開済みの出典のみ |
| `school_districts` | 小学校区・中学校区の範囲（GeoJSON の Polygon / MultiPolygon）と学校名 | Worker（008） | 公開済みの出典のみ |
| `population` | 地区×対象時点の人口と年齢構成（0〜14・15〜64・65歳以上） | 手動（011） | 公開済みの出典のみ |
| `support_programs` | 支援制度名・概要・分野・公式リンク・確認日・並び順・公開フラグ | Table Editor | 公開済みのみ |
| `district_events` | 地区の行事（要件 7.1 の項目＋子ども向けか・並び順・公開フラグ） | Table Editor | 公開済みのみ |
| `scene_templates` | 場面のひな形（季節・子どもの有無・車・家・管理用の名前・確認日・公開フラグ） | 017 | 公開済みのみ |
| `scene_sentences` | ひな形の文（並び順・種類・本文・カルテのリンク先・文ごとの追加の条件） | 017 | 公開済みのひな形の文のみ |
| `ingest_runs` | 定期取得の実行記録（処理名・出典・状態・開始/終了・件数・外部呼び出し回数・エラー・続きの位置） | Worker（005） | なし |
| `unmapped_towns` | 対応表にない町名（町名・出典・初回/最終・回数・反映した日時） | Worker | なし |

バス・電車の便と本数のテーブルは、データを見てから 010・026 で決める（このチケットでは作らない）。

010 で足したテーブル（2026-10-23 適用）：

| テーブル | 中身 | 書く人 | anon |
| --- | --- | --- | --- |
| `bus_outings` | 冬・車0台のおでかけ（地区・並び順・曜日・時刻表を見た日・乗り場・行き先・状態・行き／帰り／次の便の時刻と路線・直通便の数・乗り場の便の数・有効期間の終わり） | `npm run bus:sql`（010） | 公開済みの出典のみ |
| `gtfs_feeds` | 取り込んだ GTFS のフィードと版（リポジトリの `gtfs_file_uid`・有効期間）。Worker が新しい版の確認に使う | `npm run bus:sql`（010） | なし |

### 設計で決めたこと

- **「該当なし」と「データ未取得」の区別（F-09）**：`data_sources` の行がない、または `is_published = false` なら「データ未取得」。利用条件を確認中のデータ（バスの GTFS など）は、出典を公開するまで中身も anon から読めない（ポリシーで出典の公開フラグを見ている）。出典が公開済みで0件なら「該当なし」。相場は件数0なら値を null にする制約を付けた
- **Table Editor で選ぶ値は日本語の enum**：季節（春夏秋冬）、中心市街地の元の地区名、行事の範囲・参加のしかた・絵の種類、支援制度の分野、ひな形の文の種類・家・車・カルテのカード。Worker やコードだけが書く値（施設の種類・相場の種類・取得の状態）は英語
- **入力ミスを止める制約**（エラーに名前が出る）
  - `district_events_chushin_area_required`：中心市街地の行事には元の地区名が必要で、ほかの地区では持てない
  - `scene_sentences_assumption_plain`：想定の文に数字（全角も）・差し込み部分 `{}` を入れられない。施設名・評価が入っていないかは 017 のチェックで見る
  - `scene_templates_condition_unique`：同じ条件のひな形は1つだけ（空欄どうしも同じとみなす）
  - `scene_templates_review_before_publish`：確認日がないと公開できない
  - `market_stats_value_iff_samples`：件数0なら値なし、件数があれば値あり
- **差し込み部分は本文から読む**：`{地区名}` などを別の列に持たず、本文が唯一の情報源（017 の差し込み処理で取り出す）
- **取引の重複**：取引に固有の ID がなく、同じ内容の取引もあり得るので、四半期ごとに消して入れ直す（006）
- **画面が読む形（ビュー / RPC）** は、画面の要件が決まる 015 で作る。今は必要な列を `select` で指定して読む

## 権限のルール（9.4・CLAUDE.md）

- テーブルを作るマイグレーションに、RLS 有効化・GRANT・ポリシーを必ず一緒に書く
- `anon`：`select` のみ＋読み取りポリシー。`service_role`：`select, insert, update, delete`。`authenticated`：何も与えない
- 画面に見せない表（`ingest_runs`・`unmapped_towns`・`real_estate_transactions`）は `anon` に GRANT しない
- 最初のマイグレーションで、Supabase の既定（新しいテーブル・関数に anon / authenticated の全権限を付ける）を `alter default privileges` で外した。**これ以降に作るテーブル・関数は、GRANT を書かないと anon からも service_role からも使えない**（007 の SQL 関数・015 の RPC も `grant execute` を明示する）
- Supabase がプロジェクト作成時に置いた `public.rls_auto_enable()`（RLS を自動で有効にするイベントトリガーの関数）は、anon から RPC で呼べたので実行権限を外した。トリガーは引き続き動く

## マイグレーションの置き場所と当て方

- `supabase/migrations/<版番号>_<名前>.sql`。版番号は Supabase に記録された番号（`list_migrations`）に合わせる
- Supabase CLI は入れない。**Supabase MCP の `apply_migration` で当て、同じ SQL をリポジトリに残す**。当てたあと `list_migrations` で版番号を確かめてファイル名を合わせる
- 当てる前に `npm test` を流す。`src/test/supabase-migrations.test.ts` が、全マイグレーションを手元の Postgres（PGlite）に当て、権限・公開の範囲・制約を確かめる（本番と同じ「全権限が付く」既定を再現してから当てる）
- 当てたら型を作り直す（MCP の `generate_typescript_types` → `src/lib/supabase/database.types.ts`）
- MCP のトークンには書き込みの権限（`database_migrations_write` など）が要る。読み取りだけのトークンだと `apply_migration` が断られる（2026-10-22 に作り直してもらった）

## Todo

- [×] テーブル設計を詰め、このチケットに最終版の表を書き直す
- [×] マイグレーションファイルの置き場所を決める → `supabase/migrations/`。MCP の apply_migration で当て、同じ SQL をリポジトリに残す
- [×] マイグレーションを作成して適用する（RLS・GRANT・ポリシー込み）
- [×] `districts` に4地区を入れる
- [×] Supabase の advisors（security / performance）で警告がないことを確認する → WARN は0件。INFO は2種類で、どちらも想定どおり（非公開の3表に「ポリシーがない」＝service_role だけが使う／「使われていないインデックス」＝データが空）
- [×] （まさゆきさん）Data API の設定画面で、公開されているテーブルが想定どおりか確かめる（9.4）→ 2026-10-22 まさゆきさんが確認済み。anon が読めるのは上の表で「anon」が「なし」以外の11表
- [×] `anon` で書き込めないこと、非公開の表が読めないことを確認する → 本番の REST に publishable key でアクセスして確認（書き込み・非公開の3表・`rpc/rls_auto_enable` はすべて 401）。同じことを `npm test` でも毎回確かめる
- [×] TypeScript の型を生成してリポジトリに置く（`src/lib/supabase/database.types.ts`）

## 完了条件

- マイグレーションがリポジトリにあり、Supabase に適用済み。advisors に security の警告がない
