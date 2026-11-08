// 借りて住むときの参考になる国の統計を取り込む（034）。npm run rent:sql から使う。
// - 地区の借家の世帯数：国勢調査 小地域集計の「住宅の所有の関係別一般世帯数」を、町丁・字等から4地区に合計する
// - 家賃の参考値：住宅・土地統計調査の、飯田市の民営借家の1か月あたりの家賃の平均（市全体の値。地区には分けられない）
// 不動産情報ライブラリには家賃がない（売買の取引だけ）ので、この2つで「借りる」を選んだ人に数字を出す
import { smallAreaDownloadUrl, sumByDistrict, type DistrictSum } from "../census/small-area.ts";
import { sqlLiteral } from "../sql.ts";
import type { TownMapEntry } from "../town-district/resolve.ts";

// ---- 国勢調査：住宅の所有の関係別一般世帯数 ----

// 新しい国勢調査の小地域集計が出たら差しかえる（手順は docs/034_rent-and-renters.md）
export const TENURE_CENSUS_NAME = "令和2年国勢調査 小地域集計";
export const TENURE_DOWNLOAD_URL = smallAreaDownloadUrl("T001085");
export const TENURE_AS_OF = "2020-10-01";
export const TENURE_SOURCE_ID = "estat_census_housing_tenure";

// 公営・都市再生機構・公社の借家、給与住宅、間借りの欄はなく、総数から持ち家・民営借家を引いた残りに入る
const TENURE_COLUMNS = {
  householdsInHousing: "住宅に住む一般世帯",
  ownerOccupied: "持ち家",
  privateRented: "民営借家",
} as const;

export type DistrictTenure = DistrictSum<keyof typeof TENURE_COLUMNS>;

export function buildDistrictTenures(
  csvText: string,
  townMap: readonly TownMapEntry[],
): { tenures: DistrictTenure[]; unmappedTowns: string[]; skippedTowns: string[] } {
  const { sums, unmappedTowns, skippedTowns } = sumByDistrict(csvText, townMap, TENURE_COLUMNS);
  for (const sum of sums) {
    if (sum.ownerOccupied + sum.privateRented > sum.householdsInHousing) {
      throw new Error(`${sum.districtId} の持ち家と民営借家の合計が、住宅に住む一般世帯より多い`);
    }
  }
  return { tenures: sums, unmappedTowns, skippedTowns };
}

// ---- 住宅・土地統計調査：民営借家の1か月あたりの家賃 ----

export const RENT_SURVEY_NAME = "令和5年住宅・土地統計調査 住宅及び世帯に関する基本集計";
// 表130-2「民営借家＜専用住宅＞の状況 住宅の建て方(5区分)、延べ面積(6区分)別住宅の１か月当たり家賃」（全国、都道府県、市区）
export const RENT_STATS_DATA_ID = "0004021532";
export const RENT_AS_OF = "2023-10-01";
export const RENT_SOURCE_ID = "estat_housing_land_survey_rent";
const IIDA_AREA_CODE = "20205";

export type RentBuildingType = "all" | "detached" | "apartment_wooden" | "apartment_non_wooden";

// 表の「住宅の建て方」（cat01）のうち出すもの。長屋建・その他は件数が少なく、家族が探す家の形でもないので出さない（2026-11-08）
const BUILDING_TYPE_CODES: Readonly<Record<RentBuildingType, string>> = {
  all: "0",
  detached: "1",
  apartment_wooden: "3",
  apartment_non_wooden: "4",
};
// 延べ面積（cat02）は「総数」だけ。細かく分けると推計の元になる住宅が少なくなり、値がぶれる
const FLOOR_AREA_TOTAL = "0";
// 家賃の平均（cat03）は「家賃０円を含まない」。0円の借家（親族の家など）は、これから借りる人の参考にならない（2026-11-08）
const EXCLUDING_ZERO_RENT = "2";

// e-Stat API（統計データ取得）の URL。アプリケーションID は手元の .env.local の ESTAT_APP_ID（画面にも Worker にも入れない）
export function rentApiUrl(appId: string): string {
  const params = new URLSearchParams({
    appId,
    statsDataId: RENT_STATS_DATA_ID,
    cdArea: IIDA_AREA_CODE,
    cdCat02: FLOOR_AREA_TOTAL,
    cdCat03: EXCLUDING_ZERO_RENT,
    metaGetFlg: "N",
  });
  return `https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData?${params}`;
}

export type RentAverage = { buildingType: RentBuildingType; averageRent: number };

type StatsValue = Record<string, string>;

