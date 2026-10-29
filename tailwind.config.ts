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
        // 季節の色（ドット絵の側だけで使う）
        spring: { DEFAULT: "#C2526B", soft: "#FBE8EC" },
        summer: { DEFAULT: "#2A73A8", soft: "#E2EFF8" },
        autumn: { DEFAULT: "#B65A17", soft: "#FBEADB" },
        winter: { DEFAULT: "#3C88AD", soft: "#E4F2F8" },
        // ドット絵の側：選択肢の絵の背景（パレットの「薄い空」「緑」と同じ色。027）
        pixel: { sky: "#D3EAF0", grass: "#5E9A4E" },
        // えらぶの返事のカード（デザインイメージの温かい色。027）
        warm: { DEFAULT: "#E5B970", soft: "#FFF6E3" },
        // えらぶの「＋」（見本の金色。白い記号との色の差を 3:1 以上にするため、見本より少し濃くした。028）
        gold: { DEFAULT: "#A8812F", hover: "#8F6C25" },
        // えらぶ 02 の子育て・学校の返事のカード（見本の薄いピンク。028）
        blush: { DEFAULT: "#F2C9CF", soft: "#FDEFF1" },
        // 場面の文の種類（要件 6.4）
        "kind-data": { DEFAULT: "#1F6E5E", soft: "#E2F0EC" },
        "kind-local": { DEFAULT: "#8A5A12", soft: "#F6EBD7" },
        "kind-assumed": { DEFAULT: "#6E6A60", soft: "#EEEAE2" },
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
      },
      animation: {
        "pop-in": "pop-in 380ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "pop-out": "pop-out 240ms ease-in both",
        sparkle: "sparkle 700ms ease-out both",
        "pin-drop": "pin-drop 320ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
