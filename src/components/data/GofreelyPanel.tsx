import { useId } from "react";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { buttonClassName } from "@/components/ui/Button";
import { propSrc, propSrcSet } from "@/lib/illust/assets";
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

// カルテの交通「行ける場所」の下の GoFreely の枠（038 見本 karte-transport-places-pc.png。文言は 2026-11-12 まさゆきさん）。
// 左に家とバス停の絵、線で区切って右に見出し・文・ボタン。スマホでは絵を上に小さく出す
export function GofreelyHomePanel({ className = "" }: { className?: string }) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className={`flex flex-col items-center gap-3 rounded-card border-2 border-primary bg-primary-soft p-4 break-inside-avoid sm:flex-row sm:items-stretch sm:gap-5 sm:p-5 ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- 静的書き出しなので WebP をそのまま出す */}
      <img
        src={propSrc("errand-home-stop", 240)}
        srcSet={propSrcSet("errand-home-stop")}
        sizes="176px"
        alt=""
        draggable={false}
        className="w-36 shrink-0 select-none self-center object-contain sm:w-44"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:border-l sm:border-primary/40 sm:pl-5">
        <h3 id={titleId} className="text-lg font-extrabold md:text-xl">
          住む場所の近くから、どう行く？
        </h3>
        <p className="text-sm md:text-base">候補の家の近くにあるバス停や駅から、行き・帰りの便を調べられます。</p>
        <a
          href={GOFREELY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClassName("primary", "w-full text-base md:text-lg print:hidden")}
        >
          GoFreelyで行き方を調べる
          <span className="sr-only">（別のサイトが新しいタブで開きます）</span>
          <span aria-hidden="true">↗</span>
        </a>
        {/* 紙ではボタンを押せないので、アドレスを文字で出す */}
        <p className="hidden text-sm print:block">GoFreely：{GOFREELY_URL}</p>
      </div>
    </section>
  );
}
