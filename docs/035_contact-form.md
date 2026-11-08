# 035 お問い合わせ（Discord に届ける）

- 主な要件：3.1（F-15 お問い合わせ。2026-11-08 追加）、2.3、9章（公開先・権限）
- 依存：001（画面の Worker `dear-life`）、005（Discord の Webhook）、022（データについて）

## 目的

データの誤りや使い方の質問を、利用者から受け取れるようにする。023（印刷・PDF）より先に作る（2026-11-08 まさゆきさん決定）。

## 決めたこと（2026-11-08 まさゆきさん）

- 送り先：定期取得の通知と同じ Discord のチャンネル（同じ Webhook URL）
- 入力：本文だけ。名前・メールアドレスは聞かない（返信はしない）
- 迷惑対策：簡単な対策だけ（Turnstile は使わない）。下の「作り」の3つ
- 入口：「データについて」ページと、スマホのヘッダーの「≡」メニュー（全画面の下のフッターには置かない）

## 作り（案）

- 画面は静的書き出しなので、送信は画面の Worker（`dear-life`）に `/api/contact` を受ける処理を足して受ける。`wrangler.jsonc` に `main` と `assets.run_worker_first: ["/api/*"]` を足し、ほかのパスは今までどおり静的ファイルを配る
- 受けた本文はどこにも保存せず、Discord の Webhook にそのまま送る。`allowed_mentions` を空にして、本文の `@everyone` などで通知が飛ばないようにする。送り元の IP などは送らない
- Webhook URL は画面の Worker の Secret `DISCORD_WEBHOOK_URL`（定期取得の Worker と同じ値）。画面のコードと `NEXT_PUBLIC_` には入れない
- 迷惑対策：
  1. 人には見えない入力欄（ハニーポット）に何か入っていたら、送ったふりをして捨てる
  2. 本文は1〜1,000文字。同じサイト（Origin）からの送信だけ受ける
  3. Workers の Rate Limiting（`ratelimits` の設定）で、同じ接続元からの送信を1分に数回までにする（数え方に使う値は Worker の中だけで使い、保存しない）
- ページ `/contact`：説明（データの誤り・使い方の質問などを送れる、返信はできない、名前・住所・電話番号など個人が分かることは書かない）・本文・送信ボタン・送れた／送れなかったの表示。見本はないので、ほかのページの部品（`src/components/ui/`）に合わせ、作ったら見てもらう
- 圏外のときは送れないことを出す（PWA。入力は消さない）

## Todo

- [×] 送り先・入力・迷惑対策・入口を決める（2026-11-08 まさゆきさん。上の「決めたこと」）
- [×] 要件に F-15 を足す（3.1）
- [×] 画面の Worker に `/api/contact`（検証・ハニーポット・Rate Limiting・Discord への送信）とテスト
- [×] `/contact` ページとテスト。「データについて」とスマホのメニューに入口を足す
- [ ] （まさゆきさん）画面の Worker の Secret に、定期取得と同じ Webhook URL を登録する（`npx wrangler secret put DISCORD_WEBHOOK_URL`。別のターミナルで。`!` では値が空になる）
- [×] テスト・lint・型チェック・ビルド。`npm run preview` で送信を確かめる（2026-11-08。Webhook は未登録のまま、弾く場合と「いまは送れません」までを確かめた。Discord に届くのは Secret の登録後に確かめる）
- [ ] （まさゆきさん）画面と、Discord に届く形を確かめる
- [×] 本番に公開する（main への push。2026-11-08。本番で `/contact` が開き、`/api/contact` が空の本文を 400 で弾くことを確かめた）

## 作ったもの（2026-11-08）

- 決めごと（API のパス・本文の上限 1,000 文字・ハニーポットの欄の名前・文字数の数え方）：`src/lib/contact/rules.ts`。画面と Worker の両方が使う。文字数は絵文字も1文字と数える（`Array.from`）。前後の空白は数えない
- 画面の Worker：`workers/site/src/index.ts`（`/api/contact` だけを受け、ほかは `ASSETS` に渡す）・`contact.ts`（テスト `contact.test.ts`）。型チェックは `workers/site/tsconfig.json`（`npm run typecheck` に追加）
  - 受ける順番：POST 以外は 405 → Origin が同じサイトでなければ 403 → JSON でない・8KB 超は 400 → ハニーポットに値があれば送れたと返して捨てる → 本文が空・長すぎは 400 → 連続送信は 429 → Webhook 未登録は 503 → Discord が失敗・10秒でつながらなければ 502
  - Rate Limiting は `wrangler.jsonc` の `ratelimits`（`CONTACT_RATE_LIMITER`、`namespace_id` 1035、同じ接続元 `CF-Connecting-IP` から1分に3回まで）
  - Discord には「📮 DearLife へのお問い合わせ」の1行と本文だけを送る（`allowed_mentions` は空）
  - ローカル（`npm run preview`）の Webhook はルートの `.dev.vars`（雛形 `.dev.vars.example`）
- 画面：`/contact`（`src/app/contact/page.tsx`・`src/components/contact/ContactForm.tsx`）。送れたら入力を消して「送りました」、送れなかったとき・圏外のときは理由を出して入力は残す。`npm run dev` には Worker がないので、送ると「いまは送れませんでした」になる
- 入口：スマホの「≡」メニュー（`HeaderMenu`）の3つ目と、「データについて」の最後の「お問い合わせ」の欄
- 画面の確認用の画像：`~/dear-life-screenshots/2026-11-08-contact/`（375px と PC。入力前・送れた・連続送信・メニュー・データについて）

## 完了条件

- `/contact` から送った本文が Discord に届き、本文以外の個人の情報は送られない・保存されない
- 空の本文・長すぎる本文・ハニーポット・連続送信が弾かれる
