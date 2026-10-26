import { describe, expect, it } from "vitest";
import { createTownResolver } from "../town-district/resolve";
import { buildPublicFacilitiesCreditText, buildPublicFacilitiesSql, buildPublicFacilityRows } from "./public-facilities";

const resolveTown = createTownResolver([
  { townName: "大久保町", cityDistrict: "中心市街地", districtId: "chushin" },
  { townName: "上郷飯沼", cityDistrict: "上郷", districtId: "kamisato" },
  { townName: "川路", cityDistrict: "川路", districtId: null },
]);
const noTowns = new Map<string, { townName: string }>();

const HEADER =
  "全国地方公共団体コード,ID,名称,名称_通称,POIコード,所在地_全国地方公共団体コード,所在地_連結表記,所在地_町字,緯度,経度,利用可能曜日,開始時間,終了時間,利用可能時間特記事項,説明,URL";
const line = (cells: Record<string, string>) => {
  const base: Record<string, string> = {
    全国地方公共団体コード: "202053",
    ID: "AA2020530001",
    名称: "飯田市役所",
    名称_通称: "",
    POIコード: "1302",
    所在地_全国地方公共団体コード: "202053",
    所在地_連結表記: "長野県飯田市大久保町2534",
    所在地_町字: "大久保町",
    緯度: "35.514934",
    経度: "137.821511",
    利用可能曜日: "日月火水木金土",
    開始時間: "08:30",
    終了時間: "22:00",
    利用可能時間特記事項: "窓口業務は原則平日17：15まで",
    説明: "",
    URL: "https://www.city.iida.lg.jp/",
    ...cells,
  };
  return HEADER.split(",").map((key) => base[key]).join(",");
};
const csv = (...lines: string[]) => [HEADER, ...lines].join("\r\n");
const subkindsOf = (...lines: string[]) => buildPublicFacilityRows(csv(...lines), resolveTown, noTowns).rows.map((row) => row.subkind);

