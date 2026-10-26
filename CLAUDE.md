# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

DearLife（飯田移住カルテ）は、飯田市への移住を考える家族向けの登録不要Webサービス。対象は上郷・鼎・伊賀良・中心市街地の4地区のみ。仕様の一次情報は `REQUIREMENTS.md`（要件定義書 v2.0）で、実装判断に迷ったらまずここを確認する。デザインイメージは `docs/design/`（PC版・スマホ版）にある。

現状は Cloudflare の設定（001）、アプリの土台（002：テーマ・共通レイアウト・共通部品・テスト）、Supabase のテーブル（003、確認済み）、町名→地区の対応表と住所→地区の関数（004）、定期取得 Worker の基盤（005：毎日 03:00 JST の Cron・`ingest_runs` への記録・Discord への通知。本番で動作確認済み）、不動産取引価格の取り込み（006：XIT001 を毎日確認し、新しい四半期が出たら年ごとに取り直す。1,313件を取り込み済み。本番の Cron で動作確認済み）、バスの取り込み（010：GTFS-JP の3フィードから4地区のバス停82か所と、冬・車0台のおでかけ9件を保存。取り込みは手元の `npm run bus:sql`、Worker の `bus_feeds` は毎日新しい版を確かめるだけ。本番の Cron で動作確認済み）、電車の取り込み（026：JR飯田線の4地区の駅7か所と発車時刻268行、駅のある3地区の冬・車0台の電車のおでかけ。場面にはバスと電車の両方を出す。駅は SENA の CC BY 2.1 JP、時刻は飯田市の PDF をまさゆきさんが書き写したもので、実装を見せてから市の許可を取るまで公開しない。取り込みは手元の `npm run train:sql`）、相場の集計（007、2026-10-26 完了：`refresh_market_stats` で4地区×3種類を `market_stats` に保存。対象期間は最新の四半期から20四半期前までの21四半期。5.1 と全項目一致を確認済み。Worker は取り込みのあと毎日呼ぶ）、学区・学校・保育施設の取り込み（008、2026-10-24 完了。009 の一部も含む。2026-10-24 に市全体に広げた。画面は4地区だけを出す。学校は市「教育機関一覧」、保育施設・放課後児童クラブは市「子育て施設」を画面に出し、取り込みは手元の `npm run education:sql`・`childcare:sql`。学区は国の XKT004・XKT005 を Worker の `schools` が入れ、XKT006・XKT007 は公開せず市のデータの抜けの確認に使う。`schools` は毎年6月1日を過ぎたら1日1段階ずつ取り直す）、避難場所・公共施設の取り込み（009、2026-10-26。市全体を入れ、画面は4地区だけを出す）までできた段階で、画面はまだない。作業は `docs/` のチケットに沿って進める（下の「チケットとTodoの管理」）。

006 と 010 は 2026-10-24 03:00 JST の本番の Cron で動作を確かめて完了した。026 は、まさゆきさんが実装を見せて飯田市に時刻の利用の許可を取るのを待つだけ（許可が出たら、ライセンスとクレジットを直して公開する。時刻は市の PDF のデータを使い続ける。全国鉄道運行本数データは本数の確かめと、許可が出なかったときの代わりの候補として 026 のメモに記録しただけ）。007 は 2026-10-26 に本番の Cron（`refresh_market_stats` が毎日呼ばれ、`market_stats` が 5.1 と一致したまま）を確かめて完了した。008 は 2026-10-24 にまさゆきさんの確認を受けて完了した（市全体の取り込みと、市全体のタイルにした Worker の公開も済み。Cron の schools が外部 API 0回・0行で成功することも 2026-10-26 に確認）。009 の避難場所（市「指定緊急避難場所一覧」、市全体の338か所）と公共施設（市「公共施設一覧」から暮らしに関係する種類だけ、市全体の198か所）は 2026-10-26 に取り込んだ（`npm run evacuation:sql`・`public-facilities:sql`。載せる種類と手順は `docs/009_ingest-city-opendata.md`）。009 は、まさゆきさんが4地区の一覧と数を確かめたら完了にする。**次のセッションは、まさゆきさんに 009 の確認をお願いしてから、次のチケット（011 の人口か、画面の土台の 013〜015）を相談して決める**。飯田市のオープンデータを新しく使うとき（011 で年齢別人口を使う場合など）は、着手前にどのデータを何に使うかを伝えて了承をもらう。市の CSV は更新のたびに URL が変わるので、手元のスクリプトで取り込む（`scripts/lib/city-open-data.mjs`・`src/lib/city/open-data.ts` を使う。出典は市の「PDL1.0に関する重要情報」の記載例どおり）。取得処理は `workers/ingest/src/jobs/` に `Job` を足す（作り方は `docs/005_ingest-worker-base.md` の「作ったもの」）。

