import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

// 色は「絵はドット絵、数字は本物」（要件 1章・8.1）の2系統を前提に分ける。
// 実データの側は基本色（生成り・深緑・墨）だけを使い、季節の色はドット絵の側（場面・季節の切り替え）にだけ使う。
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // 基本色（深緑はデザインイメージに合わせて青みを足した。027）
        kinari: { DEFAULT: "#F7F3EA", deep: "#EFE8D8" },
        surface: "#FFFDF8",
        ink: { DEFAULT: "#2B2A26", muted: "#5F5B52" },
        line: "#E2DACA",
        primary: { DEFAULT: "#1F6E5E", hover: "#185A4D", soft: "#E2F0EC" },
        // 季節の色（ドット絵の側だけで使う）。ink は soft の上に置く文字の色で、色の差を 4.5:1 以上にするため DEFAULT より少し濃くした（025）
        spring: { DEFAULT: "#C2526B", soft: "#FBE8EC", ink: "#AC485F" },
        summer: { DEFAULT: "#2A73A8", soft: "#E2EFF8", ink: "#286FA2" },
        autumn: { DEFAULT: "#B65A17", soft: "#FBEADB", ink: "#A75215" },
        winter: { DEFAULT: "#3C88AD", soft: "#E4F2F8", ink: "#327291" },
        // ドット絵の側：選択肢の絵の背景（パレットの「薄い空」「緑」と同じ色。027）
        pixel: { sky: "#D3EAF0", grass: "#5E9A4E" },
        // えらぶの返事のカード（デザインイメージの温かい色。027）
        warm: { DEFAULT: "#E5B970", soft: "#FFF6E3" },
        // えらぶの「＋」（見本の金色。白い記号との色の差を 3:1 以上にするため、見本より少し濃くした。028）
        // deep は白い文字を載せる番号の丸に使う（白との色の差を 4.5:1 以上にする。025）
        gold: { DEFAULT: "#A8812F", hover: "#8F6C25", deep: "#937129" },
        // えらぶ 01 の地区の札。選んだ地区は明るい薄緑（深緑の文字）、選んでいない地区は暗い濃い緑（2026-10-29 まさゆきさん）
        "map-label": { selected: "#A6E3BC" },
        // えらぶ 02 の子育て・学校の返事のカード（見本の薄いピンク。028）
        blush: { DEFAULT: "#F2C9CF", soft: "#FDEFF1" },
        // トップの見出しの下の黄色い線（033 見本）。飾りなので、文字の色には使わない
        marker: "#F6D45C",
        // カルテの人口の年齢の割合の帯（040 見本 karte-detail-population.png の3色。2026-11-13 まさゆきさん）
        age: { young: "#EBBE74", adult: "#1F6E5E", senior: "#A7C9D9" },
        // 場面の文の種類（要件 6.4）
        "kind-data": { DEFAULT: "#1F6E5E", soft: "#E2F0EC" },
        "kind-local": { DEFAULT: "#8A5A12", soft: "#F6EBD7" },
        "kind-assumed": { DEFAULT: "#6E6A60", soft: "#EEEAE2" },
        // くらしの風景のスマホのピン（045）：地図のピンの赤。季節の色でも実データの側の色でもなく、ピンだけで使う（2026-11-20 まさゆきさん）
        pin: "#E2483B",
      },
      fontFamily: {
        sans: ["var(--font-body)", ...defaultTheme.fontFamily.sans],
        // 家・土地の値段の大きな数字だけに使う（027 まさゆきさん決定）
        price: ["var(--font-price)", "var(--font-body)", ...defaultTheme.fontFamily.sans],
      },
      // PC で広げすぎると文の1行が長くなるので、上限を決める（027）
      maxWidth: { page: "1400px" },
      borderRadius: {
        card: "1rem",
        button: "0.75rem",
      },
      boxShadow: {
        card: "0 1px 2px rgb(43 42 38 / 0.06), 0 2px 8px rgb(43 42 38 / 0.06)",
        // くらしの風景のピンと名前の札（045）：明るい絵の上でも浮いて見えるよう、カードより濃い影
        pin: "0 3px 8px rgb(0 0 0 / 0.35)",
        // PC のピンのやわらかい白い光（「動きを減らす」のときの光。動くときは pin-glow で強さが変わる）
        "pin-glow": "0 0 16px 6px rgb(255 255 255 / 0.8)",
        // スマホのしずく形のピン。形を -45度 回しているので、影も回した向きで付けると下に落ちて見える
        "pin-drop": "-3px 5px 10px rgb(0 0 0 / 0.45)",
      },
      // タップ領域は 44px 以上（要件 8章）
      minHeight: { tap: "44px" },
      minWidth: { tap: "44px" },
      // えらぶで選んだものが「ぽん」と出る動き（028）。使う側で motion-safe: を付け、「動きを減らす」では動かさない。
      // 出るときは少し行きすぎて戻るばねの動き、消えるときは出るときより短くする
      keyframes: {
        "pop-in": {
          "0%": { opacity: "0", transform: "translateY(8%) scale(0.4)" },
          "70%": { opacity: "1", transform: "translateY(0) scale(1.06)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "pop-out": {
          "0%": { opacity: "1", transform: "scale(1)" },
          "100%": { opacity: "0", transform: "scale(0.7)" },
        },
        sparkle: {
          "0%": { opacity: "0", transform: "translate(-50%, -50%) scale(0) rotate(0deg)" },
          "40%": { opacity: "1", transform: "translate(-50%, -50%) scale(1) rotate(45deg)" },
          "100%": { opacity: "0", transform: "translate(-50%, -90%) scale(0.4) rotate(90deg)" },
        },
        "pin-drop": {
          "0%": { opacity: "0", transform: "translateY(-40%)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // 下から出るシート（028）。閉じるときは出るときより短くする
        "sheet-in": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "sheet-out": {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(100%)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        // 絵が写真に変わる動画の窓（050）：押した目印から、ドット絵がふわっと広がって出る。閉じるときは小さくなりながら消える。
        // 長さは src/lib/illust/photo-spots.ts の PHOTO_SPOT_TIMING とそろえる
        "photo-spot-in": {
          "0%": { opacity: "0", transform: "scale(0.12)" },
          "60%": { opacity: "1" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        // 準備中の場所を押したときの吹き出し（050）：ふわっと出て、少しとどまり、自然に消える。長さは PHOTO_SPOT_TIMING.preparingMs とそろえる
        "preparing-bubble": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "12%, 80%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(0)" },
        },
        "photo-spot-out": {
          "0%": { opacity: "1", transform: "scale(1)" },
          "100%": { opacity: "0", transform: "scale(0.92)" },
        },
        // 絵に出せない5人目からの子どもを増やしたとき（028）：今いる子どもたちがぴょんと跳ねる
        hop: {
          "0%, 100%": { transform: "translateY(0)" },
          "40%": { transform: "translateY(-14%)" },
        },
        // カルテの地区を切りかえたときのパネル：ふわっと出て、少しとどまり、自然に消える。長さは DISTRICT_NOTICE_MS とそろえる
        "district-notice": {
          "0%": { opacity: "0", transform: "translateY(8px) scale(0.96)" },
          "14%": { opacity: "1", transform: "translateY(0) scale(1)" },
          "82%": { opacity: "1", transform: "translateY(0) scale(1)" },
          "100%": { opacity: "0", transform: "translateY(-4px) scale(0.98)" },
        },
        // パネルが消えたあと、更新されたカードを一度だけふわっと強調する。長さは CARD_GLOW_MS とそろえる
        "card-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgb(31 110 94 / 0)" },
          "40%": { boxShadow: "0 0 0 4px rgb(31 110 94 / 0.45)" },
        },
        // 地区くらべ「いまの街と」（041）：家族が左（いまの街）から右（飯田）へ歩いていく。端では消えて、また左から出る
        "walk-to-iida": {
          "0%": { opacity: "0", transform: "translateX(-60%)" },
          "12%": { opacity: "1" },
          "88%": { opacity: "1" },
          "100%": { opacity: "0", transform: "translateX(60%)" },
        },
        // くらしのピン（028）：押せると分かるよう、ゆっくり少しだけ上下にゆれる
        "pin-bob": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        // くらしの PC のピン（045）：丸のまわりがやわらかく白く光り、ふくらんで、しぼむ（2026-11-20 まさゆきさん：細い輪ではなく「光る白」）。
        // 「動きを減らす」では動かさず、shadow-pin-glow の光をそのまま出す
        "pin-glow": {
          "0%, 100%": { boxShadow: "0 0 10px 3px rgb(255 255 255 / 0.6)" },
          "50%": { boxShadow: "0 0 24px 10px rgb(255 255 255 / 0.95)" },
        },
        // マスコット（042）：コマを横に1列に並べた1枚の絵を、左のコマから順にずらす。コマ数と長さは部品が CSS の変数で渡す
        // マスコット（042）が出てくるとき：足元から少し伸び上がりながら、ふわっと現れる
        "mascot-in": {
          "0%": { opacity: "0", transform: "translateY(6%) scale(0.92)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        // くらしの絵の上のぽてりを離したとき（046）：持ち上げた姿（浮かせて大きく）から下りて、少しつぶれ、小さくはねて着地する
        "mascot-land": {
          "0%": { transform: "translateY(-10%) scale(1.1)" },
          "40%": { transform: "translateY(0) scale(1.08, 0.9)" },
          "62%": { transform: "translateY(-6%) scale(0.97, 1.04)" },
          "82%": { transform: "translateY(0) scale(1.03, 0.97)" },
          "100%": { transform: "translateY(0) scale(1)" },
        },
        "mascot-frames": {
          "0%": { backgroundPositionX: "0%" },
          "100%": { backgroundPositionX: "100%" },
        },
        // 一人のときだけ「わが家」に出るぽてり（043）のまばたき。コマは 開く（0%）・半分（50%）・閉じる（100%）の3つ。
        // 9秒のうち、なかほどで1回、終わりに2回つづけてまばたきする（1コマ約70ミリ秒）。目を左右に動かすのはしない（2026-11-18 まさゆきさん）
        "mascot-blink": {
          "0%, 44%": { backgroundPositionX: "0%" },
          "44.8%": { backgroundPositionX: "50%" },
          "45.6%": { backgroundPositionX: "100%" },
          "46.4%": { backgroundPositionX: "50%" },
          "47.2%, 92%": { backgroundPositionX: "0%" },
          "92.8%": { backgroundPositionX: "50%" },
          "93.6%": { backgroundPositionX: "100%" },
          "94.4%, 95.6%": { backgroundPositionX: "0%" },
          "96.4%": { backgroundPositionX: "100%" },
          "97.2%, 100%": { backgroundPositionX: "0%" },
        },
      },
      animation: {
        "pop-in": "pop-in 380ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "pop-out": "pop-out 240ms ease-in both",
        sparkle: "sparkle 700ms ease-out both",
        hop: "hop 420ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "pin-drop": "pin-drop 320ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "sheet-in": "sheet-in 300ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "sheet-out": "sheet-out 200ms ease-in both",
        "fade-in": "fade-in 300ms ease-out both",
        "fade-out": "fade-out 300ms ease-in both",
        "photo-spot-in": "photo-spot-in 650ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "photo-spot-out": "photo-spot-out 300ms ease-in both",
        "preparing-bubble": "preparing-bubble 2000ms ease-out both",
        "pin-bob": "pin-bob 2.4s ease-in-out infinite",
        "pin-glow": "pin-glow 2s ease-in-out infinite",
        "walk-to-iida": "walk-to-iida 7s linear infinite",
        "district-notice": "district-notice 1500ms ease-out both",
        "card-glow": "card-glow 900ms ease-out both",
        "mascot-in": "mascot-in 450ms ease-out both",
        "mascot-land": "mascot-land 420ms ease-out both",
        mascot: "mascot-frames var(--mascot-duration) steps(var(--mascot-frames), jump-none) infinite",
        "mascot-blink": "mascot-blink 9s steps(1, end) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
