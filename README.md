# DearLife（飯田移住カルテ）

飯田市への移住を考える家族のための、登録のいらない Web サービスです。上郷・鼎・伊賀良・中心市街地の4地区について、選んだ家族の条件で「季節ごとの暮らし」と「実データのカルテ」を見られます。

- 公開アドレス：<https://dear-life.rabo-hohoemi.workers.dev>
- 個人が公開データをもとに作成したものです。国や飯田市のサービスではありません
- 仕様の一次情報は [`REQUIREMENTS.md`](REQUIREMENTS.md)（要件定義書）です。作業はチケット [`docs/000_index.md`](docs/000_index.md) に沿って進めます

## しくみ

| 部分 | 中身 |
| --- | --- |
| 画面 | Next.js 15（App Router）の静的書き出し。Cloudflare Workers（`dear-life`）が `out/` を配信し、`/api/*`（お問い合わせ）だけを `workers/site/` で受けます。main に push すると Workers Builds が公開します |
| データ | Supabase（Tokyo）。画面は publishable key で RPC `screen_data()`・`map_data()` を読むだけです |
| 定期取得 | Cloudflare Workers の Cron（`dear-life-ingest`、毎日 03:00 JST）。取引価格・学区・バスの版を確かめて Supabase に保存し、結果を `ingest_runs` に残して Discord に知らせます |
| 手元で取り込むデータ | バス・電車・学校・保育施設・避難場所・公共施設・人口・家賃・診療所・学区の町名・比べる都市。`npm run *:sql` でマイグレーションを作り、Supabase に当てます（下の「コマンド」） |

選んだ条件は URL のパラメータだけで持ちます。サーバーには送らず、保存もしません。

## はじめかた

```bash
npm install
cp .env.example .env.local   # Supabase の URL と publishable key、Google マップのキーと Map ID を入れる
npm run dev                  # http://localhost:3000
```

秘密情報（`REINFOLIB_API_KEY`・`SUPABASE_SERVICE_ROLE_KEY`・`DISCORD_WEBHOOK_URL`）は Cloudflare の Secret にだけ置きます。登録は別のターミナルで `npx wrangler secret put <名前>` を実行します（Claude Code の `!` からだと空の値が入ります）。

## コマンド

| コマンド | すること |
| --- | --- |
| `npm run dev` | 開発サーバー |
| `npm test` / `npm run typecheck` / `npm run lint` | テスト・型チェック・ESLint |
| `npm run build` | 静的書き出し。終わったら `out/sw.js`（Service Worker）を書きます |
| `npm run preview` | 書き出したものを `wrangler dev` で本番と同じ形で動かします |
| `npm run deploy` | 画面の Worker を手で公開します（ふだんは push で自動） |
| `npm run ingest:dev` / `npm run ingest:deploy` | 定期取得の Worker を手元で動かす・公開する |
| `npm run illust` / `npm run pixel` / `npm run mascot` | 絵・ドット絵・マスコットを画面用に書き出す |

データを取り込むコマンド（`bus:sql`・`train:sql`・`education:sql` など）の一覧と中身は [`CLAUDE.md`](CLAUDE.md) の「コマンド」にあります。

## 運用（要件 10章）

| 作業 | いつ | どうする |
| --- | --- | --- |
| 取引価格の取得と相場の集計 | 毎日（自動） | Cron が新しい四半期を確かめ、出ていれば取り直して `refresh_market_stats` で集計します |
| 定期取得の失敗 | Discord に通知が来たとき | `ingest_runs` を見て原因を直します。失敗しても画面は前回のデータを出し続けます |
| 対応表にない町名 | 通知が来たとき | `data/iida_district_map.csv` に行を足し、`npm run town-map:sql` で反映します（[004](docs/004_district-master.md)） |
| 支援制度の確認 | 月に1回 | 公式サイトを見て、Supabase の Table Editor で直し、確認日を更新します（[012](docs/012_manual-data-events-support.md) の「Table Editor での入力手順」） |
| 画面の動作確認 | 月に1回 | 支援制度の確認と一緒に、スマホでえらぶ → くらし → カルテ → 地区くらべ・地図を一通り操作します |
| 地区の行事の確認 | 年1回（4月ごろ）＋各行事の前の月 | 公民館の資料で確かめ、Table Editor で直して確認日を更新します（[012](docs/012_manual-data-events-support.md)） |
| 学区・学校・保育施設 | 年1回（6月以降は自動。学区の町名は4月より前） | Cron が国の学区を取り直します。市の学校・保育施設・学区の町名は手元のスクリプトで取り込み直します（[008](docs/008_ingest-schools-childcare.md)・[009](docs/009_ingest-city-opendata.md)・[039](docs/039_school-district-tab.md)） |
| 人口・家賃 | 年1回（新しい統計が出たとき） | `npm run population:sql`・`npm run rent:sql`（[011](docs/011_population.md)・[034](docs/034_rent-and-renters.md)） |
| バス・電車 | ダイヤ改正のとき | Cron がバスの新しい版を知らせます。`npm run bus:sql`・`npm run train:sql` で取り込み直します（[010](docs/010_ingest-bus-gtfs.md)・[026](docs/026_train-stations-timetable.md)） |
| 場面のひな形の見直し | 行事やデータを足したとき | `src/lib/scenes/drafts.ts` を直し、`npm run scenes:sql` で反映します（[017](docs/017_scene-templates.md)） |

## 出典

すべてのデータの出典・対象時点・確認日は、サイトの「[データについて](https://dear-life.rabo-hohoemi.workers.dev/about-data)」に載せています。

このサービスは、国土交通省の不動産情報ライブラリのAPI機能を使用していますが、提供情報の最新性、正確性、完全性等が保証されたものではありません