describe("buildPublicFacilityRows", () => {
  it("施設を地区に振り分け、種類と利用できる時間などを入れる。4地区の外は地区なしで入れる", () => {
    const result = buildPublicFacilityRows(
      csv(line({}), line({ ID: "AA2020530002", 名称: "川路自治振興センター", POIコード: "1399", 所在地_町字: "川路", 所在地_連結表記: "長野県飯田市川路4800" })),
      resolveTown,
      noTowns,
    );
    expect(result).toMatchObject({ unmappedTowns: [], missingCoordinates: [], excluded: 0 });
    expect(result.rows).toEqual([
      {
        kind: "public_facility",
        subkind: "市役所・支所",
        name: "飯田市役所",
        address: "長野県飯田市大久保町2534",
        townName: "大久保町",
        districtId: "chushin",
        lat: 35.514934,
        lon: 137.821511,
        sourceKey: "AA2020530001",
        attributes: {
          poi_code: "1302",
          days: "日月火水木金土",
          opens: "08:30",
          closes: "22:00",
          hours_note: "窓口業務は原則平日17：15まで",
          url: "https://www.city.iida.lg.jp/",
        },
      },
      expect.objectContaining({ name: "川路自治振興センター", subkind: "市役所・支所", districtId: null }),
    ]);
  });

  it("POI コードで種類を分ける。先頭の0が落ちたコードも読み、11xx は宿泊研修の施設のほかは運動施設にする", () => {
    expect(
      subkindsOf(
        line({ POIコード: "801", 名称: "飯田市美術博物館" }),
        line({ POIコード: "1003", 名称: "今宮公園" }),
        line({ POIコード: "1110", 名称: "上郷体育館" }),
        line({ POIコード: "1199", 名称: "マレットゴルフ場" }),
        line({ POIコード: "1125", 名称: "大平宿泊訓練施設" }),
        line({ POIコード: "1512", 名称: "飯田市立上郷図書館" }),
        line({ POIコード: "1602", 名称: "飯田市立高松診療所" }),
      ),
    ).toEqual(["文化施設", "公園", "運動施設", "運動施設", "学習・交流施設", "図書館", "病院・診療所"]);
  });

  it("市営住宅・給食の調理場・斎苑・最終処分場・市の課や係の窓口は入れない", () => {
    const result = buildPublicFacilityRows(
      csv(
        line({ POIコード: "0403", 名称: "飯沼市営住宅55棟" }),
        line({ POIコード: "1599", 名称: "丸山共同調理場" }),
        line({ POIコード: "1599", 名称: "南信濃給食センター" }),
        line({ POIコード: "1599", 名称: "飯田人形劇場" }),
        line({ POIコード: "2009", 名称: "飯田市斎苑" }),
        line({ POIコード: "2004", 名称: "飯田市最終処分場" }),
        line({ POIコード: "1399", 名称: "産業経済部農業課" }),
        line({ POIコード: "1399", 名称: "農業委員会事務局" }),
        line({ POIコード: "1399", 名称: "虎岩交流センター" }),
      ),
      resolveTown,
      noTowns,
    );
    expect(result.excluded).toBe(7);
    expect(result.rows.map((row) => [row.name, row.subkind])).toEqual([
      ["飯田人形劇場", "文化施設"],
      ["虎岩交流センター", "学習・交流施設"],
    ]);
  });

  it("載せるか決まっていない POI コードや名前が来たら止める", () => {
    expect(() => subkindsOf(line({ POIコード: "9999", 名称: "新しい施設" }))).toThrow(/POI コード 9999（新しい施設）を載せるか決まっていない/);
    expect(() => subkindsOf(line({ POIコード: "1399", 名称: "新しい窓口" }))).toThrow(/1399 の「新しい窓口」/);
  });

  it("町字が空の行は、緯度経度から引いた町名で振り分ける。まだ引いていない位置は返す。連結表記が空なら住所は null にする", () => {
    const record = line({ 名称: "三穂マレットゴルフ場", POIコード: "1199", 所在地_町字: "", 所在地_連結表記: "", 緯度: "35.440638", 経度: "137.803450" });
    expect(buildPublicFacilityRows(csv(record), resolveTown, noTowns)).toMatchObject({ rows: [], missingCoordinates: ["35.440638,137.80345"] });
    const towns = new Map([["35.440638,137.80345", { townName: "川路" }]]);
    expect(buildPublicFacilityRows(csv(record), resolveTown, towns).rows[0]).toMatchObject({ townName: "川路", districtId: null, address: null });
  });

  it("対応表にない町名は集めて返す。飯田市以外の施設や、緯度経度のない施設があれば止める", () => {
    expect(buildPublicFacilityRows(csv(line({ 所在地_町字: "水の手町" })), resolveTown, noTowns).unmappedTowns).toEqual(["水の手町"]);
    expect(() => subkindsOf(line({ 所在地_全国地方公共団体コード: "204072" }))).toThrow(/飯田市の施設になっていない/);
    expect(() => subkindsOf(line({ 緯度: "" }))).toThrow(/緯度経度が読めない/);
  });
});

describe("buildPublicFacilitiesSql", () => {
  it("市の記載例どおりのクレジットと、更新日・確認日を入れ、施設を入れ直す", () => {
    const { rows } = buildPublicFacilityRows(csv(line({ 名称: "O'Park", POIコード: "1003" })), resolveTown, noTowns);
    const sql = buildPublicFacilitiesSql({ rows, csvUrl: "https://www.city.iida.lg.jp/uploaded/attachment/76250.csv", updatedOn: "2025-06-23", usedOn: "2026-10-26" });
    expect(sql).toContain("「公共施設一覧」の公共施設を、市の CSV にそろえる");
    expect(sql).toContain("npm run public-facilities:sql");
    expect(sql).toContain("period_label = '2025年6月23日更新'");
    expect(sql).toContain("delete from public.facilities where source_id = 'iida_public_facilities';");
    expect(sql).toContain("('public_facility'::public.facility_kind, '公園', 'O''Park'");
    expect(buildPublicFacilitiesCreditText("2026-10-26")).toBe(
      "出典：飯田市（https://www.city.iida.lg.jp/soshiki/168/opendata.html）、PDL1.0（https://www.digital.go.jp/resources/open_data/public_data_license_v1.0）（2026年10月26日に利用）。" +
        "「公共施設一覧」（飯田市）（https://www.city.iida.lg.jp/soshiki/168/opendata.html）を加工して作成（暮らしに関係する施設を選び、種類を分けた）",
    );
  });

  it("施設が0件なら SQL を作らない", () => {
    expect(() => buildPublicFacilitiesSql({ rows: [], csvUrl: "x", updatedOn: null, usedOn: "2026-10-26" })).toThrow(/公共施設が0件/);
  });
});
