import { DataSourceNote } from "@/components/data/DataSourceNote";
import { DataStateMessage } from "@/components/data/DataStateMessage";
import { CountBadge } from "@/components/ui/CountBadge";
import { Notice } from "@/components/ui/Notice";
import type { Housing } from "@/lib/conditions/labels";
import type { DataState, DistrictData, MarketCategory, MarketStat } from "@/lib/data/screen-data";
import { SQUARE_METER, formatManYen, formatQuarterRange } from "@/lib/format";
import { EXAMPLE_LAND_AREA, MARKET_CATEGORY_LABELS, NO_RENT_DATA, landEstimates, marketCategoryOrder } from "@/lib/karte/housing";
import { NOTICES } from "@/lib/notices";

// 住まいカード（要件 4章・5章）。相場は「真ん中の値」と書き、件数・件数ラベル・「過去の取引の参考値」を必ず添える。
// 借りるときは家賃の情報がないことを先に伝え、売買の相場は「参考に見る」で開く
export function HousingCard({ district, housing }: { district: DistrictData; housing: Housing }) {
  if (housing === "rent") {
    return (
      <div className="flex flex-col gap-3">
        <p className="font-bold">{NO_RENT_DATA}</p>
        <details className="rounded-button border border-line">
          <summary className="flex min-h-tap cursor-pointer items-center px-3 text-sm font-bold text-primary">
            売買の相場を参考に見る
          </summary>
          <div className="border-t border-line p-3">
            <MarketList district={district} housing={housing} />
          </div>
        </details>
      </div>
    );
  }
  return <MarketList district={district} housing={housing} />;
}

// 閉じた住まいカードの見出しに出す、選んだ家にいちばん近い相場（027 デザインイメージ）。
// 開けば同じ値を詳しく出すので、開いている間は隠す（呼ぶ側）。ここでも件数・件数ラベル・注意書き・出典を必ず添える（要件 5章）
export function HousingSummary({ district, housing }: { district: DistrictData; housing: Housing }) {
  if (housing === "rent") return <p className="text-sm font-bold">{NO_RENT_DATA}</p>;
  const category = marketCategoryOrder(housing)[0];
  const state = district.market[category];
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-bold">{MARKET_CATEGORY_LABELS[category]}の真ん中の値</p>
      {state.status === "available" ? (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="price-figure text-3xl">{formatManYen(state.value.median)}</span>
          <CountBadge count={state.value.sampleCount} />
        </p>
      ) : (
        <DataStateMessage state={state} />
      )}
      <p className="text-xs text-ink-muted">{NOTICES.market}</p>
      {state.status !== "unavailable" && (
        <DataSourceNote
          source={state.source}
          period={state.status === "available" ? formatQuarterRange(state.value.periodFrom, state.value.periodTo) : undefined}
        />
      )}
    </div>
  );
}

function MarketList({ district, housing }: { district: DistrictData; housing: Housing }) {
  const categories = marketCategoryOrder(housing);
  // 3つとも同じ出典・同じ対象期間なので、出典は最後に1回だけ出す
  const states = categories.map((category) => district.market[category]);
  const sourced = states.find((state) => state.status !== "unavailable");
  const available = states.find((state) => state.status === "available");
  return (
    <div className="flex flex-col gap-4">
      {categories.map((category, index) => (
        <MarketBlock key={category} category={category} state={district.market[category]} featured={index === 0 && housing !== "rent"} />
      ))}
      <Notice>{NOTICES.market}</Notice>
      {sourced?.status === "available" || sourced?.status === "none" ? (
        <DataSourceNote
          source={sourced.source}
          period={available?.status === "available" ? formatQuarterRange(available.value.periodFrom, available.value.periodTo) : undefined}
        />
      ) : null}
    </div>
  );
}

function MarketBlock({ category, state, featured }: { category: MarketCategory; state: DataState<MarketStat>; featured: boolean }) {
  const isLand = category === "land";
  return (
    <section className={`flex flex-col gap-1 ${featured ? "" : "border-t border-line pt-3"}`}>
      <h3 className="text-sm font-bold">{MARKET_CATEGORY_LABELS[category]}</h3>
      {state.status === "available" ? (
        <>
          <p className="text-xs text-ink-muted">{isLand ? `1${SQUARE_METER}あたりの真ん中の値` : "総額の真ん中の値"}</p>
          <p className="flex flex-wrap items-baseline gap-x-3">
            <span className={`price-figure ${featured ? "text-4xl" : "text-2xl"}`}>
              {formatManYen(state.value.median)}
              {isLand && <span className="font-sans text-base font-bold">／{SQUARE_METER}</span>}
            </span>
            <CountBadge count={state.value.sampleCount} />
          </p>
          {isLand && <LandDetails stat={state.value} />}
        </>
      ) : (
        <DataStateMessage state={state} />
      )}
    </section>
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
