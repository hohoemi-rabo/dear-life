// data/iida_district_map.csv（町名,地区,確度,メモ）を読み、town_district_map に入れる SQL を作る。
// CSV が唯一の情報源で、SQL は scripts/build-town-district-map-sql.mjs が作る（手で書かない）。
// Node から直接読み込むので、相対パスの import は型だけにする
import type { DistrictId, TownMapEntry } from "./resolve";
import { sqlLiteral } from "../sql.ts";

export type ChushinArea = "丸山" | "東野" | "橋北" | "橋南";

export type TownMapRow = TownMapEntry & {
  chushinArea: ChushinArea | null;
  certainty: string;
  note: string | null;
};

const HEADER = ["町名", "地区", "確度", "メモ"];

// 地区名 → districts.id。ここにない地区は対象外
export const TARGET_DISTRICT_IDS: Readonly<Record<string, DistrictId>> = {
  上郷: "kamisato",
  鼎: "kanae",
  伊賀良: "igara",
  中心市街地: "chushin",
};

const CHUSHIN_AREAS: readonly ChushinArea[] = ["丸山", "東野", "橋北", "橋南"];

// メモ欄が「東野」「橋北エリア」のように元の地区名1つだけのときに取り出す。
// 「丸山・東野・橋北にまたがってる…」のように決められないものは null
function chushinAreaFromNote(note: string | null): ChushinArea | null {
  const name = note?.replace(/エリア$/, "");
  return CHUSHIN_AREAS.find((area) => area === name) ?? null;
}

// 対応表の値にカンマや引用符は出てこないので、単純に区切る。出てきたら黙って読み違えないよう止める
export function parseTownMapCsv(text: string): TownMapRow[] {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((line) => line.trim() !== "");
  const [header, ...body] = lines;
  if (header !== HEADER.join(",")) {
    throw new Error(`対応表の見出しが ${HEADER.join(",")} ではありません: ${header}`);
  }

  const seen = new Set<string>();
  return body.map((line, i) => {
    const lineNo = i + 2;
    if (line.includes('"')) throw new Error(`${lineNo}行目：引用符には対応していません: ${line}`);
    const cells = line.split(",").map((cell) => cell.trim());
    if (cells.length !== HEADER.length) {
      throw new Error(`${lineNo}行目：列の数が ${HEADER.length} ではありません: ${line}`);
    }
    const [townName, cityDistrict, certainty, rawNote] = cells;
    if (!townName || !cityDistrict || !certainty) {
      throw new Error(`${lineNo}行目：町名・地区・確度は必須です: ${line}`);
    }
    if (seen.has(townName)) throw new Error(`${lineNo}行目：町名「${townName}」が重複しています`);
    seen.add(townName);

    const districtId = TARGET_DISTRICT_IDS[cityDistrict] ?? null;
    const note = rawNote || null;
    return {
      townName,
      cityDistrict,
      districtId,
      chushinArea: districtId === "chushin" ? chushinAreaFromNote(note) : null,
      certainty,
      note,
    };
  });
}

// 対応表を CSV と同じ中身にそろえる SQL。何度当てても同じ結果になる。
// 変わっていない行は更新しない（updated_at で「いつ変えたか」がわかるようにする）
export function buildTownMapSql(rows: readonly TownMapRow[]): string {
  const values = rows
    .map((row) =>
      [
        sqlLiteral(row.townName),
        sqlLiteral(row.cityDistrict),
        sqlLiteral(row.districtId),
        row.chushinArea === null ? "null" : `${sqlLiteral(row.chushinArea)}::public.chushin_area`,
        sqlLiteral(row.certainty),
        sqlLiteral(row.note),
      ].join(", "),
    )
    .map((tuple) => `  (${tuple})`)
    .join(",\n");
  const townNames = rows.map((row) => sqlLiteral(row.townName)).join(", ");

  return `-- 004 町名→地区の対応表を data/iida_district_map.csv にそろえる。
-- このファイルは npm run town-map:sql で作る。手で編集しない（手順は docs/004_district-master.md）

insert into public.town_district_map (town_name, city_district, district_id, chushin_area, certainty, note) values
${values}
on conflict (town_name) do update set
  city_district = excluded.city_district,
  district_id = excluded.district_id,
  chushin_area = excluded.chushin_area,
  certainty = excluded.certainty,
  note = excluded.note
where (town_district_map.city_district, town_district_map.district_id, town_district_map.chushin_area,
       town_district_map.certainty, town_district_map.note)
  is distinct from (excluded.city_district, excluded.district_id, excluded.chushin_area,
                    excluded.certainty, excluded.note);

-- CSV から消した町名は対応表からも消す
delete from public.town_district_map where town_name not in (${townNames});

-- 対応表に足した町名は、記録済みの「対応表にない町名」を反映済みにする。
-- 記録は番地より前の文字列なので、対応表の町名で始まるものを反映済みとみなす（例：鼎中平 → 鼎）
update public.unmapped_towns as u set resolved_at = now()
where u.resolved_at is null
  and exists (select 1 from public.town_district_map as m where starts_with(u.town_name, m.town_name));
`;
}