2026-10-21 に決めた大きな方針（詳しくは要件 1章・1.1・6.3・8.1）：

- **見せ方の軸は「絵はドット絵、数字は本物」のギャップ**。ドット絵の側（整数倍表示・ドット風の枠・季節の色）と実データの側（ふつうのフォント・大きな数字・件数・出典・確認日、基本色のみ）を見た目で分ける。場面の中の実データは会話ウィンドウ風の枠に出す
- **公共交通オープンデータチャレンジ2026（締切 2027-01-11 23:59 JST）に応募する予定**。まさゆきさんの別アプリ gofreely（電車・バス・乗合タクシーの乗り継ぎ検索）と2作品で出す。DearLife は「車がなくても暮らせる」魅力を見せ、gofreely へつなぐ。必須データは GTFS データリポジトリの南信州のバス
- そのため交通（010 バス、026 電車）を前倒しし、冬・車0台の場面で時刻表の本物の便と本数を出す
- gofreely の仕様書はこのリポジトリに入れない。必要になったら（チケット 018）まさゆきさんに最新版を頼む

## コマンド

```bash
npm run dev     # 開発サーバー（Turbopack）http://localhost:3000
npm run build   # 本番ビルド（Turbopack）
npm run lint    # ESLint（next/core-web-vitals + next/typescript）
npm test               # テスト（Vitest + Testing Library、jsdom）。npm run test:watch で監視実行
npm run typecheck      # 画面と定期取得 Worker の型チェック
npm run preview        # 静的書き出し → wrangler dev で本番と同じ配信を確認
npm run deploy         # 静的書き出し → 画面の Worker（dear-life）を公開（ふだんは main への push で Workers Builds が自動で公開する）
npm run ingest:dev     # 定期取得 Worker をローカル起動（/__scheduled で Cron を手動発火）
npm run ingest:deploy  # 定期取得 Worker（dear-life-ingest）を公開
npm run town-map:sql   # data/iida_district_map.csv から対応表のマイグレーションを作る（004）
npm run bus:sql        # GTFS データリポジトリからバスを取り、バス停とおでかけの便のマイグレーションを作る（010）
npm run train:sql      # SENA の駅と data/jr_iida_line_*.csv から、4地区の駅と発車時刻のマイグレーションを作る（026）
npm run childcare:sql  # 飯田市オープンデータ「子育て施設」から、市全体の子育て施設のマイグレーションを作る（009）
npm run education:sql  # 飯田市オープンデータ「教育機関一覧」から、市全体の学校のマイグレーションを作る（009・008）
npm run evacuation:sql # 飯田市オープンデータ「指定緊急避難場所一覧」から、市全体の避難場所のマイグレーションを作る（009）
npm run public-facilities:sql # 飯田市オープンデータ「公共施設一覧」から、暮らしに関係する公共施設のマイグレーションを作る（009）
```

テストは `src/**/*.test.{ts,tsx}` に置く（設定は `vitest.config.mts`）。

## 技術スタック

