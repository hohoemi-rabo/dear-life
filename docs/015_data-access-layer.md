# 015 画面側のデータ読み込み層

- 主な要件：9章（画面は Supabase から読む）、8章（表示速度3秒・信頼性・オフライン）、F-09、7.2（出典・対象時点・確認日）
- 依存：003、014

## 目的

画面が Supabase から必要なデータだけを読み、出典・対象時点・確認日といっしょに扱えるようにする。

## 仕様メモ

- 画面は静的書き出し。データはブラウザから Supabase（publishable key・anon 権限）で読む。外部 API は呼ばない
- 読み込みはビュー・RPC 単位で、画面に要る列だけを取る（オーバーフェッチ・N+1 を避ける）。例：地区の概要（相場＋施設数＋学区＋人口）を1回で取る
- 地区は4つしかないので、えらぶ画面に入った時点で4地区分の概要をまとめて取り、地区の切り替えで再取得しない案を検討する
- すべての値に出典・対象時点・確認日を付けて返す型にする
- 「該当なし（0件）」と「データ未取得（未取り込み・取得失敗）」を型で区別する
- タイムアウト・失敗時の表示（再試行ボタン）を用意する。オフライン時は 024 で端末のデータを使う
- service_role key は画面側に絶対に入れない

## Todo

- [×] Supabase クライアント（`@supabase/supabase-js` か REST の fetch か）を決める。バンドルサイズを比べる → **fetch に決定**。esbuild で測った大きさ（minify・gzip 後）は supabase-js 58KB、postgrest-js 5.6KB、fetch はほぼ0。RPC を1つ GET で呼ぶだけなので、ライブラリの機能は要らない
- [×] 画面用のビュー／RPC を 003 のマイグレーションに追加する → `screen_data()`（`supabase/migrations/20261026130201_screen_data.sql`、2026-10-26 本番に適用）。4地区分を1回で返す
- [×] 取得関数と返り値の型（出典つき・該当なし／未取得の区別）を作る → `src/lib/data/`
- [×] キャッシュ（同じ画面遷移で何度も取らない）と失敗時の扱いを作る
- [×] 読み込み中の骨組み表示（Suspense の fallback）を共通部品にする → `ScreenSkeleton`（`src/components/ui/Skeleton.tsx`）と `ScreenDataBoundary`
- [×] データの通信の速さを測る（下の「測った値」）。画面ごとのスロットリングでの計測は、画面ができてから 018（くらし）・019（カルテ）で行う

## 完了条件

- えらぶ・くらし・カルテで使うデータを、出典つきで1〜2回の通信で取れる

## 作ったもの（2026-10-26）

### RPC `screen_data()`

- 画面は `GET /rest/v1/rpc/screen_data`（ヘッダーは `apikey` に publishable key だけ）で呼ぶ。GET にしたのは、応答を URL ごとに Cache API に残せるようにするため（POST は残せない）。024 では Service Worker ではなく画面の側（`src/lib/data/offline-data.ts`）が残す
- `security invoker` なので、anon の RLS がそのまま効く。未公開の出典のデータ・未公開の行事・ひな形は入らない。anon が実行できる関数はこれだけ（テストで確かめる）
- 返すもの：`generated_at`、公開済みの出典（`sources`）、4地区（地区マスタの並び順）ごとの相場・小中学校区の学校名・施設7種類・駅の本数・人口（最新の1時点）・おでかけ（バス・電車とも並び順1だけ）・行事、地区によらない支援制度・ひな形（文つき）
- 出典のあるデータは欄ごとに `{ source_id, items }`。**どの欄がどの出典かはこの関数だけで決める**（学校は `iida_education`、保育施設・放課後児童クラブは `iida_childcare`。XKT006・XKT007 は公開しても入れない）
- 施設は名前・元の区分・住所だけ。避難場所には `hazards`（flood・landslide・earthquake・large_fire）も付ける（夏の大雨の場面で、洪水・土砂災害に使える避難場所を選べるように）。並びは「元の区分 → 名前」（照合順序 "C"）で固定
- 駅の本数・始発・最終は、駅×向き（上り・下り）ごとに、**特急を除いて**数える（おでかけの本数と同じ数え方。026）
- 地図（021）で使う緯度経度・学区の範囲は大きいので入れない。021 で別の RPC を作る
- 大きさ：全部の出典を公開した場合で 68KB（gzip 9.6KB。PGlite で測定。本番は行事28件が加わり、応答は brotli で圧縮される）。4地区分を1回で取っても軽いので、えらぶ画面に入った時点で読み、地区を切り替えても読み直さない

### 画面側（`src/lib/data/`・`src/components/data/`）

