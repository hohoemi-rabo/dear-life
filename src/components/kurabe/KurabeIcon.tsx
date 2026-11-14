// 地区くらべのタブ・見出しの線の絵（028 見本 docs/design/kurabe-pc.png）。文字色を受けつぐので、選んだタブでは白くなる
const PATHS = {
  home: "M3 11.5 12 4l9 7.5M5.5 9.5V20h4.5v-5.5h4V20h4.5V9.5",
  school: "M2.5 9.5 12 5l9.5 4.5L12 14 2.5 9.5ZM6.5 12v4.5c1.5 1.5 3.5 2.2 5.5 2.2s4-.7 5.5-2.2V12M21.5 9.5V15",
  bus: "M7 3.5h10a2.5 2.5 0 0 1 2.5 2.5v10a2.5 2.5 0 0 1-2.5 2.5H7A2.5 2.5 0 0 1 4.5 16V6A2.5 2.5 0 0 1 7 3.5ZM4.5 11.5h15M8 15h.01M16 15h.01M7.5 18.5V21M16.5 18.5V21",
  people: "M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 19.5c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M18 11a2.3 2.3 0 1 0-1-4.4M6 11a2.3 2.3 0 1 1 1-4.4M21.5 18c0-2.3-1.2-3.9-3-4.6M2.5 18c0-2.3 1.2-3.9 3-4.6",
  calendar: "M5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-12A1.5 1.5 0 0 1 5.5 5ZM4 10h16M8 3v4M16 3v4M8 13.5h.01M12 13.5h.01M16 13.5h.01M8 16.5h.01M12 16.5h.01",
  list: "M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v5.5M12 7.5h.01",
  chevron: "m6 9 6 6 6-6",
  // いまの街と（041 見本 kurabe-city-pc.png）
  building: "M5 21V5.5A1.5 1.5 0 0 1 6.5 4h11A1.5 1.5 0 0 1 19 5.5V21M3 21h18M9 8h.01M15 8h.01M9 12h.01M15 12h.01M10 21v-4.5h4V21",
  arrow: "M4 12h15M13 6l6 6-6 6",
} as const;

export type KurabeIconName = keyof typeof PATHS;

export function KurabeIcon({ name, className = "size-6" }: { name: KurabeIconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`shrink-0 ${className}`}>
      <path d={PATHS[name]} />
    </svg>
  );
}
