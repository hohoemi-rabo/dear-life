"use client";

import { useId, type ReactNode } from "react";
import { DataStateMessage } from "@/components/data/DataStateMessage";
import { RenterHouseholds, RentValue } from "@/components/data/RentFigures";
import { ButtonLink, buttonClassName } from "@/components/ui/Button";
import { TradeCount } from "@/components/ui/TradeCount";
import type { Housing } from "@/lib/conditions/labels";
import type { DataState, DistrictData, MarketStat, RentReference } from "@/lib/data/screen-data";
import { SQUARE_METER, formatManYen } from "@/lib/format";
import { RENT_NOTICE } from "@/lib/housing/rent";
import { houseSrc, propSrc, propSrcSet } from "@/lib/illust/assets";
import {
  EXAMPLE_LAND_AREA,
  HOUSE_AGE_LABELS,
  HOUSE_CATEGORIES,
  chosenHouseCategory,
  landEstimateForExampleArea,
  type HouseCategory,
} from "@/lib/karte/housing";
import { IIDA_AKIYA_BANK } from "@/lib/map/links";
import { NOTICES } from "@/lib/notices";
import { NoticeBox } from "./DetailCard";
import { KarteCardIcon } from "./KarteCardIcon";

// カルテの住まいの詳細（040。見本 docs/design/karte-detail-housing.png）：
// 借りるなら家賃のカード → 「中古戸建ての取引価格を見比べる」（築20年以内・築21年以上の2枚。選んだほうを緑の枠と「選んだ条件」で強調）→ 土地のカード。
// 値は「中央値」と書き、どの値にも「取引〇件・参考値」を添える（2026-11-13 まさゆきさん）。画面と印刷（023）で同じものを出す
export function HousingCards({ district, rent, housing }: { district: DistrictData; rent: DataState<RentReference>; housing: Housing }) {
  return (
    <>
      {housing === "rent" && <RentCard rent={rent} district={district} />}
      <HouseCompareCard district={district} housing={housing} />
      <LandCard state={district.market.land} />
    </>
  );
}

function CardFrame({ titleId, children, className = "" }: { titleId: string; children: ReactNode; className?: string }) {
  return (
    <section aria-labelledby={titleId} className={`flex break-inside-avoid flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-card md:p-5 ${className}`}>
      {children}
    </section>
  );
}

// 選んだ条件の札（見本の緑の札）
function ChosenBadge() {
  return <span className="self-start rounded-full bg-primary px-3 py-0.5 text-xs font-bold text-white md:text-sm">選んだ条件</span>;
}

// 借りる：飯田市全体の家賃の平均と、地区の借家に住む世帯の数（034）。選んだ条件なので緑の枠を付けて、いちばん上に置く（2026-11-13 まさゆきさん）
function RentCard({ rent, district }: { rent: DataState<RentReference>; district: DistrictData }) {
  const titleId = useId();
  return (
    <CardFrame titleId={titleId} className="!border-2 !border-primary !bg-primary-soft/50">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start md:gap-6">
        {/* eslint-disable-next-line @next/next/no-img-element -- 静的書き出しなので WebP をそのまま出す */}
        <img
          src={houseSrc("rent", 320)}
          alt=""
          draggable={false}
          className="h-auto w-36 shrink-0 select-none self-center object-contain md:w-48"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <ChosenBadge />
          <h2 id={titleId} className="sr-only">
            家賃の参考値
          </h2>
          <RentValue state={rent} size="lg" />
          <RenterHouseholds state={district.housingTenure} districtName={district.name} />
        </div>
      </div>
      <NoticeBox title={RENT_NOTICE} />
    </CardFrame>
  );
}

// 「中古戸建ての取引価格を見比べる」：左が築20年以内・右が築21年以上（並びは選んだ家によらない）
function HouseCompareCard({ district, housing }: { district: DistrictData; housing: Housing }) {
  const titleId = useId();
  const chosen = chosenHouseCategory(housing);
  return (
    <CardFrame titleId={titleId}>
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-4">
        {/* スマホ（375px）でも1行に収める */}
        <h2 id={titleId} className="flex items-center gap-2 text-base font-extrabold min-[400px]:text-lg md:text-2xl">
          {/* カルテ一覧・選んだ条件の札と同じ家の絵（ドット絵の印は粗く見えるため。2026-11-13 まさゆきさん） */}
          <KarteCardIcon card="housing" size="lg" />
          中古戸建ての取引価格を見比べる
        </h2>
        <span aria-hidden="true" className="hidden h-7 w-px bg-line md:block" />
        <p className="text-sm text-ink-muted md:text-base">{district.name}・過去の取引価格の中央値</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {HOUSE_CATEGORIES.map((category) => (
          <HouseOption key={category} category={category} state={district.market[category]} chosen={category === chosen} />
        ))}
      </div>
      <NoticeBox title={NOTICES.marketHousingDetail} className="items-center" />
    </CardFrame>
  );
}

