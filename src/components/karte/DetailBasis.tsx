import type { KarteCard } from "@/lib/conditions/labels";
import type { DataState, DistrictData, HousingTenure, MarketCategory, RentReference, SourceInfo } from "@/lib/data/screen-data";
import { formatJaDate, formatQuarterRange } from "@/lib/format";
import { MARKET_CATEGORY_PHRASES } from "@/lib/karte/entries";
import type { DetailTab } from "./DetailPanels";

// カルテの詳細の「数字の根拠」（出典・集計対象・対象期間・確認日）。画面の詳細と印刷（023）で使う

// 出典・対象・確認日の表（画面の「数字の根拠を見る」と印刷。023）
export function BasisTables({ rows, note }: { rows: BasisRow[][]; note?: string }) {
  return (
    <>
      {rows.length === 0 ? (
        <p className="text-sm">データ未取得</p>
      ) : (
        rows.map((group, index) => (
          <table key={index} className="w-full text-left text-sm">
            <tbody className="divide-y divide-line">
              {group.map(([label, value]) => (
                <tr key={label}>
                  <th scope="row" className="w-28 bg-kinari px-3 py-1.5 font-normal text-ink-muted">
                    {label}
                  </th>
                  <td className="px-3 py-1.5">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ))
      )}
      {note && <p className="text-xs text-ink-muted">{note}</p>}
    </>
  );
}

export type BasisRow = readonly [label: string, value: string];

function sourceRows(source: SourceInfo, period?: string): BasisRow[] {
  const date = source.checkedOn ?? source.fetchedOn;
  return [
    ["出典", `${source.publisher}「${source.name}」`],
    ["対象", period ?? source.periodLabel ?? "記載なし"],
    ...(date ? [[source.checkedOn ? "確認日" : "取得日", formatJaDate(date)] as const] : []),
  ];
}

// 住まいの出典の表。今見ているタブの集計対象と期間を出す
export function housingBasisRows(district: DistrictData, districtName: string, category: MarketCategory): BasisRow[][] {
  const state = district.market[category];
  if (state.status === "unavailable") return [];
  const period = state.status === "available" ? formatQuarterRange(state.value.periodFrom, state.value.periodTo) : undefined;
  const [source, , ...dates] = sourceRows(state.source, period);
  return [
    [
      source,
      ["集計対象", `${districtName}・${MARKET_CATEGORY_PHRASES[category]}`],
      ["対象期間", period ?? state.source.periodLabel ?? "記載なし"],
      ...dates,
    ],
  ];
}

// 借りるの「選んだ家」の出典の表：家賃（飯田市全体）と、借家の世帯数（地区）（034）
export function rentBasisRows(rent: DataState<RentReference>, tenure: DataState<HousingTenure>, districtName: string): BasisRow[][] {
  const groups: BasisRow[][] = [];
  if (rent.status !== "unavailable") {
    const [source, ...rest] = sourceRows(rent.source);
    groups.push([source, ["集計対象", "飯田市・民営借家（専用住宅）・家賃0円を除く"], ...rest]);
  }
  if (tenure.status !== "unavailable") {
    const [source, ...rest] = sourceRows(tenure.source);
    groups.push([source, ["集計対象", `${districtName}・住宅に住む一般世帯`], ...rest]);
  }
  return groups;
}

// 住まい以外の出典の表。見ているタブ（印刷では並べたタブすべて）で使っているデータの出典を、同じ出典は1回だけ出す。
// 支援制度は制度ごとのページが出典で、確認日は一覧の制度ごとに出している
export function otherBasisRows(card: Exclude<KarteCard, "housing">, tabs: readonly DetailTab[]): BasisRow[][] {
  if (card === "support")
    return [
      [
        ["出典", "飯田市公式サイト（制度ごとのページ）"],
        ["確認日", "制度ごとに記載"],
      ],
    ];
  const seen = new Set<string>();
  const groups: BasisRow[][] = [];
  for (const state of tabs.flatMap((tab) => tab.states)) {
    if (state.status === "unavailable" || seen.has(state.source.id)) continue;
    seen.add(state.source.id);
    groups.push(sourceRows(state.source));
  }
  return groups;
}
