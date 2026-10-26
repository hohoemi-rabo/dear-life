// 飯田市オープンデータ「公共施設一覧」の取り込み（009）。npm run public-facilities:sql から使う。
// 暮らしに関係する種類だけを facilities に入れる（市全体。4地区の外は地区なし）。
// 載せる種類は 2026-10-26 にまさゆきさんと決めた：手続き・学びの場、医療・福祉、公園・運動施設、文化施設。
// 市営住宅・給食の調理場・斎苑・最終処分場・市の課や係の窓口は入れない
import { parseCsv, type CsvRecord } from "../gtfs/csv.ts";
import { coordinateKey } from "../gtfs/import.ts";
import { townNameForRecord, type DistrictId, type TownMapEntry } from "../town-district/resolve.ts";
import { IIDA_LG_CODE, buildCityCreditText, buildCityFacilitiesSql, type CityFacilitiesSqlInput } from "./open-data.ts";

export const PUBLIC_FACILITIES_SOURCE_ID = "iida_public_facilities";
export const PUBLIC_FACILITIES_DATASET_NAME = "公共施設一覧";

// POI コード（4桁。CSV では先頭の0が落ちていることがある）→ 画面で使う種類。null は入れない種類。
// 名前で分ける必要のあるコードは subkindOf で扱う。ここにないコードが来たら止める（載せるかを決め直すため）
const SUBKIND_BY_POI_CODE: Record<string, string | null> = {
  "0403": null, // 市営住宅
  "0801": "文化施設",
  "0802": "文化施設",
  "0803": "文化施設",
  "0804": "文化施設",
  "0901": "温泉・観光",
  "1001": "温泉・観光",
  "1003": "公園",
  "1016": "文化施設",
  "1099": "公園",
  // 11xx の中で、宿泊研修の施設（大平宿泊訓練施設）だけは運動施設にしない
  "1125": "学習・交流施設",
  "1302": "市役所・支所",
  "1307": "公民館",
  "1499": "福祉施設",
  "1511": "学習・交流施設",
  "1512": "図書館",
  "1514": "学習・交流施設",
  "1601": "病院・診療所",
  "1602": "病院・診療所",
  "1603": "病院・診療所",
  "2004": null, // 最終処分場
  "2009": null, // 斎苑
  "2201": "学習・交流施設",
  "2399": "学習・交流施設",
};
// 11xx はスポーツ施設（体育館・運動場・プール・テニスコート・弓道場・マレットゴルフ場など）
const SPORTS_POI_CODE = /^11\d\d$/;

function subkindOf(record: CsvRecord): string | null {
  const code = record["POIコード"].trim().padStart(4, "0");
  const name = record["名称"];
  if (code in SUBKIND_BY_POI_CODE) return SUBKIND_BY_POI_CODE[code];
  if (SPORTS_POI_CODE.test(code)) return "運動施設";
  // 1399 は「その他の公共施設」で、庁舎・支所と、市の課や係の窓口と、交流施設が混ざっている
  if (code === "1399") {
    if (/^産業経済部|事務局$/.test(name)) return null;
    if (/市役所|自治振興センター|上下水道局|消費生活センター/.test(name)) return "市役所・支所";
    if (/交流/.test(name)) return "学習・交流施設";
    throw new Error(`POI コード 1399 の「${name}」を載せるか決まっていない`);
  }
  // 1599 は「その他の文化施設」で、給食の調理場と人形劇の施設が混ざっている
  if (code === "1599") return /調理場|給食センター/.test(name) ? null : "文化施設";
  throw new Error(`POI コード ${code}（${name}）を載せるか決まっていない`);
}

export type PublicFacilityRow = {
  kind: "public_facility";
  subkind: string;
  name: string;
  // 市の CSV で連結表記が空の施設（マレットゴルフ場など）は null
  address: string | null;
  townName: string;
  // 4地区の外は null
  districtId: DistrictId | null;
  lat: number;
  lon: number;
  sourceKey: string;
  attributes: {
    poi_code: string;
    nickname?: string;
    days?: string;
    opens?: string;
    closes?: string;
    hours_note?: string;
    description?: string;
    url?: string;
  };
};

