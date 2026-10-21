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
- 公開アドレスは当面 `https://dear-life.rabo-hohoemi.workers.dev`。独自ドメインは 025 で決める
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
- [×] 初回デプロイ（`npm run deploy`）して workers.dev で表示を確認する（公開操作なので、まさゆきさんの OK をもらってから）
  - 2026-10-21 公開。`https://dear-life.rabo-hohoemi.workers.dev` で `/` と静的ファイルが 200、存在しないパスが 404（`404.html`）になることを確認
- [×] （まさゆきさん）Cloudflare ダッシュボードで、アカウント全体の Cron の数を確認する（無料プランは5個まで。10.2）
  - 2026-10-21 Cloudflare API で確認。Worker 12個のうち Cron を使っているものは0個。`dear-life-ingest` を足しても1個。まさゆきさんの了承を得て完了
- [×] Git 連携の自動デプロイ（Workers Builds）にするか決める → **する**（2026-10-21 まさゆきさんが決定）
- [×] ビルド環境の Node の版を `.node-version`（22）で固定する
- [×] GitHub（`hohoemi-rabo/dear-life`、公開リポジトリ）に push する（公開のままでよいことをまさゆきさんに確認済み）
- [×] （まさゆきさん）ダッシュボードで `dear-life` Worker にリポジトリをつなぎ、ビルド環境変数を登録する（手順は下の「Git 連携の設定」）
  - 2026-10-21 接続・変数登録済み（まさゆきさん）。日本語の画面では `dear-life` の「設定」→「ビルド」、または概要の「CI を自動化する」から。一度「内部エラー」で送信できなかったが、再試行で通った
- [×] main への push で自動デプロイされ、workers.dev の表示が変わらないことを確認する
  - 2026-10-21 `dce2c2d` の push から約2分後に、ビルド経由の新しい版（`a49e8949`）が公開された。トップページは 200 で表示も変わらない。ビルド変数は画面がまだ使っていないので、値が効いているかは 015 で Supabase を読むときに確かめる

## Git 連携の設定（Workers Builds）

Workers & Pages → `dear-life` → Settings → Builds → Connect で、GitHub の `hohoemi-rabo/dear-life` をつなぐ。

| 項目 | 値 |
| --- | --- |
| Production branch | `main` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy`（既定のまま） |
| Non-production branch deploy command | `npx wrangler versions upload`（既定のまま） |
| Root directory | `/`（既定のまま） |
| Build variables | `NEXT_PUBLIC_SUPABASE_URL`・`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`（`.env.local` と同じ値。公開してよい値なので Secret でなくてよい） |

- 定期取得 Worker（`dear-life-ingest`）は別の Worker なので、つなぐなら別に設定する。中身ができる 005 で扱う
- `workers/ingest/` だけの変更でも画面が作り直されるが、無料枠の範囲で問題ないので Build watch paths は設定しない

## メモ

- 001 から移した Todo：Secret の登録（`SUPABASE_SERVICE_ROLE_KEY` は 005、`REINFOLIB_API_KEY` は 006。必要になる直前にお願いする）、定期取得 Worker の初回デプロイ（005）

- `npm audit` で next 15 / tailwindcss 3 系に由来する指摘が出ている。どちらも意図的にこの版に固定しているため（CLAUDE.md）、修正は版を上げられるときに合わせて行う。新しく追加する依存では指摘を増やさない
- `wrangler whoami` で「k2.read / k2.write のスコープがない」という警告が出るが、このプロジェクトでは使わない機能なので無視してよい
