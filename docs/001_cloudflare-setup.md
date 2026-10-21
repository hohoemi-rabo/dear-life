# 001 Cloudflare 環境構築

- 主な要件：9章（システム構成）、9.1〜9.3（公開先・無料プランの上限）、8章（秘密情報）
- 依存：なし

## 目的

画面（Next.js の静的書き出し）と定期取得 Worker を、どちらも Cloudflare Workers の無料プランで動かせる状態にする。

## 構成（決めたこと）

| 対象 | 置き場所 | 中身 |
| --- | --- | --- |
| 画面 | `wrangler.jsonc`（Worker 名 `dear-life`） | `next build` の `out/` を **Workers の静的アセット**として配信する。Worker のコードは持たないので、リクエストは Worker の処理を通らず、1日10万回の上限を消費しない（9.3） |
| 定期取得 | `workers/ingest/wrangler.jsonc`（Worker 名 `dear-life-ingest`） | Cron 1個（毎日 03:00 JST）。`workers_dev: false` で外から呼べないようにする |

- `next.config.ts`：`output: "export"`、`images.unoptimized: true`
- 公開アドレスは当面 `dear-life.<アカウント>.workers.dev`。独自ドメインは 025 で決める
- 秘密情報（`REINFOLIB_API_KEY`・`SUPABASE_SERVICE_ROLE_KEY`）は ingest Worker の Secret にだけ置く。画面側には Supabase の URL と publishable key（公開してよい値）だけを `.env.local` で渡す
- 画面側の `NEXT_PUBLIC_*` はビルド時に埋め込まれる。ローカルから `npm run deploy` する限り `.env.local` が使われる。Workers Builds（Git 連携）にする場合はビルド環境変数にも同じ値を入れる

## コマンド

```bash
npm run preview        # 静的書き出し → wrangler dev で本番と同じ配信を確認
npm run deploy         # 静的書き出し → 画面の Worker を公開
npm run ingest:dev     # 定期取得 Worker をローカルで起動（/__scheduled で Cron を手動発火）
npm run ingest:deploy  # 定期取得 Worker を公開
npm run typecheck      # 画面と Worker の型チェック
```

## Todo

- [×] wrangler・`@cloudflare/workers-types` を devDependencies に追加
- [×] `next.config.ts` を静的書き出し（`output: "export"`・`images.unoptimized`）にする
- [×] 画面用 `wrangler.jsonc`（静的アセット `./out`、404 は `404.html`）を作る
- [×] 定期取得 Worker の雛形（`workers/ingest/`：wrangler.jsonc・scheduled ハンドラ・tsconfig）を作る
- [×] `package.json` に preview / deploy / ingest:dev / ingest:deploy / typecheck を追加
- [×] `.env.example` を作り、`.env.local` に Supabase の URL と publishable key を入れる（`.gitignore` で `.env.example` だけ追跡）
- [×] `.wrangler/` を `.gitignore`・ESLint の対象外に追加
- [×] `npm run build`・lint・typecheck、両 Worker の `wrangler deploy --dry-run` が通ることを確認
- [ ] 初回デプロイ（`npm run deploy`）して workers.dev で表示を確認する（公開操作なので、まさゆきさんの OK をもらってから）
- [ ] （まさゆきさん）Cloudflare ダッシュボードで、アカウント全体の Cron の数を確認する（無料プランは5個まで。10.2）
- [ ] （まさゆきさん）Secret を登録する。値はチャット・コードに書かない
  - `npx wrangler secret put REINFOLIB_API_KEY --config workers/ingest/wrangler.jsonc`
  - `npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config workers/ingest/wrangler.jsonc`
- [ ] 定期取得 Worker の初回デプロイ（005 で中身ができてから）
- [ ] Git 連携の自動デプロイ（Workers Builds）にするか決める。する場合はビルド環境変数を設定する

## メモ

- `npm audit` で next 15 / tailwindcss 3 系に由来する指摘が出ている。どちらも意図的にこの版に固定しているため（CLAUDE.md）、修正は版を上げられるときに合わせて行う。新しく追加する依存では指摘を増やさない
- `wrangler whoami` で「k2.read / k2.write のスコープがない」という警告が出るが、このプロジェクトでは使わない機能なので無視してよい
