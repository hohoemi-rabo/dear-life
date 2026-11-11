import { useId } from "react";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { buttonClassName } from "@/components/ui/Button";
import { GOFREELY_URL } from "@/lib/site";

// 「家からの行き方は gofreely で」の枠（036。2026-11-11 まさゆきさん：gofreely は強みなので、なるべく目立つように）。
// DearLife は地区全体の様子（地区のバス停のうち乗りかえなしで行けるのはいくつか）まで。家の近くのバス停や駅からの便・乗り換えは
// gofreely で調べてもらう（要件 1.1）。gofreely の今の版（2026-11-11 の実装仕様書）は URL の値を読まないので、トップを開くだけ。
// できることの文は、その仕様書の「できること」に合わせる（評価の言葉は使わない）。
// 下見プランのバス、くらしの冬のバス、カルテの交通の「冬のおでかけ」で使う
export function GofreelyPanel({ className = "" }: { className?: string }) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className={`flex flex-col gap-3 rounded-card border-4 border-primary bg-primary-soft p-4 break-inside-avoid ${className}`}
    >
      <h3 id={titleId} className="flex items-center gap-2 text-lg font-extrabold text-primary md:text-xl">
        <PixelIcon icon="icon-transport" />
        家からの行き方は gofreely で
      </h3>
      <p className="text-sm md:text-base">
        家の近くのバス停や駅から、病院や買い物先への行きと帰りの便を調べて、おでかけプランにできます。乗り換えや、現地で過ごせる時間も分かります。
      </p>
      <a
        href={GOFREELY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClassName("primary", "w-full text-lg md:py-3 print:hidden")}
      >
        gofreely で行き方を調べる
        <span className="sr-only">（別のサイトが新しいタブで開きます）</span>
        <span aria-hidden="true">↗</span>
      </a>
      {/* 紙ではボタンを押せないので、アドレスを文字で出す */}
      <p className="hidden text-sm print:block">gofreely：{GOFREELY_URL}</p>
    </section>
  );
}
