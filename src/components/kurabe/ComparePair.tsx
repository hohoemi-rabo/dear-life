import type { DistrictData } from "@/lib/data/screen-data";
import type { CompareTarget } from "@/lib/kurabe/links";
import type { DistrictId } from "@/lib/town-district/resolve";
import { KurabeIcon } from "./KurabeIcon";
import type { CompareRow } from "./rows";

// スマホの2地区の比較（見本 docs/design/kurabe-mobile.png。029）。左は選んだ地区で固定し、右の比較相手を変える

export function CompareModeSwitch({ target, onChange }: { target: CompareTarget; onChange: (target: CompareTarget | null) => void }) {
  const button = (label: string, current: boolean, next: CompareTarget | null) => (
    <button
      type="button"
      aria-pressed={current}
      onClick={() => onChange(next)}
      className={`min-h-tap flex-1 font-bold focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${current ? "bg-primary text-white" : "bg-surface text-ink"}`}
    >
      {label}
    </button>
  );
  return (
    <div role="group" aria-label="くらべ方" className="flex overflow-hidden rounded-button border border-line lg:hidden">
      {button("2地区で比較", target !== "all", null)}
      {button("4地区を一覧", target === "all", "all")}
    </div>
  );
}

// スクロールしても上に残し、どの地区を比べているかを見失わないようにする（2026-11-06 まさゆきさん）
export function DistrictPicker({
  selected,
  target,
  districts,
  onChange,
}: {
  selected: DistrictData;
  target: DistrictId;
  districts: readonly DistrictData[];
  onChange: (target: DistrictId) => void;
}) {
  return (
    <div className="sticky top-0 z-10 grid grid-cols-2 overflow-hidden rounded-card border border-line bg-surface shadow-card lg:hidden">
      <div className="flex flex-col items-center justify-center gap-0.5 bg-primary-soft px-2 py-2">
        <span className="text-xs font-bold text-primary">選んだ地区</span>
        <span className="text-2xl font-extrabold">{selected.name}</span>
      </div>
      <label className="flex flex-col items-center gap-0.5 border-l border-line px-2 py-2">
        <span className="text-xs text-ink-muted">比べる地区</span>
        <span className="relative w-full max-w-[9rem]">
          <select
            value={target}
            onChange={(event) => onChange(event.target.value as DistrictId)}
            className="min-h-tap w-full appearance-none rounded-button border border-ink bg-surface pl-2 pr-7 text-center text-base font-extrabold min-[360px]:text-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {districts
              .filter((district) => district.id !== selected.id)
              .map((district) => (
                <option key={district.id} value={district.id}>
                  {district.name}
                </option>
              ))}
          </select>
          <KurabeIcon name="chevron" className="pointer-events-none absolute right-2 top-1/2 size-5 -translate-y-1/2" />
        </span>
        <span className="text-xs text-ink-muted">タップして変更</span>
      </label>
    </div>
  );
}

// 項目名を横幅いっぱいに出し、その下で数字を左右に読みくらべる
export function RowPair({ row, left, right }: { row: CompareRow; left: DistrictData; right: DistrictData }) {
  return (
    <section aria-label={row.label} className="flex flex-col pt-1 first:pt-0">
      <h3 className="rounded-md bg-kinari-deep px-2 py-1 font-bold">
        {row.label}
        {row.unit && <span className="ml-2 text-sm font-normal">{row.unit}</span>}
      </h3>
      <dl className="grid grid-cols-2">
        {[left, right].map((district) => (
          <div key={district.id} className={`min-w-0 px-1.5 py-2 ${district.id === left.id ? "bg-primary-soft" : "border-l border-line"}`}>
            <dt className="sr-only">{district.name}</dt>
            <dd>{row.cell(district, "pair")}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
