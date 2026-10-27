import { DataStateMessage } from "@/components/data/DataStateMessage";
import { Notice } from "@/components/ui/Notice";
import { SourceNote } from "@/components/ui/SourceNote";
import type { DistrictData, SupportProgram } from "@/lib/data/screen-data";
import { formatJaDate } from "@/lib/format";
import { ageShares, HAZARD_LABELS } from "@/lib/karte/facilities";
import { NOTICES } from "@/lib/notices";
import { CountValue, DataSection, FacilityList } from "./parts";

// 子育て・学校（要件 7.2・009）。学区は学校名を並べ、入学前に市で確認するよう添える。
// 保育施設と放課後児童クラブは数を分けて出す
export function ChildcareCard({ district }: { district: DistrictData }) {
  return (
    <div className="flex flex-col gap-4">
      <DataSection title="主な小学校区" state={district.elementarySchoolDistricts}>
        {(names) => <p className="font-bold">{names.join("・")}</p>}
      </DataSection>
      <DataSection title="主な中学校区" state={district.juniorHighSchoolDistricts}>
        {(names) => <p className="font-bold">{names.join("・")}</p>}
      </DataSection>
      <Notice>{NOTICES.schoolDistrict}</Notice>
      <DataSection title="学校" state={district.schools}>
        {(schools) => <FacilityList facilities={schools} label="学校" />}
      </DataSection>
      <DataSection title="保育園・幼稚園等" state={district.childcare}>
        {(childcare) => <FacilityList facilities={childcare} label="保育園・幼稚園等" />}
      </DataSection>
      <DataSection title="放課後児童クラブ" state={district.afterSchoolClubs}>
        {(clubs) => <FacilityList facilities={clubs} label="放課後児童クラブ" />}
      </DataSection>
    </div>
  );
}

// 防災：市の指定緊急避難場所の数と一覧。使える災害の種類を添える
export function DisasterCard({ district }: { district: DistrictData }) {
  return (
    <DataSection title="指定緊急避難場所" state={district.evacuationSites}>
      {(sites) => (
        <FacilityList
          facilities={sites}
          label="避難場所"
          extra={(site) =>
            site.hazards.length > 0 && (
              <span className="mt-0.5 block text-xs text-ink-muted">
                {site.hazards.map((hazard) => HAZARD_LABELS[hazard]).join("・")}
              </span>
            )
          }
        />
      )}
    </DataSection>
  );
}

// 人口：国勢調査の小地域集計を地区に合計したもの（011）。対象時点は出典の対象に出る
export function PopulationCard({ district }: { district: DistrictData }) {
  return (
    <DataSection title="地区の人口" state={district.population} period={(population) => `${formatJaDate(population.asOf)}時点`}>
      {(population) => (
        <>
          <CountValue count={population.total} unit="人" />
          <table className="w-full text-left text-sm">
            <caption className="sr-only">年齢3区分の人数と割合</caption>
            <tbody className="divide-y divide-line">
              {ageShares(population).map((share) => (
                <tr key={share.label}>
                  <th scope="row" className="py-1.5 font-normal text-ink-muted">
                    {share.label}
                  </th>
                  <td className="py-1.5 text-right font-bold tabular-nums">{share.count.toLocaleString("ja-JP")}人</td>
                  <td className="py-1.5 text-right tabular-nums">{share.percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </DataSection>
  );
}

// 公共施設（2026-10-27 決定）：市「公共施設一覧」のうち暮らしに関係する種類（009）を、種類ごとに
export function PublicFacilitiesCard({ district }: { district: DistrictData }) {
  return (
    <DataSection title="公共施設" state={district.publicFacilities}>
      {(facilities) => <FacilityList facilities={facilities} label="公共施設" />}
    </DataSection>
  );
}

// 支援制度：制度名・概要・公式リンク。「対象になります」とは判定せず、公式ページと窓口へつなぐ（要件 7.2）
export function SupportCard({ programs }: { programs: readonly SupportProgram[] }) {
  if (programs.length === 0) return <DataStateMessage state={{ status: "unavailable" }} />;
  return (
    <div className="flex flex-col gap-3">
      <Notice>{NOTICES.support}</Notice>
      <ul className="flex flex-col divide-y divide-line">
        {programs.map((program) => (
          <li key={program.name} className="flex flex-col items-start gap-1 py-3">
            <span className="rounded-full bg-kinari-deep px-2 py-0.5 text-xs font-bold">{program.category}</span>
            <a
              href={program.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-tap items-center gap-1 font-bold text-primary underline underline-offset-4 hover:no-underline"
            >
              {program.name}
              <span className="sr-only">（飯田市の公式ページが新しいタブで開きます）</span>
              <span aria-hidden="true">↗</span>
            </a>
            <p className="text-sm">{program.summary}</p>
            <SourceNote source="飯田市公式サイト（制度のページ）" period="確認日の時点の内容" date={program.checkedOn} />
          </li>
        ))}
      </ul>
    </div>
  );
}