- Next.js 15（App Router）、React 19、TypeScript（strict）、`src/` 配下。パスエイリアス `@/*` → `src/*`
- Tailwind CSS は **v3.4 系に固定**（意図的に v4 から下げている。v4 の書き方を使わない）
- 公開先は **Cloudflare（Next.js の静的書き出し）**。Vercel は無料プランで商用利用できないため不採用（要件 9.1）。`next.config.ts` は `output: "export"`・`images.unoptimized: true`。`out/` をルートの `wrangler.jsonc`（Worker 名 `dear-life`）が Workers の静的アセットとして配信する
- 定期取得の Worker は `workers/ingest/`（Worker 名 `dear-life-ingest`、Cron 1個・毎日 03:00 JST）。2026-10-24 から Workers Paid（1回の実行で外部への呼び出し10,000回・CPU 30秒まで。コードでは呼び出しを400回までにしている）。ルートの `tsconfig.json` からは除外し、`workers/ingest/tsconfig.json` で型チェックする
- データは **Supabase に決定**（プロジェクト `dear-life`、ref `ywugkkofnqkpnzkmucyv`、Tokyo。Supabase MCP が使える）。画面には URL と publishable key だけを `.env.local`（雛形は `.env.example`）で渡す。外部APIの取得は Cloudflare Workers Cron の定期取得だけで行う

## アーキテクチャ（予定）

画面の流れ：`01 えらぶ → 02 くらしを見る → 03 カルテ → 04 地区くらべ / 05 地図`、ほかに「データについて」ページ。

- **条件はURLパラメータで持つ**（F-02）。サーバーに送らない・保存しない
- **画面から外部API（不動産情報ライブラリ等）を直接呼ばない**。定期取得Worker → Supabase に保存 → 画面は Supabase から読む
- 中央値などの集計は Supabase の SQL 関数で行う（Workers 無料プランの CPU 10ms 制限のためにこうした。2026-10-24 から Workers Paid（アカウント単位で月5ドル）になったが、作りはそのまま）
- くらしの場面は **テンプレート方式**：季節×条件ごとのひな形にデータを差し込む。文は「データ／地区の情報／想定」の3種類で、見た目を区別する（要件 6章）。AI生成・ランダム選択はしない
- ドット絵はコードで生成して PNG に書き出し、静的ファイルとして配信。`image-rendering: pixelated` で整数倍表示。背景 160×90 ドット、共通16色程度（要件 8.1）
- PWA対応（ホーム画面追加・オフライン表示）。プッシュ通知はしない（要件 8.2）

## チケットとTodoの管理

- 作業は `docs/` 配下の連番チケット（`docs/000_index.md` が一覧）で管理する。着手前に該当チケットと `REQUIREMENTS.md` の関連章を読む
- 各チケットの Todo は未完了を `- [ ]`、終わったら `- [×]` に書きかえる。作業を終えたら、同じコミットでチケットの Todo も更新する
- 作業中に増えた作業・決めたことは、該当チケットの Todo やメモに書き足す。新しいチケットが必要なら次の連番で作り、`000_index.md` に追加する
- 「（まさゆきさん）」と付いた Todo はまさゆきさんの作業・判断。Claude は勝手に完了にしない
- まさゆきさんの作業（Secret の登録、ファイルの用意、確認・判断など）は、チケットを進めて**実際に必要になった時点で**声をかけてお願いする。先回りしてまとめて頼まない。例：`REINFOLIB_API_KEY` の登録は 006 で API を呼ぶ直前、`SUPABASE_SERVICE_ROLE_KEY` は 005 で Worker から書き込む直前
- **飯田市のオープンデータを使う作業に入るときは、着手前に必ずまさゆきさんに声をかける**（どのデータを・何に使うかを伝える）。勝手にダウンロードや取り込みを始めない。対象はチケット 008（教育機関一覧・子育て施設での補完）、009（避難場所・公共施設など）、010（市のページから案内されている GTFS）、011（年齢別人口を使う場合）

## Next.js 15 App Router のベストプラクティス

公式ドキュメント（v15.1）をもとに、このプロジェクトの構成（静的書き出し）に関係するものだけをまとめる。

