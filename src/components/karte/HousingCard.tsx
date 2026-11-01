"use client";

import { useId, useState } from "react";
import { DataStateMessage } from "@/components/data/DataStateMessage";
import { PixelImage } from "@/components/pixel/PixelImage";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { CountLabel } from "@/components/ui/CountBadge";
import type { Housing } from "@/lib/conditions/labels";
import type { DistrictData, MarketCategory, MarketStat } from "@/lib/data/screen-data";
import { SQUARE_METER, formatManYen } from "@/lib/format";
import { houseSrc } from "@/lib/illust/assets";
import { EXAMPLE_LAND_AREA, MARKET_CATEGORY_LABELS, NO_RENT_DATA, landEstimates, marketCategoryOrder } from "@/lib/karte/housing";
import { NOTICES } from "@/lib/notices";

// 住まいの詳細のタブ。「選んだ家」は選んだ家にいちばん近い相場、借りるは家賃の情報がないことを出す
export type HousingTab = {
  id: string;
  label: string;
  icon: "icon-house" | "icon-districts";
  category: MarketCategory | null;
};

export function housingTabs(housing: Housing): HousingTab[] {
  const [first, ...rest] = marketCategoryOrder(housing);
  if (housing === "rent") {
    return [
      { id: "chosen", label: "選んだ家", icon: "icon-house", category: null },
      {
        id: "within",
        label: "築20年以内",
        icon: "icon-house",
        category: "house_built_within_20y",
      },
      {
        id: "over",
        label: "築21年以上",
        icon: "icon-house",
        category: "house_built_over_20y",
      },
      { id: "land", label: "土地", icon: "icon-districts", category: "land" },
    ];
  }
  const otherHouse = rest.find((category) => category !== "land") ?? first;
  return [
    { id: "chosen", label: "選んだ家", icon: "icon-house", category: first },
    {
      id: "other",
      label: "ほかの築年数",
      icon: "icon-house",
      category: otherHouse,
    },
    { id: "land", label: "土地", icon: "icon-districts", category: "land" },
  ];
}