- `screen-data.ts`：型と `parseScreenData(raw, today)`。出典のあるデータはすべて `DataState<T>` にする
  - `available`（値と出典がある）／`none`（出典は公開済みで、該当するものがない＝**該当なし**）／`unavailable`（出典が未公開・行がない・有効期限切れ＝**データ未取得**）
  - 相場は件数0なら `none`、行がなければ `unavailable`
  - おでかけは、便が見つからない行（`no_outbound`・`no_return`）を `none`（「この条件で使える便は見つかりませんでした」）、バスの `valid_until` が日本時間の今日より前なら `unavailable`
  - 出典の取得日時（timestamptz）は日本時間の日付（`fetchedOn`）にする
  - 応答の骨組み（地区・欄）が想定と違えば `ScreenDataFormatError`
- `fetch-screen-data.ts`：`fetchScreenData()`。1回6秒で打ち切り、通信の失敗・タイムアウト・429・5xx は1秒待って1回だけやり直す。4xx はやり直さない。失敗は `ScreenDataError`（`kind`：timeout・network・http）
- `load-screen-data.ts`：`loadScreenData()` は同じ Promise を返す（React の `use()` に渡すため）
  - キャッシュの決めごと：ページを開いているあいだ、画面の移動をまたいで同じ応答を使う（データの更新は毎日 03:00 の1回だけなので）。読み直すのは、ページを開き直したときと、失敗して「もう一度読み込む」を押したとき（`clearScreenDataCache()`）だけ
  - 失敗した Promise は残しておく。失敗のたびに勝手に読み直すと、エラーを出さずに通信を繰り返してしまうため
- `ScreenDataBoundary`（Client Component）で囲み、中で `useScreenData()` を呼ぶ
  - ビルド（静的書き出し）とハイドレーションのあいだは骨組みだけを出し、ブラウザで動き出してから読む（ビルド時に読むと、そのときのデータが HTML に固まってしまう）
  - 読み込み中は `ScreenSkeleton`（`fallback` で画面ごとの骨組みにも替えられる）、失敗したら「データを読み込めませんでした」と「もう一度読み込む」ボタン
  - 受け止めるのはデータの読み込みの失敗（`ScreenDataError`・`ScreenDataFormatError`）だけ。ほかのエラーは上（`error.tsx`）に渡す
  - `useConditions()`（`useSearchParams()`）も同じ境界の中で使える
- `formatServiceTime()`（`src/lib/format.ts`）：GTFS の時刻を画面の書き方にする（`09:05` → `9:05`、`24:30` → `翌0:30`。010 の引き継ぎ）

使い方：

```tsx
<ScreenDataBoundary>
  <Karte />
</ScreenDataBoundary>

function Karte() {
  const data = useScreenData();
  const district = data.districts[conditions.district];
  if (district.schools.status === "unavailable") ... // データ未取得
}
```

### テスト

- `src/test/supabase-migrations.test.ts`：全マイグレーション（データ入り）を当てた PGlite で、anon から呼べること・未公開の出典が入らないこと・XKT006/007 が入らないこと・駅の本数（特急を除く）・公開済みの行事とひな形だけが入ること、本物の応答を `parseScreenData` でそのまま読めることを確かめる
- `src/lib/data/*.test.ts`：状態の出し分け、通信のやり直し・タイムアウト、`src/components/data/ScreenDataBoundary.test.tsx`：骨組み → 中身、1回だけ読むこと、再試行のボタン

### 測った値（2026-10-26）

- データベースの中の処理：35ms（`explain analyze`。全データが見える postgres 権限で）
- 本番の REST（WSL から）：最初の1回 1.0秒、2回目以降 0.13〜0.17秒。応答は brotli で圧縮される（今は出典が未公開なので 3.7KB）
- 遅いスマホ回線の目安（往復150ms・1.6Mbps）で見積もると、接続の確立（3〜4往復）0.6秒＋処理0.1〜0.2秒＋転送（全部公開して gzip 12KB 前後）0.1秒で、1秒前後。3秒の目安の中に収まる見込み。画面を含めた実測は 018・019 で行う

### 今の状態と、ほかのチケットへの引き継ぎ

- 2026-10-26 時点で `data_sources` の13件はすべて未公開なので、画面からは相場・施設・人口・おでかけがすべて「データ未取得」になる（行事・支援制度は公開済みなので見える）。公開は 022 で行う
- 「該当なし」「データ未取得」の表示部品は 022 で作る（状態は `DataState` の `status` を見る）。データについてページの出典一覧は `ScreenData.sources` を使う（022）
- オフライン表示の「データは◯月◯日時点」は `ScreenData.generatedAt` を使う（024）
- ひな形は `ScreenData.sceneTemplates` に入る。列の名前は `selectSceneTemplate`（014）と同じ（017）
- 支援制度・行事には出典の行がない（手入力。各行の `checkedOn`・`sourceNote` を出す）

