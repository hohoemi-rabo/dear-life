import Link from "next/link";
import type { ReactNode } from "react";
import { DataSourceNote } from "@/components/data/DataSourceNote";
import { DataStateLabel, DataStateLegend } from "@/components/data/DataStateMessage";
import { FamilyRow } from "@/components/illust/FamilyRow";
import { SourceNote } from "@/components/ui/SourceNote";
import { TradeCount } from "@/components/ui/TradeCount";
import type { Conditions } from "@/lib/conditions/model";
import type { CompareMetricValue, DataState, DistrictData, MarketStat, ScreenData } from "@/lib/data/screen-data";
import { formatManYen, SQUARE_METER } from "@/lib/format";
import {
  cityCompareGroups,
  cityCompareSources,
  compareCityOptions,
  findIida,
  floodPeriod,
  formatMetricValue,
  type CityCompareGroup,
  type CityMarketRow,
  type CityMetricRow,
} from "@/lib/kurabe/city";
import { sourcesSummary } from "@/lib/kurabe/compare";
import { NOTICES } from "@/lib/notices";
import { KurabeIcon } from "./KurabeIcon";

// 地区くらべ「いまの街と」（041。見本 docs/design/kurabe-city-pc.png）。左に今住んでいる街、右に飯田を並べ、間に矢印を置く。
// 矢印は中立の1色で向きも変えない。差・増減・色分け・順位は出さず、見る人に判断を残す（仕様書 3章）。
// スマホは見本がないので、今の「2地区で比較」と同じ2列の形（まさゆきさんに見てもらってから決める）
type Props = {
  data: ScreenData;
  // 選んだ地区（住まいの行の飯田側）。選んでいなければ null
  district: DistrictData | null;
  cityId: string | null;
  onCityChange: (cityId: string) => void;
  conditions: Pick<Conditions, "adults" | "children" | "parent">;
  // 地区を選んでいないとき、住まいの行から案内するえらぶの URL
  erabuHref: string;
  panelId: string;
  tabId: string;
};

export const GROUP_SUBTITLES: Partial<Record<CityCompareGroup["id"], string>> = { weather: "気象庁 平年値（1991〜2020年）" };

// 表の下の注意書き（画面と印刷で同じ）。水害は対象期間を後ろに足す
export function cityNotices(groups: readonly CityCompareGroup[]): string[] {
  const flood = floodPeriod(groups);
  return [
    NOTICES.compareWeather,
    flood ? `${NOTICES.compareFlood}対象期間：${flood}。` : NOTICES.compareFlood,
    NOTICES.compareHousing,
    NOTICES.market,
    NOTICES.compareNotJudgement,
  ];
}

