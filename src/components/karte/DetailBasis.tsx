import type { KarteCard } from "@/lib/conditions/labels";
import type { DataState, DistrictData, HousingTenure, MarketCategory, RentReference, SourceInfo, SupportProgram } from "@/lib/data/screen-data";
import { SQUARE_METER, formatJaDate, formatQuarterRange } from "@/lib/format";
import { MARKET_CATEGORY_PHRASES } from "@/lib/karte/entries";
import { supportCheckedRange } from "@/lib/karte/support";
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

// 住まいの出典の表（「出典・集計条件を見る」。040）。画面に出している築20年以内・築21年以上・土地の3つをまとめて出す。
// 3つは同じ出典なので出典は1回だけにし、対象期間が違うときだけ種類ごとに分ける
const MARKET_CATEGORIES: readonly MarketCategory[] = ["house_built_within_20y", "house_built_over_20y", "land"];

export function housingBasisRows(district: DistrictData, districtName: string): BasisRow[][] {
  const states = MARKET_CATEGORIES.flatMap((category) => {
    const state = district.market[category];
    return state.status === "unavailable" ? [] : [{ category, state }];
  });
  if (states.length === 0) return [];
  const periods = states.map(({ state }) =>
    state.status === "available" ? formatQuarterRange(state.value.periodFrom, state.value.periodTo) : (state.source.periodLabel ?? "記載なし"),
  );
  const samePeriod = periods.every((period) => period === periods[0]);
  const [source, , ...dates] = sourceRows(states[0].state.source);
  return [
    [
      source,
      ["集計対象", `${districtName}・${states.map(({ category }) => MARKET_CATEGORY_PHRASES[category]).join("、")}`],
      ...(samePeriod
        ? [["対象期間", periods[0]] as const]
        : states.map(({ category }, index) => [`対象期間（${MARKET_CATEGORY_PHRASES[category]}）`, periods[index]] as const)),
      ["集計のしかた", `取引価格の中央値（土地は1${SQUARE_METER}あたり）`],
      ["除いた取引", "調停・競売等、関係者間取引、隣地の購入"],
      ...dates,
    ],
  ];
}

// 借りるの家賃のカードの出典の表：家賃（飯田市全体）と、借家の世帯数（地区）（034）
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
// 支援制度は制度ごとのページが出典で、確認日は制度ごとに持っている（違えば古い日〜新しい日。040）
export function otherBasisRows(
  card: Exclude<KarteCard, "housing">,
  tabs: readonly DetailTab[],
  supportPrograms: readonly SupportProgram[],
): BasisRow[][] {
  if (card === "support") {
    const range = supportCheckedRange(supportPrograms);
    return [
      [
        ["出典", "飯田市公式サイト（制度ごとのページ）"],
        ["対象", "飯田市全体の制度（4地区とも同じ）"],
        [
          "確認日",
          range === null
            ? "—"
            : range.oldest === range.newest
              ? formatJaDate(range.oldest)
              : `${formatJaDate(range.oldest)}〜${formatJaDate(range.newest)}（制度ごとに異なる）`,
        ],
      ],
    ];
  }
  const seen = new Set<string>();
  const groups: BasisRow[][] = [];
  for (const state of tabs.flatMap((tab) => tab.states)) {
    if (state.status === "unavailable" || seen.has(state.source.id)) continue;
    seen.add(state.source.id);
    groups.push(sourceRows(state.source));
  }
  return groups;
}
