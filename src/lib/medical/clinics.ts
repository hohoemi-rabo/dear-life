// 地区の診療所（クリニック）の数（037）。npm run clinics:sql から使う。
// 厚生労働省「医療情報ネット（ナビイ）」のオープンデータ（診療所の施設票）から飯田市の診療所を取り、住所で4地区に振り分けて数える。
// はじめは Google マップで数えた目安を出す予定だったが、地図の情報を写して使うことを利用規約が制限しているため、
// 国のオープンデータ（公共データ利用規約 PDL1.0）で数えることにした（2026-11-11 まさゆきさん）。
// 健診の施設と、施設に住む人のための診療所は、ふだんの通院先ではないので除く（data/clinic_exclusions.csv。同日まさゆきさん）。
// 休日夜間急患診療所や病院の附属の診療所は、だれでもかかれるので数える
import { parseCsv } from "../gtfs/csv.ts";
import { sqlLiteral } from "../sql.ts";
import { TARGET_DISTRICT_IDS } from "../town-district/csv.ts";
import { townNameForRecord, type DistrictId, type TownMapEntry } from "../town-district/resolve.ts";

// 新しい時点のファイルが出たら差しかえる（年2回、6月1日・12月1日時点。一覧は CLINIC_PAGE_URL）
export const CLINIC_AS_OF = "2026-06-01";
export const CLINIC_DOWNLOAD_URL = "https://www.mhlw.go.jp/content/11121000/02-1_clinic_facility_info_20260601.csv.zip";
export const CLINIC_PAGE_URL = "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/iryou/newpage_43373.html";
export const CLINIC_SOURCE_ID = "mhlw_medical_clinics";

const IIDA = { prefecture: "20", city: "205" } as const;

export type ClinicExclusion = { id: string; name: string; reason: string };

const EXCLUSIONS_HEADER = ["ID", "正式名称", "理由"];

export function parseClinicExclusionsCsv(text: string): ClinicExclusion[] {
  const firstLine = text.replace(/^﻿/, "").split(/\r?\n/, 1)[0];
  if (firstLine !== EXCLUSIONS_HEADER.join(",")) throw new Error(`除く診療所の見出しが ${EXCLUSIONS_HEADER.join(",")} ではありません: ${firstLine}`);
  return parseCsv(text).map((record, index) => {
    const at = `clinic_exclusions.csv ${index + 2}行目`;
    const [id, name, reason] = [record["ID"], record["正式名称"], record["理由"]];
    if (!id || !name || !reason) throw new Error(`${at}：ID・正式名称・理由が必要`);
    return { id, name, reason };
  });
}

export type DistrictClinicCount = { districtId: DistrictId; clinicCount: number; excludedCount: number; clinics: string[] };

export function countClinicsByDistrict(
  csvText: string,
  resolveTown: (address: string) => TownMapEntry | null,
  exclusions: readonly ClinicExclusion[],
): { counts: DistrictClinicCount[]; unmappedTowns: string[] } {
  const records = parseCsv(csvText).filter((record) => record["都道府県コード"] === IIDA.prefecture && record["市区町村コード"] === IIDA.city);
  if (records.length === 0) throw new Error("飯田市の診療所が1件もない（列の名前か市区町村コードが変わった？）");
  const excluded = new Map(exclusions.map((exclusion) => [exclusion.id, exclusion]));
  for (const exclusion of exclusions) {
    const record = records.find((item) => item["ID"] === exclusion.id);
    // 閉じた・名前が変わったときに気づけるよう、除く一覧と国の一覧が合わなければ止める
    if (!record) throw new Error(`除く診療所 ${exclusion.name}（${exclusion.id}）が国の一覧にない。clinic_exclusions.csv を見直す`);
    if (record["正式名称"] !== exclusion.name) throw new Error(`除く診療所 ${exclusion.id} の名前が「${record["正式名称"]}」に変わった。clinic_exclusions.csv を見直す`);
  }

  const counts = new Map<DistrictId, DistrictClinicCount>(
    Object.values(TARGET_DISTRICT_IDS).map((districtId) => [districtId, { districtId, clinicCount: 0, excludedCount: 0, clinics: [] }]),
  );
  const unmappedTowns = new Set<string>();
  for (const record of records) {
    const address = record["所在地"];
    const entry = resolveTown(address);
    if (entry === null) {
      unmappedTowns.add(townNameForRecord(address));
      continue;
    }
    if (entry.districtId === null) continue;
    const count = counts.get(entry.districtId)!;
    if (excluded.has(record["ID"])) {
      count.excludedCount += 1;
    } else {
      count.clinicCount += 1;
      count.clinics.push(record["正式名称"]);
    }
  }
  return { counts: [...counts.values()], unmappedTowns: [...unmappedTowns] };
}

// 公共データ利用規約（PDL1.0）の出典の書き方：出典と、加工したこと
export function buildClinicCreditText(): string {
  return (
    `出典：厚生労働省「医療情報ネット（ナビイ）」オープンデータ（診療所の施設票）（${CLINIC_PAGE_URL}）を加工して作成` +
    "（飯田市の診療所を住所で地区ごとに数え、健診の施設と、施設に住む人のための診療所を除いた）"
  );
}

function periodLabel(asOf: string): string {
  const [year, month, day] = asOf.split("-").map(Number);
  return `${year}年${month}月${day}日時点`;
}

// 出典と4地区の数を、この取り込みの中身にそろえる SQL。何度当てても同じ結果になる
export function buildClinicSql(counts: readonly DistrictClinicCount[], checkedOn: string): string {
  if (counts.length !== Object.keys(TARGET_DISTRICT_IDS).length) throw new Error("4地区そろっていない");
  const source = sqlLiteral(CLINIC_SOURCE_ID);
  const lines = counts.map((c) => `--   ${c.districtId}（${c.clinicCount}か所）：${c.clinics.join("、")}`).join("\n");
  const values = counts
    .map((c) => `  (${[sqlLiteral(c.districtId), `${sqlLiteral(CLINIC_AS_OF)}::date`, c.clinicCount, c.excludedCount, source].join(", ")})`)
    .join(",\n");
  return `-- 037 地区の診療所（クリニック）の数を入れる。
-- このファイルは npm run clinics:sql で作る。手で編集しない（手順は docs/037_errand-places-by-district.md）
-- 表：${CLINIC_DOWNLOAD_URL}
-- 数えた診療所（除いたものは data/clinic_exclusions.csv）：
${lines}

update public.data_sources set
  credit_text = ${sqlLiteral(buildClinicCreditText())},
  period_label = ${sqlLiteral(periodLabel(CLINIC_AS_OF))},
  checked_on = ${sqlLiteral(checkedOn)}::date
where id = ${source};

delete from public.clinic_counts where source_id = ${source};
insert into public.clinic_counts (district_id, as_of, clinic_count, excluded_count, source_id) values
${values};
`;
}
