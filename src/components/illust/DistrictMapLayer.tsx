import { DISTRICT_NAMES } from "@/lib/conditions/labels";
import { DISTRICT_LABEL_POSITIONS } from "@/lib/illust/districts";
import type { DistrictId } from "@/lib/town-district/resolve";

// えらぶ 01 の飯田市全体の絵に、選んだ地区の札とピンを立てる（028 見本。050 で、選んでいない地区の札は出さないことにした。2026-11-23 まさゆきさん）。
// 地区は下の選択肢のカードで選ぶ。札は押せない飾りにして、絵の上の動画の目印（PhotoSpotLayer）を押すじゃまをしない。
// 選んだ地区の名前は、プレビューの読み上げの名前と「〇〇を舞台に…」の一文で伝わるので、札は読み上げない
export function DistrictMapLayer({ selected }: { selected: DistrictId | null }) {
  if (selected === null) return null;
  const { x, y, vertical = false } = DISTRICT_LABEL_POSITIONS[selected];
  const name = DISTRICT_NAMES[selected];
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10">
      {/* 選び直すたびに立て直す（key でピンが上から落ちてくる動きを出し直す） */}
      <div key={selected} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%` }}>
        <MapPin />
        {/* 札を押せるボタンにしていたころ（028）の高さ 44px の箱をそのまま残す。ピンはこの箱の上に立つので、
            スマホの小さい札でもピンが札から少し浮いて見える（前と同じ見た目。2026-11-23 まさゆきさん） */}
        <div className="flex min-h-tap min-w-tap items-center justify-center">
          <span
            data-testid="district-map-label"
            className={[
              // PC（lg）では絵が 1200px まで広がるので、札も絵に合わせて大きくする（2026-10-31 まさゆきさん）
              "block rounded-md px-2 py-1 text-xs font-bold leading-tight shadow-card sm:text-sm lg:rounded-lg lg:px-4 lg:py-2 lg:text-2xl",
              // 縦書きは writing-mode を使わず1字ずつ積む。iPhone の Safari では writing-mode だと字が札の右に寄るため（2026-10-31）
              vertical ? "flex flex-col items-center" : "whitespace-nowrap",
              // 後ろの絵が透ける明るい薄緑に白い枠（2026-10-29 まさゆきさん）
              "bg-map-label-selected/75 text-primary-hover ring-2 ring-white",
            ].join(" ")}
          >
            {vertical ? [...name].map((char, index) => <span key={index}>{char}</span>) : name}
          </span>
        </div>
      </div>
    </div>
  );
}

// 札の上に立てるピン。選び直すたびに上から落ちてくる。色は札と同じ、透ける薄緑（2026-10-29 まさゆきさん）
function MapPin() {
  // 横の位置合わせ（translate）と落ちる動き（transform）がぶつからないよう、包む要素で位置を合わせる
  return (
    <span className="absolute bottom-[calc(100%-6px)] lg:bottom-[calc(100%-10px)] left-1/2 -translate-x-1/2">
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