// e-Stat API の応答から、飯田市の建て方ごとの家賃の平均を読む。
// 「-」「X」「...」（数字が得られない・伏せた値）の建て方は出さない。民営借家全体の値がなければ止める
export function parseRentAverages(response: unknown): RentAverage[] {
  const root = (response as { GET_STATS_DATA?: { RESULT?: { STATUS?: number; ERROR_MSG?: string }; STATISTICAL_DATA?: { DATA_INF?: { VALUE?: unknown } } } })
    ?.GET_STATS_DATA;
  if (root?.RESULT?.STATUS !== 0) {
    throw new Error(`e-Stat API がエラーを返した：${root?.RESULT?.ERROR_MSG ?? "応答の形が想定と違う"}`);
  }
  const raw = root.STATISTICAL_DATA?.DATA_INF?.VALUE;
  const values: StatsValue[] = Array.isArray(raw) ? raw : raw ? [raw as StatsValue] : [];

  const averages = (Object.entries(BUILDING_TYPE_CODES) as [RentBuildingType, string][]).flatMap(([buildingType, code]) => {
    const matches = values.filter(
      (value) =>
        value["@area"] === IIDA_AREA_CODE &&
        value["@cat01"] === code &&
        value["@cat02"] === FLOOR_AREA_TOTAL &&
        value["@cat03"] === EXCLUDING_ZERO_RENT,
    );
    if (matches.length > 1) throw new Error(`建て方 ${code} の値が ${matches.length} 個ある`);
    const text = matches[0]?.$;
    if (text === undefined || !/^\d+$/.test(text)) return [];
    return [{ buildingType, averageRent: Number(text) }];
  });
  if (!averages.some((average) => average.buildingType === "all")) throw new Error("飯田市の民営借家全体の家賃がない");
  return averages;
}

// ---- 出典とマイグレーション ----

// 政府標準利用規約（第2.0版）の出典の書き方：出典と、加工したこと
export function buildTenureCreditText(): string {
  return `出典：「${TENURE_CENSUS_NAME}」（総務省統計局）（政府統計の総合窓口（e-Stat） https://www.e-stat.go.jp/）を加工して作成（町丁・字等の世帯数を地区ごとに合計）`;
}

export function buildRentCreditText(): string {
  return `出典：「${RENT_SURVEY_NAME}」（総務省統計局）（政府統計の総合窓口（e-Stat） https://www.e-stat.go.jp/）を加工して作成（飯田市の民営借家の家賃の平均を抜き出し）`;
}

function periodLabel(asOf: string, surveyName: string): string {
  const [year, month, day] = asOf.split("-").map(Number);
  return `${year}年${month}月${day}日現在（${surveyName.split(" ")[0]}）`;
}

// 出典・4地区の世帯数・飯田市の家賃を、この取り込みの中身にそろえる SQL。何度当てても同じ結果になる
export function buildRentSql(tenures: readonly DistrictTenure[], rents: readonly RentAverage[], checkedOn: string): string {
  const tenureSource = sqlLiteral(TENURE_SOURCE_ID);
  const rentSource = sqlLiteral(RENT_SOURCE_ID);
  const townLines = tenures.map((t) => `--   ${t.districtId}：${t.towns.join("、")}`).join("\n");
  const tenureValues = tenures
    .map(
      (t) =>
        `  (${[sqlLiteral(t.districtId), `${sqlLiteral(TENURE_AS_OF)}::date`, t.householdsInHousing, t.ownerOccupied, t.privateRented, tenureSource].join(", ")})`,
    )
    .join(",\n");
  const rentValues = rents
    .map((r) => `  (${[sqlLiteral(r.buildingType), r.averageRent, `${sqlLiteral(RENT_AS_OF)}::date`, rentSource].join(", ")})`)
    .join(",\n");

  return `-- 034 借りて住むときの参考になる国の統計を入れる。
-- このファイルは npm run rent:sql で作る。手で編集しない（手順は docs/034_rent-and-renters.md）
-- 世帯数の表：${TENURE_DOWNLOAD_URL}
-- 家賃の表：e-Stat 統計表ID ${RENT_STATS_DATA_ID}（飯田市・延べ面積の総数・家賃0円を含まない）
-- 世帯数を合計した町丁・字等：
${townLines}

update public.data_sources set
  credit_text = ${sqlLiteral(buildTenureCreditText())},
  period_label = ${sqlLiteral(periodLabel(TENURE_AS_OF, TENURE_CENSUS_NAME))},
  checked_on = ${sqlLiteral(checkedOn)}::date
where id = ${tenureSource};

update public.data_sources set
  credit_text = ${sqlLiteral(buildRentCreditText())},
  period_label = ${sqlLiteral(periodLabel(RENT_AS_OF, RENT_SURVEY_NAME))},
  checked_on = ${sqlLiteral(checkedOn)}::date
where id = ${rentSource};

delete from public.housing_tenure where source_id = ${tenureSource};
insert into public.housing_tenure (district_id, as_of, households_in_housing, owner_occupied, private_rented, source_id) values
${tenureValues};

delete from public.rent_averages where source_id = ${rentSource};
insert into public.rent_averages (building_type, average_rent, as_of, source_id) values
${rentValues};
`;
}
