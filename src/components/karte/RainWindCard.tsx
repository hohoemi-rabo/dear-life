import Link from "next/link";
import { DataStateLabel } from "@/components/data/DataStateMessage";
import { compareMetric, type CompareMetricKey } from "@/lib/compare-city/metrics";
import type { CompareCity } from "@/lib/data/screen-data";
import { formatMetricValue } from "@/lib/kurabe/city";
import { NOTICES } from "@/lib/notices";

// 防災カルテの「雨と風は、どれくらい？」（041 仕様書 7.2）。飯田市の気象の平年値と水害被害額を小さいカード5枚で出す。
// 多い・少ないは書かず、いまの街の値は地区くらべ「いまの街と」で並べて見てもらう。値がなければ「データ未取得」
export const RAIN_WIND_METRICS: readonly CompareMetricKey[] = ["precip_annual", "rain30_days", "wind10_days", "snow_depth_max", "flood_damage_10y"];

export function rainWindStates(iida: CompareCity | null) {
  return RAIN_WIND_METRICS.map((key) => iida?.metrics[key] ?? ({ status: "unavailable" } as const));
}

export function RainWindCard({ iida, compareHref }: { iida: CompareCity | null; compareHref?: string }) {
  return (
    <section aria-labelledby="rain-wind-title" className="flex break-inside-avoid flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card md:p-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="rain-wind-title" className="text-lg font-extrabold md:text-xl">
          雨と風は、どれくらい？
        </h2>
        <p className="text-sm text-ink-muted">飯田市の値（気象庁の平年値・国の水害統計）</p>
      </div>
      <dl className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {RAIN_WIND_METRICS.map((key) => {
          const metric = compareMetric(key);
          const state = iida?.metrics[key] ?? ({ status: "unavailable" } as const);
          return (
            <div key={key} className="flex flex-col gap-1 rounded-button border border-line px-3 py-2 last:col-span-2 md:last:col-span-1">
              <dt className="text-sm font-bold">{metric.label}</dt>
              <dd className="flex flex-col">
                {state.status === "available" ? (
                  <>
                    <span className="font-bold tabular-nums">
                      <span className="text-2xl font-extrabold">{formatMetricValue(state.value.value)}</span>
                      <span className="ml-1 text-sm">{state.value.unit}</span>
                    </span>
                    <span className="text-xs text-ink-muted">{state.value.periodLabel}</span>
                  </>
                ) : (
                  <DataStateLabel state={state} />
                )}
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="text-sm text-ink-muted">{NOTICES.compareFlood}</p>
      {compareHref && (
        <Link href={compareHref} className="inline-flex min-h-tap items-center gap-1 self-end font-bold text-primary underline underline-offset-4 hover:no-underline print:hidden">
          いまの街とくらべる
          <span aria-hidden="true">→</span>
        </Link>
      )}
    </section>
  );
}