function HouseOption({ category, state, chosen }: { category: HouseCategory; state: DataState<MarketStat>; chosen: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-card p-3 md:gap-4 md:p-4 ${
        chosen ? "border-2 border-primary bg-primary-soft/60" : "border border-line bg-surface"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- 静的書き出しなので WebP をそのまま出す */}
      <img
        src={houseSrc(category === "house_built_within_20y" ? "new" : "old", 320)}
        alt=""
        draggable={false}
        className="h-auto w-24 shrink-0 select-none object-contain sm:w-32 md:w-40"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {chosen && <ChosenBadge />}
        <h3 className="text-base font-extrabold md:text-xl">{HOUSE_AGE_LABELS[category]}</h3>
        {state.status === "available" ? (
          <>
            {/* 値段は値段用のフォント（027） */}
            <p className="price-figure whitespace-nowrap text-[2rem] leading-tight md:text-5xl">{formatManYen(state.value.median)}</p>
            <TradeCount count={state.value.sampleCount} className="md:text-base" />
          </>
        ) : (
          <DataStateMessage state={state} />
        )}
      </div>
    </div>
  );
}

// 土地：中央値（1㎡）と「200㎡なら約〇万円（土地のみ）」だけ。幅と坪単価は出さない（040 見本。2026-11-13 まさゆきさん）
function LandCard({ state }: { state: DataState<MarketStat> }) {
  const titleId = useId();
  return (
    <CardFrame titleId={titleId}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center md:gap-6">
        <div className="flex h-28 w-full shrink-0 items-center justify-center rounded-button bg-pixel-sky sm:w-40 md:h-32 md:w-48">
          {/* eslint-disable-next-line @next/next/no-img-element -- 静的書き出しなので WebP をそのまま出す */}
          <img
            src={propSrc("detail-land", 240)}
            srcSet={propSrcSet("detail-land")}
            sizes="192px"
            alt=""
            draggable={false}
            className="size-full select-none object-contain p-2"
          />
        </div>
        <span aria-hidden="true" className="hidden w-px self-stretch bg-line sm:block" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h2 id={titleId} className="flex items-center gap-2 text-lg font-extrabold md:text-xl">
            <MountainMark />
            土地（宅地）の取引価格
          </h2>
          {state.status === "available" ? (
            <>
              <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="rounded-full bg-warm-soft px-3 py-1 text-sm font-bold text-kind-local">中央値</span>
                <span className="price-figure whitespace-nowrap text-[2rem] leading-tight md:text-5xl">
                  {formatManYen(state.value.median)}
                  <span className="ml-1 font-sans text-lg font-bold md:text-xl">/ {SQUARE_METER}</span>
                </span>
                <TradeCount count={state.value.sampleCount} className="md:text-base" />
              </p>
              <p>
                {EXAMPLE_LAND_AREA}
                {SQUARE_METER}なら<span className="font-bold tabular-nums">約{formatManYen(landEstimateForExampleArea(state.value.median))}</span>
                （土地のみ）
              </p>
            </>
          ) : (
            <DataStateMessage state={state} />
          )}
        </div>
      </div>
    </CardFrame>
  );
}

// 土地の見出しの印（見本の緑の山）。飾り
function MountainMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 20" className="h-5 w-7 shrink-0">
      <path d="M1 19 10 5l5 7 3-4 9 11Z" className="fill-pixel-grass" />
      <path d="m10 5 2.5 4-2.5 1.5L8 9Z" className="fill-white/80" />
    </svg>
  );
}

// 「物件を探す・下見する」（見本）：空き家バンクへの緑のボタン、地図への枠のボタン、その下に「下見で確かめたいこと」（children）。
// 地図には家の点がないので、施設の印を全部付けたまま開く（2026-11-13 まさゆきさん）
export function HousingSearchCard({ mapHref, children }: { mapHref: string; children: ReactNode }) {
  const titleId = useId();
  return (
    <CardFrame titleId={titleId}>
      <h2 id={titleId} className="flex items-center gap-2 text-lg font-extrabold md:text-2xl">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-7 shrink-0 text-gold" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="10" cy="10" r="6.5" />
          <path d="m15 15 6 6" strokeLinecap="round" />
        </svg>
        物件を探す・下見する
      </h2>
      <div className="grid gap-3 md:grid-cols-2">
        <a href={IIDA_AKIYA_BANK.url} target="_blank" rel="noopener noreferrer" className={buttonClassName("primary", "print:hidden")}>
          物件情報を探す
          <span className="sr-only">（{IIDA_AKIYA_BANK.name}のページを、新しいタブで開きます）</span>
          <span aria-hidden="true">↗</span>
        </a>
        <ButtonLink href={mapHref} variant="secondary" className="print:hidden">
          地図で周辺を確かめる
          <span aria-hidden="true">→</span>
        </ButtonLink>
        {/* 紙ではボタンを押せないので、行き先を文字で出す（023） */}
        <p className="hidden text-sm print:block md:col-span-2">
          物件情報：{IIDA_AKIYA_BANK.name}　{IIDA_AKIYA_BANK.url}
        </p>
      </div>
      {children}
    </CardFrame>
  );
}