export function CityCompareView({ data, district, cityId, onCityChange, conditions, erabuHref, panelId, tabId }: Props) {
  const options = compareCityOptions(data);
  const city = options.find((option) => option.id === cityId) ?? null;
  const groups = cityCompareGroups(city, findIida(data), district);
  const cityName = city?.name ?? "いまの街";
  const districtLabel = district ? `${district.name}（地区）` : null;
  const notices = cityNotices(groups);
  const picker = (className: string, id: string) =>
    options.length > 0 && (
      <span className={`relative inline-block w-full max-w-[11rem] ${className}`}>
        <select
          id={id}
          value={city?.id ?? ""}
          onChange={(event) => onCityChange(event.target.value)}
          className="min-h-tap w-full appearance-none rounded-button border-2 border-primary bg-surface pl-3 pr-8 text-center text-lg font-extrabold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        <KurabeIcon name="chevron" className="pointer-events-none absolute right-2.5 top-1/2 size-5 -translate-y-1/2" />
      </span>
    );

  return (
    <section
      id={panelId}
      role="tabpanel"
      aria-labelledby={tabId}
      className="flex flex-col gap-3 rounded-card border border-line bg-surface p-2 shadow-card lg:gap-4 lg:p-4"
    >
      <div className="flex items-center gap-2 px-1 lg:gap-3 lg:px-2">
        <KurabeIcon name="building" className="size-6 text-primary min-[400px]:size-7 lg:size-9" />
        <h2 className="flex-1 text-lg font-extrabold min-[400px]:text-xl lg:text-3xl">いまの街と、くらべる</h2>
        {/* スマホは見出しの右に小さく（s1.png の並び）。PC は下の帯 */}
        <span aria-hidden="true" className="flex items-end gap-1 lg:hidden">
          <FamilyRow conditions={conditions} fatherHeight={32} pose="walk" lazy />
          <KurabeIcon name="arrow" className="mb-1 size-6 text-primary" />
        </span>
      </div>
      <div className="hidden lg:block">
        <WalkingStrip conditions={conditions} />
      </div>

      {/* スマホ：上に残る「いまの街 → 飯田市」の札（2026-11-15 まさゆきさん s1.png の並び） */}
      <div className="sticky top-0 z-10 grid grid-cols-[minmax(0,1fr)_2rem_minmax(0,1fr)] items-center rounded-card bg-kinari-deep px-2 py-2 shadow-card lg:hidden">
        <div className="flex flex-col items-center gap-1">
          <label htmlFor="kurabe-city-mobile" className="text-lg font-extrabold">
            いまの街
          </label>
          {picker("", "kurabe-city-mobile")}
        </div>
        <KurabeIcon name="arrow" className="mx-auto size-6 text-primary" />
        <span className="text-center text-xl font-extrabold">飯田市</span>
      </div>
      <div className="flex flex-col gap-3 lg:hidden">
        {groups.map((group) => (
          <section key={group.id} aria-labelledby={`city-group-${group.id}-mobile`} className="flex flex-col overflow-hidden rounded-card border border-line bg-surface">
            <h3 id={`city-group-${group.id}-mobile`} className="flex flex-wrap items-baseline gap-x-3 bg-primary-soft px-3 py-1.5 text-lg font-extrabold text-primary">
              {group.title}
              {GROUP_SUBTITLES[group.id] && <span className="text-xs font-normal text-ink-muted">{GROUP_SUBTITLES[group.id]}</span>}
            </h3>
            {group.id === "housing" && (
              <p className="grid grid-cols-[minmax(0,1fr)_2rem_minmax(0,1fr)] items-center bg-kinari-deep px-2 py-1.5 text-center font-extrabold">
                <span>{cityName}</span>
                <KurabeIcon name="arrow" className="mx-auto size-5 text-primary" />
                <span>{districtLabel ?? "飯田の地区"}</span>
              </p>
            )}
            {group.rows.map((row) => (
              <MobileRow key={row.key} label={row.label} city={cityCell(row, "pair")} iida={iidaCell(row, "pair", erabuHref)} cityName={cityName} iidaName={row.kind === "market" ? (districtLabel ?? "飯田") : "飯田市"} />
            ))}
          </section>
        ))}
      </div>

      {/* PC：見本どおりの表。見出しとまとまりごとに枠を分ける（列の幅は同じ colgroup でそろえる） */}
      <div className="hidden flex-col gap-2 lg:flex">
        <table className="w-full table-fixed border-separate border-spacing-0 overflow-hidden rounded-button border border-line text-left">
          <caption className="sr-only">いまの街と飯田の見出し</caption>
          <ColumnWidths />
          <thead>
            <tr className="bg-kinari-deep">
              <td />
              <th scope="col" className="border-l border-line px-3 py-3 text-center">
                <label htmlFor="kurabe-city-pc" className="block text-2xl font-extrabold">
                  いまの街
                </label>
                <span className="mt-1 flex justify-center">{picker("", "kurabe-city-pc")}</span>
              </th>
              <td className="border-l border-line" />
              <th scope="col" className="border-l border-line px-3 py-3 text-center">
                <span className="block text-2xl font-extrabold">飯田</span>
                <span className="mt-1 block font-bold">飯田市</span>
              </th>
            </tr>
          </thead>
        </table>
        {groups.map((group) => (
          <table key={group.id} className="w-full table-fixed border-separate border-spacing-0 overflow-hidden rounded-button border border-line text-left">
            <caption className="sr-only">いまの街と飯田：{group.title}</caption>
            <ColumnWidths />
            <thead>
              <tr className="bg-primary-soft">
                <th scope="col" className="px-4 py-2 text-left text-xl font-extrabold text-primary" colSpan={group.id === "housing" ? 1 : 4}>
                  {group.title}
                  {GROUP_SUBTITLES[group.id] && <span className="ml-6 text-sm font-normal text-ink-muted">{GROUP_SUBTITLES[group.id]}</span>}
                </th>
                {group.id === "housing" && (
                  <>
                    <th scope="col" className="px-3 py-2 text-center text-lg font-extrabold">
                      {cityName}
                    </th>
                    <td />
                    <th scope="col" className="px-3 py-2 text-center text-lg font-extrabold">
                      {districtLabel ?? "飯田の地区"}
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {group.rows.map((row) => (
                <tr key={row.key}>
                  <th scope="row" className="border-t border-line px-6 py-2.5 font-bold">
                    {row.label}
                  </th>
                  <td className="border-l border-t border-line px-3 py-2.5 text-center">{cityCell(row, "large")}</td>
                  <td className="border-l border-t border-line text-center text-primary">
                    <KurabeIcon name="arrow" className="mx-auto size-7" />
                  </td>
                  <td className="border-l border-t border-line px-3 py-2.5 text-center">{iidaCell(row, "large", erabuHref)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>

      <div className="flex items-start gap-3 rounded-button border border-line bg-surface px-3 py-2 lg:bg-transparent lg:px-4">
        <KurabeIcon name="info" className="mt-0.5 size-7 text-primary" />
        <ul className="flex flex-col gap-0.5 text-sm">
          {notices.map((notice) => (
            <li key={notice}>{notice}</li>
          ))}
        </ul>
      </div>
      <CitySources groups={groups} />
    </section>
  );
}

function ColumnWidths() {
  return (
    <colgroup>
      <col className="w-[31%]" />
      <col className="w-[28%]" />
      <col className="w-[6%]" />
      <col />
    </colgroup>
  );
}

// 家族が左のいまの街から、右の飯田へ歩いていく帯（見本の絵。新しい絵は描かず、カルテの下の帯の家族を使う）。
// 「動きを減らす」設定では止まった絵にする
function WalkingStrip({ conditions }: { conditions: Pick<Conditions, "adults" | "children" | "parent"> }) {
  return (
    <div aria-hidden="true" className="relative flex h-20 items-end justify-center gap-6 overflow-hidden rounded-card bg-kinari-deep/60 pb-2">
      <div className="motion-safe:animate-walk-to-iida">
        <FamilyRow conditions={conditions} fatherHeight={56} pose="walk" lazy />
      </div>
      <KurabeIcon name="arrow" className="mb-4 size-9 text-primary" />
    </div>
  );
}

function MobileRow({ label, city, iida, cityName, iidaName }: { label: string; city: ReactNode; iida: ReactNode; cityName: string; iidaName: string }) {
  return (
    <section aria-label={label} className="flex flex-col border-t border-line px-2 pt-1.5 first-of-type:border-t-0">
      <h4 className="font-bold">{label}</h4>
      <dl className="grid grid-cols-[minmax(0,1fr)_2rem_minmax(0,1fr)] items-center">
        <div className="min-w-0 px-1.5 py-1.5 text-center">
          <dt className="sr-only">{cityName}</dt>
          <dd>{city}</dd>
        </div>
        <KurabeIcon name="arrow" className="mx-auto size-5 text-primary" />
        <div className="min-w-0 px-1.5 py-1.5 text-center">
          <dt className="sr-only">{iidaName}</dt>
          <dd>{iida}</dd>
        </div>
      </dl>
    </section>
  );
}

type CellSize = "large" | "pair";
export type { CellSize as CityCellSize };

export function cityCell(row: CityMetricRow | CityMarketRow, size: CellSize): ReactNode {
  return row.kind === "metric" ? <MetricCell state={row.city} size={size} /> : <MarketCell state={row.city} land={row.key === "land"} size={size} />;
}

export function iidaCell(row: CityMetricRow | CityMarketRow, size: CellSize, erabuHref: string): ReactNode {
  if (row.kind === "metric") return <MetricCell state={row.iida} size={size} />;
  if (row.district === null) {
    return (
      <span className="flex flex-col items-center gap-0.5 text-sm">
        <span className="font-bold text-ink-muted">地区を選ぶと出ます</span>
        <Link href={erabuHref} className="inline-flex min-h-tap items-center font-bold text-primary underline underline-offset-4 hover:no-underline">
          地区をえらぶ
        </Link>
      </span>
    );
  }
  return <MarketCell state={row.district} land={row.key === "land"} size={size} />;
}

// 雨・水害・人口の値。値段ではないので、値段用のフォントは使わない（027）
function MetricCell({ state, size }: { state: DataState<CompareMetricValue>; size: CellSize }) {
  if (state.status !== "available") return <DataStateLabel state={state} />;
  const { value, unit, periodLabel } = state.value;
  return (
    <span className="flex flex-col items-center">
      <span className="font-bold tabular-nums">
        <span className={size === "large" ? "text-3xl font-extrabold" : "text-2xl font-extrabold"}>{formatMetricValue(value)}</span>
        <span className="ml-1 text-base">{unit}</span>
      </span>
      <span className="text-xs text-ink-muted">{periodLabel}</span>
    </span>
  );
}

// 相場は地区くらべの住まいと同じ書き方：中央値を大きく、「取引〇件・参考値」を必ず添える（040）
function MarketCell({ state, land, size }: { state: DataState<MarketStat>; land: boolean; size: CellSize }) {
  if (state.status !== "available") return <DataStateLabel state={state} />;
  const text = formatManYen(state.value.median);
  return (
    <span className="flex flex-col items-center gap-0.5">
      <span className={`price-figure whitespace-nowrap leading-tight ${size === "large" ? "text-[1.75rem]" : "text-[1.25rem] min-[360px]:text-[1.375rem]"}`}>
        {text.replace(/万円$/, "")}
        <span className={size === "large" ? "text-lg" : "text-sm"}>万円</span>
        {land && <span className="ml-0.5 font-sans text-sm font-bold">/ {SQUARE_METER}</span>}
      </span>
      <TradeCount count={state.value.sampleCount} size={size === "pair" ? "sm" : "md"} />
    </span>
  );
}

// ふだんは閉じておく（ほかのタブと同じ）。今の都市と飯田の、表に出した値の出典だけを出す
function CitySources({ groups }: { groups: readonly CityCompareGroup[] }) {
  const entries = cityCompareSources(groups);
  const summary = sourcesSummary(entries.map(({ source }) => source.publisher));
  return (
    <details className="group rounded-button border border-line bg-surface lg:bg-transparent">
      <summary className="flex min-h-tap cursor-pointer list-none items-center gap-3 px-3 py-1 lg:px-4 [&::-webkit-details-marker]:hidden">
        <KurabeIcon name="chevron" className="size-5 transition-transform group-open:rotate-180" />
        <span className="flex-1 font-bold">
          出典・対象期間・確認日
          <span className="hidden lg:inline">を見る</span>
        </span>
        {summary && <span className="hidden text-sm text-ink-muted lg:inline">{summary}</span>}
      </summary>
      <div className="flex flex-col gap-3 px-3 pb-4 lg:px-4">
        <CitySourceList groups={groups} />
      </div>
    </details>
  );
}

// 出典の一覧（画面の開閉の中と、印刷。023）
export function CitySourceList({ groups }: { groups: readonly CityCompareGroup[] }) {
  const entries = cityCompareSources(groups);
  return (
    <>
      <DataStateLegend place="その街" />
      {entries.length === 0 ? (
        <p className="text-sm text-ink-muted">表に出している値がまだないので、出典もまだありません。</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {entries.map(({ source, period, checkedOn }) => (
            <li key={source.id} className="py-2">
              {checkedOn ? (
                <SourceNote source={`${source.publisher}「${source.name}」`} period={period ?? source.periodLabel ?? "記載なし"} date={checkedOn} dateKind="確認日" />
              ) : (
                <DataSourceNote source={source} period={period} />
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm">
        住まいの相場は、都市も地区と同じ決まり（同じ対象期間・同じ除外・中央値）で集計しています。東京23区・横浜市・名古屋市・大阪市は、すべての区の取引を合わせた値です。
      </p>
    </>
  );
}
