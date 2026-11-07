# 032 地図を Google マップにする（平面と建物の立体）

- 主な要件：F-06（地図）、7章（背景地図）、8章（地図の位置は目安）、8.2（圏外では背景が出ない）
- 依存：021

## 目的

021 の地図（MapLibre と地理院タイル）は、「立体で見る」で地形が盛り上がるだけで、建物が出ないので立体にする意味がない（2026-11-07 まさゆきさん）。
地図を Google マップにして、平面はいつもの Google の地図、立体は写真から作った建物の 3D（Google Earth と同じもの）で見られるようにする。点（学校・保育・バス停・駅・避難場所など）と小学校区は、今と同じものを上に重ねる。

## 決めたこと（2026-11-07）

- **Google の平面の地図（②）と建物の立体（③）を組み合わせる**（まさゆきさん決定）
- **施設ごとに「Google マップで開く」リンクを付ける案（①）は入れない**（まさゆきさん決定）

## 案（2026-11-07 まさゆきさん了承）

- 平面：Maps JavaScript API の地図（料金の区分は Dynamic Maps）。点は Advanced Markers、小学校区は面（今の `features.ts` のつなぎ直しをそのまま使う）
- 立体：同じ API の 3D Maps（`Map3DElement`。料金の区分は Immersive Maps）。点は `Marker3DElement`、小学校区は `Polygon3DElement`。2026-11-07 時点の説明書では `v=beta` で読み込む（正式公開か試用版かは書いていない。着手時に確かめ直す）
- 「立体で見る」「平面に戻す」の切りかえ・地区のボタン・表示の切りかえ・詳細・一覧・出典・注意書きは今の `ChizuView` のまま使い、中の地図の部品（`MapCanvas`）だけを差しかえる
- MapLibre・地理院タイル・標高タイルはやめて、`maplibre-gl` と `scripts/copy-maplibre-worker.mjs` を消す（Google の地図に地理院の下地は重ねられない）
- 読み込みは今と同じく `/chizu` を開いたときだけ

## 料金（2026-11-07 に Google の価格表で確認。着手時と公開前に確かめ直す）

| 区分 | 何のときに数える | 無料（毎月） | 超えたら 1,000回あたり |
| --- | --- | --- | --- |
| Dynamic Maps（Essentials） | 平面の地図を1回読み込むごと | 10,000回 | 7ドル |
| Immersive Maps（Pro） | 立体の地図を1回読み込むごと | 5,000回 | 7ドル |

- 使いすぎを防ぐため、Google Cloud で **1日の上限（割り当て）と予算のアラート** を設定する。上限に達したら地図は出ず、「一覧で見る」は使えるようにする

## 先に確かめること

- 飯田の4地区（上郷・鼎・伊賀良・中心市街地）で建物の立体がどこまで作り込まれているか。「一部の都市圏」だけの機能で、ない所は写真を地形に貼っただけになる → 本番に入れる前に、手元の小さな試作で4地区を見る
- スマホでの重さ（立体は特に重い）
- 規約：Google の地図の上に他社の地図を重ねない、地図の中身を保存しない（Service Worker は他のドメインをキャッシュしないので今のままでよい）、Google のロゴと出典を消さない
- 圏外では地図が出ない（今と同じ。注意書きはそのまま）

## Todo

