import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

// 色は「絵はドット絵、数字は本物」（要件 1章・8.1）の2系統を前提に分ける。
// 実データの側は基本色（生成り・深緑・墨）だけを使い、季節の色はドット絵の側（場面・季節の切り替え）にだけ使う。
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // 基本色
        kinari: { DEFAULT: "#F7F3EA", deep: "#EFE8D8" },
        surface: "#FFFDF8",
        ink: { DEFAULT: "#2B2A26", muted: "#5F5B52" },
        line: "#E2DACA",
        primary: { DEFAULT: "#1F5C45", hover: "#174A37", soft: "#E4EEE7" },
        // 季節の色（ドット絵の側だけで使う）
        spring: { DEFAULT: "#C2526B", soft: "#FBE8EC" },
        summer: { DEFAULT: "#2A73A8", soft: "#E2EFF8" },
        autumn: { DEFAULT: "#B65A17", soft: "#FBEADB" },
        winter: { DEFAULT: "#3C88AD", soft: "#E4F2F8" },
        // 場面の文の種類（要件 6.4）
        "kind-data": { DEFAULT: "#1F5C45", soft: "#E4EEE7" },
        "kind-local": { DEFAULT: "#8A5A12", soft: "#F6EBD7" },
        "kind-assumed": { DEFAULT: "#6E6A60", soft: "#EEEAE2" },
      },
      fontFamily: {
        sans: ["var(--font-noto-sans-jp)", ...defaultTheme.fontFamily.sans],
      },
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
    },
  },
  plugins: [],
};

export default config;