// 住まいの詳細の値段のカード（028 見本 karte-detail-housing.png）。相場は「真ん中の値」と書き、件数・件数ラベル・
// 「過去の取引の参考値」を必ず添える（要件 5章）。下のタブで、ほかの築年数と土地に切りかえる。今見ている種類は onTabChange で知らせる
export function HousingPriceCard({
  district,
  housing,
  tab,
  onTabChange,
}: {
  district: DistrictData;
  housing: Housing;
  tab: HousingTab;
  onTabChange: (tab: HousingTab) => void;
}) {
  const tabs = housingTabs(housing);
  const panelId = useId();
  return (
    <section aria-label="住まいの相場" className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card md:p-5">
      <div id={panelId} role="tabpanel" aria-label={tab.label} className="flex flex-col gap-3">
        <div className="flex gap-3 md:gap-5">
          <TabPicture housing={housing} category={tab.category} />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {tab.category === null ? (
              <>
                <p className="text-lg font-bold">{NO_RENT_DATA}</p>
                <p className="text-sm">売買の相場は、となりのタブで参考に見られます。</p>
              </>
            ) : (
              <MarketValue category={tab.category} district={district} />
            )}
          </div>
        </div>
        {tab.category !== null && (
          // スマホはカードの幅いっぱい、PC は値段の列にそろえる（見本）
          <div className="flex gap-2 rounded-button bg-warm-soft p-3 md:ml-[9.25rem]">
            <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gold font-bold text-white">
              !
            </span>
            <p className="flex flex-col text-sm">
              <span className="font-bold text-kind-local">{NOTICES.market}</span>
              <span>この数字は、ご家族の条件に合わせた見積もりではありません。</span>
            </p>
          </div>
        )}
      </div>
      <div
        role="tablist"
        aria-label="相場の種類"
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))`,
        }}
      >
        {tabs.map((item) => {
          const selected = item.id === tab.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId}
              onClick={() => onTabChange(item)}
              className={[
                "relative flex min-h-tap items-center justify-center gap-1 whitespace-nowrap rounded-button border px-0.5 text-[11px] font-bold sm:gap-1.5 sm:text-sm",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                selected ? "border-primary bg-primary text-white" : "border-line bg-surface text-ink hover:border-primary",
              ].join(" ")}
            >
              <PixelIcon icon={item.icon} size="sm" />
              {item.label}
              {selected && (
                <span aria-hidden="true" className="absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 bg-primary" />
              )}
            </button>
          );
        })}
      </div>
      <p className="text-center text-xs text-ink-muted">建物の広さや状態などにより、実際の価格は異なります。</p>
    </section>
  );
}

export function useHousingTab(housing: Housing): [HousingTab, (tab: HousingTab) => void] {
  const tabs = housingTabs(housing);
  const [id, setId] = useState(tabs[0].id);
  const tab = tabs.find((item) => item.id === id) ?? tabs[0];
  return [tab, (next) => setId(next.id)];
}

function TabPicture({ housing, category }: { housing: Housing; category: MarketCategory | null }) {
  if (category === "land") {
    return (
      <div className="flex h-20 w-24 shrink-0 items-center justify-center rounded-button bg-pixel-sky md:h-24 md:w-32">
        <PixelImage asset="icon-districts" scale={3} decorative />
      </div>
    );
  }
  const shown: Housing = category === "house_built_over_20y" ? "old" : category === "house_built_within_20y" ? "new" : housing;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 静的書き出しなので WebP をそのまま出す
    <img
      src={houseSrc(shown, 320)}
      alt=""
      draggable={false}
      className="h-20 w-24 shrink-0 select-none rounded-button bg-pixel-sky object-contain md:h-24 md:w-32"
    />
  );
}

function MarketValue({ category, district }: { category: MarketCategory; district: DistrictData }) {
  const state = district.market[category];
  const isLand = category === "land";
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-sm font-bold md:text-base">
        {MARKET_CATEGORY_LABELS[category]}
        {isLand ? `の1${SQUARE_METER}あたりの真ん中の値` : "の真ん中の値"}
      </h2>
      {state.status === "available" ? (
        <>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="price-figure text-4xl md:text-5xl">
              {formatManYen(state.value.median)}
              {isLand && <span className="font-sans text-base font-bold">／{SQUARE_METER}</span>}
            </span>
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-sm">
                過去の取引 <span className="font-bold tabular-nums">{state.value.sampleCount.toLocaleString("ja-JP")}件</span>
              </span>
              <CountLabel count={state.value.sampleCount} />
            </span>
          </p>
          {isLand && <LandDetails stat={state.value} />}
        </>
      ) : (
        <DataStateMessage state={state} />
      )}
    </div>
  );
}

// 土地は幅（下位25%〜上位25%）・坪単価・200㎡の目安を添える。伊賀良のように幅が広い地区でも、幅は省略しない（要件 5.1）
function LandDetails({ stat }: { stat: MarketStat }) {
  const { perTsubo, forExampleArea } = landEstimates(stat.median);
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
      {stat.p25 !== null && stat.p75 !== null && (
        <>
          <dt className="text-ink-muted">幅（下位25%〜上位25%）</dt>
          <dd className="font-bold tabular-nums">
            {formatManYen(stat.p25)}〜{formatManYen(stat.p75)}／{SQUARE_METER}
          </dd>
        </>
      )}
      <dt className="text-ink-muted">坪単価</dt>
      <dd className="font-bold tabular-nums">約{formatManYen(perTsubo)}／坪</dd>
      <dt className="text-ink-muted">
        {EXAMPLE_LAND_AREA}
        {SQUARE_METER}（約60坪）なら
      </dt>
      <dd className="font-bold tabular-nums">約{formatManYen(forExampleArea)}</dd>
    </dl>
  );
}
