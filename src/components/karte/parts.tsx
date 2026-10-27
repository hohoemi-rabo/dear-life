import type { ReactNode } from "react";
import { DataSourceNote } from "@/components/data/DataSourceNote";
import { DataStateMessage } from "@/components/data/DataStateMessage";
import type { DataState, Facility } from "@/lib/data/screen-data";
import { groupBySubkind } from "@/lib/karte/facilities";

// カードの中の1つの項目（「保育施設」「バス停」など）。値がなければ「該当なし／データ未取得」を出し、値があれば出典を添える（F-09・要件 7.2）。
// period を渡すと出典の対象期間の代わりに出す
export function DataSection<T>({
  title,
  state,
  period,
  none,
  children,
}: {
  title: string;
  state: DataState<T>;
  period?: (value: T) => string;
  // 「該当なし」のときに、決まりの文の代わりに出す文（「地区内に駅はありません。」など）
  none?: string;
  children: (value: T) => ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-bold">{title}</h3>
      {state.status === "available" ? (
        <>
          {children(state.value)}
          <DataSourceNote source={state.source} period={period?.(state.value)} />
        </>
      ) : state.status === "none" && none ? (
        <>
          <p className="text-sm">{none}</p>
          <DataSourceNote source={state.source} />
        </>
      ) : (
        <DataStateMessage state={state} />
      )}
    </section>
  );
}

// 「◯か所」の大きな数字
export function CountValue({ count, unit = "か所" }: { count: number; unit?: string }) {
  return (
    <p>
      <span className="text-3xl font-bold tabular-nums">{count.toLocaleString("ja-JP")}</span>
      <span className="ml-1 font-bold">{unit}</span>
    </p>
  );
}

// 施設の数と、開いて見る一覧（種類ごと）。数が多いので一覧は閉じておく
export function FacilityList<T extends Facility>({
  facilities,
  label,
  extra,
}: {
  facilities: readonly T[];
  label: string;
  extra?: (facility: T) => ReactNode;
}) {
  const groups = groupBySubkind(facilities);
  return (
    <>
      <CountValue count={facilities.length} />
      <details className="rounded-button border border-line">
        <summary className="flex min-h-tap cursor-pointer items-center px-3 text-sm font-bold text-primary">
          {label}の一覧を見る
        </summary>
        <div className="flex flex-col gap-3 border-t border-line px-3 py-2">
          {groups.map((group) => (
            <div key={group.subkind}>
              {groups.length > 1 && (
                <p className="text-xs font-bold text-ink-muted">
                  {group.subkind}（{group.items.length}か所）
                </p>
              )}
              <ul className="flex flex-col divide-y divide-line">
                {group.items.map((facility, index) => (
                  <li key={`${facility.name}-${index}`} className="py-1.5 text-sm">
                    <span className="font-bold">{facility.name}</span>
                    {facility.address && <span className="ml-2 text-xs text-ink-muted">{facility.address}</span>}
                    {extra?.(facility)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>
    </>
  );
}