- [×] （まさゆきさん）この案の了承 → 2026-11-07 OK
- [×] （まさゆきさん）Google Cloud のプロジェクト作成、請求先の登録、Maps JavaScript API の有効化、API キー（使えるサイトを本番の URL と `localhost:3000` に、使える API を Maps JavaScript API だけに制限）と Map ID の作成、1日の上限と予算のアラート → 2026-11-07 済み（プロジェクト `Dear-Life`、請求先「ほほ笑みラボ 個人開発2」。1日の上限は Map loads per day 300・3D Map loads per day 150。予算は月1,000円のアラートのみ（50・90・100%）。Map ID はベクター・チルトと回転あり。キーと Map ID は `.env.local` に入れた）
- [ ] 手元の試作で、4地区の建物の立体とスマホでの重さを見る（まさゆきさんに見てもらう）→ 2026-11-07 試作（作業用の HTML、リポジトリには入れていない）で、平面も立体もキーと Map ID で出た。飯田の4地区にも写真の建物の立体がある（スクショ `~/dear-life-screenshots/2026-11-07-google-proto/`）。立体は Maps JavaScript API だけで出た（Map Tiles API は要らない）。`mode: "HYBRID"` だと店などの Google の印と名前が出る。スマホの重さは本番に入れてから実機で見る
- [×] API キーと Map ID を `.env.local`・`.env.example`・Workers Builds の環境変数に入れる（どちらも画面に出る値。ビルドのときに埋め込む）→ 2026-11-07 まさゆきさんが Workers Builds に入れ、本番に公開した。本番の `/chizu` で平面・立体・タップで詳細が出ることを確かめた（スクショ `prod-*.png`）
- [×] 平面の地図を Google にする（点・小学校区・タップで詳細・地区の切りかえ）
- [×] 立体の地図にする（点・小学校区・タップで詳細・平面に戻す）
- [×] MapLibre・地理院タイル・`copy-maplibre-worker` を消す
- [×] 出典の欄・データについて（022）の背景地図の表記を Google にする
- [×] 要件 F-06 と 7章の背景地図の行を書きかえる
- [×] テスト（地図の部品はモックにして、`ChizuView` の振る舞いを確かめる。換算と読み込みは `camera.test.ts`・`google-maps-loader.test.ts`）
- [ ] 375px と PC のスクショ、スマホ実機での重さ（021 の残りの Todo もここで済ませる）→ スクショは 2026-11-07 に撮った（`~/dear-life-screenshots/2026-11-07-chizu-google/`）。実機は公開してから
- [ ] （まさゆきさん）立体で Google の店などの印と名前を消した見え方を確かめる（残すなら `TiltedGoogleMap` の `mode` を `HYBRID` にする）

## 作ったもの（2026-11-07）

| ファイル | 中身 |
| --- | --- |
| `src/lib/map/google-maps-loader.ts` | Google マップの読み込み（1回だけ・`v=beta`・20秒で打ち切り・失敗したら次に開いたときにやり直す・キーが使えないときの知らせ `onGoogleMapsAuthFailure`）。キーと Map ID は `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`・`NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` |
| `src/lib/map/camera.ts` | 平面のズームと立体のカメラの距離の換算、地区が入る距離、タップした所から 22px 以内でいちばん近い点 |
| `src/components/chizu/MapCanvas.tsx` | 読み込みと失敗の表示。平面の地図をいつも置き、立体のあいだだけ立体の地図を重ねる。見ている場所を平面と立体で引き継ぐ |
| `src/components/chizu/FlatGoogleMap.tsx` | 平面。点と学区は Data レイヤー。Google の店などの印を押しても説明を出さない（`clickableIcons: false`）。「地図・航空写真」の切りかえは Google のボタン |
| `src/components/chizu/TiltedGoogleMap.tsx` | 立体（`Map3DElement`、`mode: "SATELLITE"`）。点は `Marker3DInteractiveElement` と `PinElement`、学区は `Polygon3DInteractiveElement` |

## 決めたこと（2026-11-07 作ったとき）

- 平面に戻したら立体の地図は消す（重い機種のため）。平面の地図は立体のあいだも消さずに隠すだけにする（作り直すと読み込みが数えられるため）
- 地区のボタンで地区を変えると、平面は地区の範囲に合わせ、立体はその地区へ飛ぶ
- 立体の「地図・航空写真」の切りかえはなくした（立体は写真だけ）。平面は Google の地図の中のボタンで切りかえられる
- 出典の欄・データについてには「背景の地図・航空写真・立体の建物：Google マップ」と書き、地図データの出典は地図の右下の Google の表示に任せる（`GOOGLE_MAPS_CREDIT`）
- 手元のヘッドレス Chrome では Google の平面の地図が簡易の表示（ラスター）になり、開発サーバーの「Issue」に出る。ふつうのブラウザでは出ない