function present(value: string | undefined): string | undefined {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? undefined : trimmed;
}

function coordinate(value: string | undefined, label: string): number {
  const number = Number(value);
  if (!value || !Number.isFinite(number)) throw new Error(`${label} の緯度経度が読めない`);
  return number;
}

// CSV を施設の行にする。町字が空の行は緯度経度から町名を引く（coordinateTowns。逆ジオコーダの結果をためたもの）。
// まだ町名にしていない位置は missingCoordinates に、対応表にない町名は unmappedTowns に入れる（呼び出し側で引くか止める）
export function buildPublicFacilityRows(
  csvText: string,
  resolveTown: (address: string) => TownMapEntry | null,
  coordinateTowns: ReadonlyMap<string, { townName: string }>,
): { rows: PublicFacilityRow[]; unmappedTowns: string[]; missingCoordinates: string[]; excluded: number } {
  const rows: PublicFacilityRow[] = [];
  const unmappedTowns = new Set<string>();
  const missingCoordinates = new Set<string>();
  let excluded = 0;
  for (const record of parseCsv(csvText)) {
    const name = record["名称"].trim();
    if (record["所在地_全国地方公共団体コード"] !== IIDA_LG_CODE) throw new Error(`${name} が飯田市の施設になっていない`);
    const subkind = subkindOf(record);
    if (subkind === null) {
      excluded += 1;
      continue;
    }
    const lat = coordinate(record["緯度"], name);
    const lon = coordinate(record["経度"], name);
    let town = present(record["所在地_町字"]);
    if (town === undefined) {
      const key = coordinateKey(lat, lon);
      town = coordinateTowns.get(key)?.townName;
      if (town === undefined) {
        missingCoordinates.add(key);
        continue;
      }
    }
    const entry = resolveTown(town);
    if (entry === null) {
      unmappedTowns.add(townNameForRecord(town));
      continue;
    }

    rows.push({
      kind: "public_facility",
      subkind,
      name,
      address: present(record["所在地_連結表記"]) ?? null,
      townName: townNameForRecord(town),
      districtId: entry.districtId,
      lat,
      lon,
      sourceKey: record["ID"],
      attributes: Object.fromEntries(
        Object.entries({
          poi_code: record["POIコード"].trim().padStart(4, "0"),
          nickname: present(record["名称_通称"]),
          days: present(record["利用可能曜日"]),
          opens: present(record["開始時間"]),
          closes: present(record["終了時間"]),
          hours_note: present(record["利用可能時間特記事項"]),
          description: present(record["説明"]),
          url: present(record["URL"]),
        }).filter(([, value]) => value !== undefined),
      ) as PublicFacilityRow["attributes"],
    });
  }
  return { rows, unmappedTowns: [...unmappedTowns], missingCoordinates: [...missingCoordinates], excluded };
}

export function buildPublicFacilitiesCreditText(usedOn: string): string {
  return buildCityCreditText(PUBLIC_FACILITIES_DATASET_NAME, usedOn, "暮らしに関係する施設を選び、種類を分けた");
}

export type PublicFacilitiesSqlInput = Pick<CityFacilitiesSqlInput<PublicFacilityRow>, "rows" | "csvUrl" | "updatedOn" | "usedOn">;

export function buildPublicFacilitiesSql(input: PublicFacilitiesSqlInput): string {
  return buildCityFacilitiesSql({
    sourceId: PUBLIC_FACILITIES_SOURCE_ID,
    datasetName: PUBLIC_FACILITIES_DATASET_NAME,
    noun: "公共施設",
    command: "public-facilities:sql",
    creditText: buildPublicFacilitiesCreditText(input.usedOn),
    kindOf: (row) => row.kind,
    ...input,
  });
}
