import { Card } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import type { DistrictData } from "@/lib/data/screen-data";
import type { DistrictId } from "@/lib/town-district/resolve";
import { COMPARE_SECTIONS } from "./rows";

type LayoutProps = { districts: readonly DistrictData[]; selected: DistrictId | null };

// 選んだ地区だけ目印を付ける。「おすすめ」に見えないよう、色は控えめにして文字で「選んだ地区」と書く
function SelectedMark() {
  return <span className="rounded-full border border-primary px-2 py-0.5 text-xs font-bold text-primary">選んだ地区</span>;
}

function RowLabel({ label, note }: { label: string; note?: string }) {
  return (
    <>
      {label}
      {note && <span className="block text-xs font-normal text-ink-muted">{note}</span>}
    </>
  );
}

// スマホ（lg 未満）：項目ごとに4地区を縦に並べる。375px でも横にはみ出さず、同じ項目の値を上下で見くらべられる。
// 数字1つだけの行は 2×2 に詰める
export function CompareBySection({ districts, selected }: LayoutProps) {
  return (
    <div className="flex flex-col gap-4 lg:hidden">
      {COMPARE_SECTIONS.map((section) => (
        <Card as="section" key={section.id} aria-labelledby={`kurabe-${section.id}`} className="flex flex-col gap-4">
          <h2 id={`kurabe-${section.id}`} className="text-lg font-bold">
            {section.title}
          </h2>
          {section.rows.map((row) => (
            <section key={row.id} aria-label={row.label} className="flex flex-col gap-2">
              <h3 className="font-bold">
                <RowLabel label={row.label} note={row.note} />
              </h3>
              <dl
                className={
                  row.short
                    ? "grid grid-cols-2 gap-px overflow-hidden rounded-button border border-line bg-line"
                    : "flex flex-col divide-y divide-line rounded-button border border-line"
                }
              >
                {districts.map((district) => (
                  <div
                    key={district.id}
                    className={`${row.short ? "flex flex-col gap-1" : "grid grid-cols-[6.5rem_minmax(0,1fr)] items-start gap-2"} px-3 py-2 ${district.id === selected ? "bg-primary-soft" : "bg-surface"}`}
                  >
                    <dt className={`flex items-start gap-1 text-sm font-bold ${row.short ? "flex-wrap items-center" : "flex-col"}`}>
                      {district.name}
                      {district.id === selected && <SelectedMark />}
                    </dt>
                    <dd className="min-w-0">{row.cell(district)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
          {section.notice && <Notice>{section.notice}</Notice>}
        </Card>
      ))}
    </div>
  );
}

// PC（lg 以上）：項目を行、地区を列にした表。地区の並びは固定
export function CompareTable({ districts, selected }: LayoutProps) {
  const cellClass = (id: DistrictId) => `px-3 py-3 align-top ${id === selected ? "bg-primary-soft" : ""}`;
  const notices = COMPARE_SECTIONS.flatMap((section) => (section.notice ? [section.notice] : []));
  return (
    <div className="hidden flex-col gap-3 lg:flex">
      <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-card">
        <table className="w-full table-fixed border-collapse text-left">
          <caption className="sr-only">4地区を同じ項目で並べた表</caption>
          <colgroup>
            <col className="w-48" />
            {districts.map((district) => (
              <col key={district.id} />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b-2 border-line">
              <th scope="col" className="px-3 py-3 text-sm text-ink-muted">
                項目
              </th>
              {districts.map((district) => (
                <th key={district.id} scope="col" className={`${cellClass(district.id)} text-lg`}>
                  <span className="flex flex-wrap items-center gap-2">
                    {district.name}
                    {district.id === selected && <SelectedMark />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          {COMPARE_SECTIONS.map((section) => (
            <tbody key={section.id} className="border-b border-line">
              <tr className="bg-kinari-deep">
                <th scope="colgroup" colSpan={districts.length + 1} className="px-3 py-2 font-bold">
                  {section.title}
                </th>
              </tr>
              {section.rows.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <th scope="row" className="px-3 py-3 align-top text-sm font-bold">
                    <RowLabel label={row.label} note={row.note} />
                  </th>
                  {districts.map((district) => (
                    <td key={district.id} className={cellClass(district.id)}>
                      {row.cell(district)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
      <div className="flex flex-col gap-1">
        {notices.map((notice) => (
          <Notice key={notice}>{notice}</Notice>
        ))}
      </div>
    </div>
  );
}
