import { DataStateMessage } from "@/components/data/DataStateMessage";
import { Notice } from "@/components/ui/Notice";
import type { DataState, HousingTenure, RentReference } from "@/lib/data/screen-data";
import { RENT_NOTICE, RENT_TITLE, formatRentManYen, rentBreakdown, renterSharePercent } from "@/lib/housing/rent";

// 「借りる」を選んだ人に出す家賃の参考値と、地区の借家の世帯数（034）。えらぶ 03・くらしの住まいのピン・カルテの住まいで使う。
// 家賃は飯田市全体の平均なので、地区の値でも今の募集家賃でもないことを RENT_NOTICE で必ず添える

// 家賃の平均（1か月）と、推計できた建て方ごとの平均
export function RentValue({ state, size = "md" }: { state: DataState<RentReference>; size?: "md" | "lg" }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className={size === "lg" ? "text-sm font-bold md:text-base" : "text-sm font-bold text-ink-muted"}>{RENT_TITLE}（1か月）</h2>
      {state.status === "available" ? (
        <>
          {/* 値段は値段用のフォント（027） */}
          <p className={`price-figure tracking-tight ${size === "lg" ? "text-4xl md:text-5xl" : "text-4xl"}`}>
            {formatRentManYen(state.value.all)}
          </p>
          <RentBreakdown rent={state.value} />
        </>
      ) : (
        <DataStateMessage state={state} />
      )}
    </div>
  );
}

function RentBreakdown({ rent }: { rent: RentReference }) {
  const rows = rentBreakdown(rent);
  if (rows.length === 0) return null;
  return (
    <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1 text-sm">
      {rows.map((row) => (
        <div key={row.label} className="contents">
          <dt className="text-ink-muted">{row.label}</dt>
          <dd className="font-bold tabular-nums">{formatRentManYen(row.rent)}</dd>
        </div>
      ))}
    </dl>
  );
}

// 地区の住宅に住む世帯のうち、民営の借家に住む世帯の数と割合。点数ではなく事実として出す
export function RenterHouseholds({ state, districtName }: { state: DataState<HousingTenure>; districtName: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-sm font-bold text-ink-muted">{districtName}で民営の借家に住む世帯</h3>
      {state.status === "available" ? (
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-2xl font-bold tabular-nums">{state.value.privateRented.toLocaleString("ja-JP")}世帯</span>
          <span className="text-sm">
            （住宅に住む{state.value.householdsInHousing.toLocaleString("ja-JP")}世帯の約{renterSharePercent(state.value)}%）
          </span>
        </p>
      ) : (
        <DataStateMessage state={state} />
      )}
    </div>
  );
}

// シートの中身（えらぶ 03・くらしの住まいのピン）。出典はそれぞれの画面の決まりで出す（えらぶはカルテと「データについて」で見る）
export function RentSheetBody({
  rent,
  tenure,
  districtName,
}: {
  rent: DataState<RentReference>;
  tenure: DataState<HousingTenure>;
  districtName: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <RentValue state={rent} />
      <RenterHouseholds state={tenure} districtName={districtName} />
      <Notice>{RENT_NOTICE}</Notice>
    </div>
  );
}