### 静的書き出し（`output: "export"`）の制約

ビルド時に計算できないものは使えない。次のものは使わない。

- Server Actions、Cookies、`next.config` の rewrites / redirects / headers、Middleware、ISR、Draft Mode、Intercepting Routes
- `request` を読む Route Handler（`GET` だけで、ビルド時に静的ファイルになるものは使える）
- 動的ルートで `generateStaticParams()` がないもの、または `dynamicParams: true`。地区ページなどを動的ルートにするときは、4地区分を `generateStaticParams()` で必ず列挙する
- `next/image` の標準の画像最適化。`images.unoptimized: true` にするか、独自の loader を使う。ドット絵は最適化すると崩れるので、どちらにしても元の PNG をそのまま出す

### Server Components と Client Components

- 既定は Server Component。`"use client"` は、状態・イベント・ブラウザAPIが必要な末端の部品だけに付け、境界をできるだけ下に置く
- 秘密情報や Worker 側の処理を含むモジュールには `import "server-only"` を書き、Client Component から読み込めないようにする
- Client Component に渡す props はシリアライズできる値に限る

### params / searchParams（v15 で非同期になった）

- `params` と `searchParams` は Promise。Server Component では `await params`、Client Component では React の `use(params)` で取り出す。型も `Promise<{ ... }>` で書く
- **静的書き出しでは、ページの `searchParams` はビルド時に値がない**。選んだ条件（URLパラメータ、F-02）は Client Component で `useSearchParams()` を使って読む
- `useSearchParams()` を使う Client Component は、必ず `<Suspense>` で囲む。囲まないと、いちばん近い Suspense 境界までがクライアント側の描画になる（境界がないとビルドエラーになる）。fallback には画面の骨組みを出す

### そのほか

- 読み込み中は `loading.tsx`、エラーは `error.tsx`（Client Component にする必要がある）でルートごとに扱う
- `<title>` などは `metadata` / `generateMetadata` で設定する。`<head>` を直接書かない
- フォントは `next/font` で読み込む（`layout.tsx` で Noto Sans JP を読み込み、Tailwind の `font-sans` に当てている）

## 実装上の決まりごと

- 点数化・ランキング・「おすすめ地区」判定は一切しない
- 「中央値」は画面では「真ん中の値」と書く。相場には件数と件数ラベル、「過去の取引の参考値」の注意書きを必ず付ける（要件 5章）
- すべての情報に出典・対象時点・確認日を表示する。「該当なし」と「データ未取得」は区別する
- 未収集の行事は「この季節の行事は準備中です」と出し、作り話で埋めない
- 色・角丸・タップ領域は `tailwind.config.ts` のテーマ、共通部品は `src/components/ui/`・`src/components/layout/` を使う（002 のメモ）。季節の色はドット絵の側だけで使い、実データの側は基本色だけにする
- 本文・数字・ボタンはドット風フォントにしない。タップ領域は 44px 以上。スマホ（幅375px前後）基準
- 国土交通省・飯田市の名称やマークをサイト名・ロゴに使わない

## Supabase

マイグレーションは `supabase/migrations/` に置き、Supabase MCP の `apply_migration` で当てる（手順は `docs/003_supabase-schema.md`。当てる前に `npm test` で権限のテストを通す）。003 で Supabase の既定の権限付与を外したので、新しいテーブル・関数は GRANT を書かないと画面（anon）からも Worker（service_role）からも使えない。

テーブルを作るマイグレーションには、RLS有効化・GRANT・ポリシーを必ず一緒に書く（2026-10-30以降、public スキーマの新テーブルに自動で権限が付かないため）。`anon` は `select` のみ、`service_role` は `select, insert, update, delete`、`authenticated` には何も与えない（要件 9.4）。

APIキー（`REINFOLIB_API_KEY`、`SUPABASE_SERVICE_ROLE_KEY`）は Cloudflare の Secret にのみ置く。service_role key は画面側に絶対に入れない。
