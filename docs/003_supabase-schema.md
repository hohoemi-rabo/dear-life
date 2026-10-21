# 003 Supabase テーブル設計とマイグレーション

- 主な要件：9.4（権限設定）、9.5（v2.0で足すテーブル）、7.2（出典・対象時点・確認日）、11.2-4
- 依存：なし

## 目的

データベースは **Supabase に決定**（プロジェクト `dear-life`、ref `ywugkkofnqkpnzkmucyv`、Tokyo）。要件 11.1 の「Supabase か D1 か」はこれで解決とする。全データのテーブルを設計し、権限込みのマイグレーションで作る。

## テーブル案（実装しながら詰める）

| テーブル | 中身 | 書く人 |
| --- | --- | --- |
| `districts` | 4地区（id・表示名・並び順・範囲の説明） | マイグレーション |
| `town_district_map` | 町名・DistrictCode → 地区（中心市街地は元の地区名も） | 004 |
| `real_estate_transactions` | XIT001 の取引（生データ。除外フラグ・地区も持つ） | Worker |
| `market_stats` | 地区×種類（土地・築20年以内・築21年以上）の真ん中の値・幅・件数・対象期間 | SQL 関数（007） |
| `facilities` | 学校・保育施設・避難場所・公共施設・バス停の点（種類・名称・住所・緯度経度・地区・出典） | Worker / 手動 |
| `school_districts` | 小学校区・中学校区の範囲（GeoJSON）と学校名 | Worker |
| `population` | 地区ごとの人口と年齢構成・対象時点 | 手動（011） |
| `support_programs` | 支援制度名・概要・公式リンク・確認日 | Table Editor |
| `district_events` | 地区の行事（7.1 の項目） | Table Editor |
| `scene_templates` / `scene_sentences` | 場面のひな形（季節・条件・文の並び・文の種類・差し込み部分） | 017 |
| `data_sources` | データごとの出典名・ライセンス表記・対象期間・取得日/確認日 | Worker / 手動 |
| `ingest_runs` | 定期取得の実行記録（いつ・何を・成否・件数・エラー） | Worker |
| `unmapped_towns` | 対応表にない町名の記録（管理者への通知用） | Worker |

- 「該当なし」と「データ未取得」を区別できるようにする（F-09）。例：取得済みかどうかは `data_sources`・`ingest_runs` で判断し、0件なら「該当なし」
- 画面が読むものは、必要な列だけを出すビュー（または RPC）にまとめ、オーバーフェッチを避ける

## 権限のルール（9.4・CLAUDE.md）

- テーブルを作るマイグレーションに、RLS 有効化・GRANT・ポリシーを必ず一緒に書く
- `anon`：`select` のみ＋読み取りポリシー。`service_role`：`select, insert, update, delete`。`authenticated`：何も与えない
- 画面に見せない表（`ingest_runs`・`unmapped_towns`・生の取引など）は `anon` に GRANT しない

## Todo

- [ ] テーブル設計を詰め、このチケットに最終版の表を書き直す
- [ ] マイグレーションファイルの置き場所を決める（`supabase/migrations/`。Supabase CLI を入れるか、MCP の apply_migration で当てて同じ SQL をリポジトリに残すか）
- [ ] マイグレーションを作成して適用する（RLS・GRANT・ポリシー込み）
- [ ] `districts` に4地区を入れる
- [ ] Supabase の advisors（security / performance）で警告がないことを確認する
- [ ] Data API の設定画面で、公開されているテーブルが想定どおりか確かめる（9.4）
- [ ] `anon` で書き込めないこと、非公開の表が読めないことを確認する
- [ ] TypeScript の型を生成してリポジトリに置く（`src/lib/supabase/database.types.ts` など）

## 完了条件

- マイグレーションがリポジトリにあり、Supabase に適用済み。advisors に security の警告がない
