# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

DearLife（飯田移住カルテ）は、飯田市への移住を考える家族向けの登録不要Webサービス。対象は上郷・鼎・伊賀良・中心市街地の4地区のみ。仕様の一次情報は `REQUIREMENTS.md`（要件定義書 v2.0）で、実装判断に迷ったらまずここを確認する。デザインイメージは `docs/design/`（PC版・スマホ版）にある。

現状は create-next-app 直後の雛形で、アプリのコードはまだない。

## コマンド

```bash
npm run dev     # 開発サーバー（Turbopack）http://localhost:3000
npm run build   # 本番ビルド（Turbopack）
npm run lint    # ESLint（next/core-web-vitals + next/typescript）
```

テストランナーはまだ導入していない。

## 技術スタック

- Next.js 15（App Router）、React 19、TypeScript（strict）、`src/` 配下。パスエイリアス `@/*` → `src/*`
- Tailwind CSS は **v3.4 系に固定**（意図的に v4 から下げている。v4 の書き方を使わない）
- 公開先は **Cloudflare（Next.js の静的書き出し）**。Vercel は無料プランで商用利用できないため不採用（要件 9.1）。`next.config.ts` の `output: "export"` はまだ未設定
- データは Supabase（未決：Cloudflare D1 の可能性あり。要件 11.1）。外部APIの取得は Cloudflare Workers Cron の定期取得だけで行う

## アーキテクチャ（予定）

画面の流れ：`01 えらぶ → 02 くらしを見る → 03 カルテ → 04 地区くらべ / 05 地図`、ほかに「データについて」ページ。

- **条件はURLパラメータで持つ**（F-02）。サーバーに送らない・保存しない
- **画面から外部API（不動産情報ライブラリ等）を直接呼ばない**。定期取得Worker → Supabase に保存 → 画面は Supabase から読む
- 中央値などの集計は Supabase の SQL 関数で行う（Workers 無料プランの CPU 10ms 制限のため）
- くらしの場面は **テンプレート方式**：季節×条件ごとのひな形にデータを差し込む。文は「データ／地区の情報／想定」の3種類で、見た目を区別する（要件 6章）。AI生成・ランダム選択はしない
- ドット絵はコードで生成して PNG に書き出し、静的ファイルとして配信。`image-rendering: pixelated` で整数倍表示。背景 160×90 ドット、共通16色程度（要件 8.1）
- PWA対応（ホーム画面追加・オフライン表示）。プッシュ通知はしない（要件 8.2）

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
- フォントは `next/font` で読み込む（今の `layout.tsx` は Geist を使っている）

## 実装上の決まりごと

- 点数化・ランキング・「おすすめ地区」判定は一切しない
- 「中央値」は画面では「真ん中の値」と書く。相場には件数と件数ラベル、「過去の取引の参考値」の注意書きを必ず付ける（要件 5章）
- すべての情報に出典・対象時点・確認日を表示する。「該当なし」と「データ未取得」は区別する
- 未収集の行事は「この季節の行事は準備中です」と出し、作り話で埋めない
- 本文・数字・ボタンはドット風フォントにしない。タップ領域は 44px 以上。スマホ（幅375px前後）基準
- 国土交通省・飯田市の名称やマークをサイト名・ロゴに使わない

## Supabase

テーブルを作るマイグレーションには、RLS有効化・GRANT・ポリシーを必ず一緒に書く（2026-10-30以降、public スキーマの新テーブルに自動で権限が付かないため）。`anon` は `select` のみ、`service_role` は `select, insert, update, delete`、`authenticated` には何も与えない（要件 9.4）。

APIキー（`REINFOLIB_API_KEY`、`SUPABASE_SERVICE_ROLE_KEY`）は Cloudflare の Secret にのみ置く。service_role key は画面側に絶対に入れない。
