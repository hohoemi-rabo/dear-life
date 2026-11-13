"use client";

import { useId, type CSSProperties } from "react";
import { DataStateMessage } from "@/components/data/DataStateMessage";
import type { DistrictData, Population } from "@/lib/data/screen-data";
import { formatJaDate } from "@/lib/format";
import { ageShares, ageUnknown, type AgeShare } from "@/lib/karte/facilities";

// カルテの人口（040。見本 docs/design/karte-detail-population.png）：
// 「〈地区〉の人口」と大きい数字・調査時点の札 → 「年齢の割合」の太い帯 → 3つの札 → 斜線（年齢不詳）の説明

// 帯と札の色（見本の3色。14歳以下・15〜64歳・65歳以上の順）。15〜64歳だけ地の色が濃いので白い字にする
const AGE_STYLES = [
  { fill: "bg-age-young", text: "text-ink" },
  { fill: "bg-age-adult", text: "text-white" },
  { fill: "bg-age-senior", text: "text-ink" },
] as const;

// 年齢不詳の分の斜線（帯の右の端と、説明の1行の印）
const HATCH: CSSProperties = {
  backgroundImage: "repeating-linear-gradient(135deg, #B5AD9C 0 2px, #EFE8D8 2px 5px)",
};

export function PopulationFigures({ state, districtName }: { state: DistrictData["population"]; districtName: string }) {
  if (state.status !== "available") {
    return (
      <div className="flex flex-col gap-2">
        <Title districtName={districtName} />
        <DataStateMessage state={state} />
      </div>
    );
  }
  const population = state.value;
  const shares = ageShares(population);
  const unknown = ageUnknown(population);
  return <Figures population={population} shares={shares} unknown={unknown} districtName={districtName} />;
}

function Figures({
  population,
  shares,
  unknown,
  districtName,
}: {
  population: Population;
  shares: readonly AgeShare[];
  unknown: ReturnType<typeof ageUnknown>;
  districtName: string;
}) {
  // 印刷（023）では画面と同じカードがもう1つ出るので、見出しの id は固定にしない
  const ageTitleId = useId();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <Title districtName={districtName} />
          <p className="mt-1 flex items-baseline gap-1">
            <span className="text-5xl font-extrabold tabular-nums md:text-6xl">{population.total.toLocaleString("ja-JP")}</span>
            <span className="text-xl font-bold md:text-2xl">人</span>
          </p>
        </div>
        <p className="self-start rounded-full border border-line bg-kinari-deep px-4 py-1.5 text-xs text-ink-muted md:text-sm">
          {formatJaDate(population.asOf)}時点・国勢調査
        </p>
      </div>

      {shares.length > 0 && (
        <section aria-labelledby={ageTitleId} className="flex flex-col gap-3 border-t border-line pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 id={ageTitleId} className="break-after-avoid text-lg font-extrabold md:text-2xl">
              年齢の割合
            </h3>
            <p className="text-xs text-ink-muted md:text-sm">{districtName}の人口全体に占める割合</p>
          </div>
          <AgeBar shares={shares} unknownPercent={unknown?.percent ?? 0} />
          <ul className="flex flex-col gap-2 md:grid md:grid-cols-3 md:gap-3">
            {shares.map((share, index) => (
              <li
                key={share.label}
                className="flex items-center gap-2 rounded-button border border-line bg-surface px-3 py-2.5 md:px-4"
              >
                <span aria-hidden="true" className={`size-3.5 shrink-0 rounded-sm ${AGE_STYLES[index].fill}`} />
                <span className="flex-1 font-bold">{share.label}</span>
                <span className="font-bold tabular-nums">{share.count.toLocaleString("ja-JP")}人</span>
                {/* スマホの帯は色だけなので、割合は札に出す（2026-11-13 まさゆきさん） */}
                <span className="w-14 text-right tabular-nums md:hidden print:hidden">{formatPercent(share.percent)}</span>
              </li>
            ))}
          </ul>
          {unknown && (
            <p className="flex items-start gap-2 text-xs text-ink-muted">
              <span aria-hidden="true" className="mt-0.5 size-3 shrink-0 rounded-sm" style={HATCH} />
              斜線は、国勢調査で年齢が分からなかった人です（{unknown.count.toLocaleString("ja-JP")}人・{formatPercent(unknown.percent)}）。
            </p>
          )}
        </section>
      )}
    </div>
  );
}

function Title({ districtName }: { districtName: string }) {
  return <h2 className="font-bold text-primary md:text-lg">{districtName}の人口</h2>;
}

// 割合は小数1桁で出す（「55%」ではなく「55.0%」。見本）
function formatPercent(percent: number): string {
  return `${percent.toFixed(1)}%`;
}

// 年齢3区分の太い帯。PC は帯の中に割合を出し、スマホは色だけ（割合は下の札）。右の端の斜線は年齢不詳の分
function AgeBar({ shares, unknownPercent }: { shares: readonly AgeShare[]; unknownPercent: number }) {
  return (
    <div
      role="img"
      aria-label={`年齢の割合：${shares.map((share) => `${share.label} ${formatPercent(share.percent)}`).join("、")}`}
      className="flex h-6 w-full overflow-hidden rounded-button md:h-11"
    >
      {shares.map((share, index) => (
        <div
          key={share.label}
          className={`flex items-center justify-center font-bold tabular-nums ${AGE_STYLES[index].fill} ${AGE_STYLES[index].text}`}
          style={{ width: `${share.percent}%` }}
        >
          <span aria-hidden="true" className="hidden md:inline">
            {formatPercent(share.percent)}
          </span>
        </div>
      ))}
      {unknownPercent > 0 && <div aria-hidden="true" style={{ ...HATCH, width: `${unknownPercent}%` }} />}
    </div>
  );
}
