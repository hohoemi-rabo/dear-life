"use client";

import { DISTRICTS } from "@/lib/conditions/labels";
import { DISTRICT_LABEL_POSITIONS } from "@/lib/illust/districts";
import type { DistrictId } from "@/lib/town-district/resolve";

// えらぶ 01 の飯田市全体の絵に、4地区の札と、選んだ地区のピンを出す（028 見本）。
// 札は押してもその地区を選べる（指で絵を触って選べるように）。選んだ地区は色だけでなくピンでも示す。
// 下の選択肢のカードと同じ働きなので、読み上げとキーボードではカードだけを使う（同じボタンが2つずつ読まれないように）
export function DistrictMapLayer({ selected, onSelect }: { selected: DistrictId | null; onSelect: (district: DistrictId) => void }) {
  return (
    <ul aria-hidden="true" className="absolute inset-0 z-10">
      {DISTRICTS.map(({ id, name }) => {
        const { x, y, vertical = false } = DISTRICT_LABEL_POSITIONS[id];
        const isSelected = id === selected;
        return (
          <li key={id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%` }}>
            {isSelected && <MapPin key={id} />}
            <button
              type="button"
              tabIndex={-1}
              onClick={() => onSelect(id)}
              className="group flex min-h-tap min-w-tap items-center justify-center"
            >
              <span
                className={[
                  // PC（lg）では絵が 1200px まで広がるので、札も絵に合わせて大きくする（2026-10-31 まさゆきさん）
                  "rounded-md px-2 py-1 text-xs font-bold leading-tight shadow-card transition duration-150 group-active:scale-95 sm:text-sm lg:rounded-lg lg:px-4 lg:py-2 lg:text-2xl",
                  vertical ? "[writing-mode:vertical-rl]" : "whitespace-nowrap",
                  // 選んだ地区は後ろの絵が透ける明るい薄緑に白い枠、選んでいない地区は暗い濃い緑（2026-10-29 まさゆきさん）
                  isSelected ? "bg-map-label-selected/75 text-primary-hover ring-2 ring-white" : "bg-map-label-idle/90 text-white group-hover:bg-map-label-idle",
                ].join(" ")}
              >
                {name}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// 札の上に立てるピン。選び直すたびに上から落ちてくる。色は選んだ札と同じ、透ける薄緑（2026-10-29 まさゆきさん）
function MapPin() {
  // 横の位置合わせ（translate）と落ちる動き（transform）がぶつからないよう、包む要素で位置を合わせる
  return (
    <span aria-hidden="true" className="absolute bottom-[calc(100%-6px)] lg:bottom-[calc(100%-10px)] left-1/2 -translate-x-1/2">
      <svg viewBox="0 0 24 32" className="block h-9 w-7 drop-shadow lg:h-16 lg:w-12 motion-safe:animate-pin-drop">
        <path
          d="M12 1C6 1 1.5 5.5 1.5 11.3 1.5 19 12 31 12 31s10.5-12 10.5-19.7C22.5 5.5 18 1 12 1z"
          className="fill-map-label-selected/75 stroke-white"
          strokeWidth="2"
        />
        <circle cx="12" cy="11.5" r="4.2" className="fill-primary-hover" />
      </svg>
    </span>
  );
}
