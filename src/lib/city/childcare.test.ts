import { describe, expect, it } from "vitest";
import { createTownResolver } from "../town-district/resolve";
import { buildChildcareCreditText, buildChildcareRows, buildChildcareSql } from "./childcare";

const resolveTown = createTownResolver([
  { townName: "今宮町", cityDistrict: "中心市街地", districtId: "chushin" },
  { townName: "上郷飯沼", cityDistrict: "上郷", districtId: "kamisato" },
  { townName: "座光寺", cityDistrict: "座光寺", districtId: null },
]);

const HEADER =
  "全国地方公共団体コード,ID,名称,種別,所在地_全国地方公共団体コード,所在地_連結表記,所在地_町字,所在地_番地以下,建物名等(方書),緯度,経度,団体名,収容定員,受入年齢,利用可能曜日,開始時間,終了時間,利用可能日時特記事項,一時預かりの有無,病児保育の有無";
const line = (cells: Record<string, string>) => {
  const base: Record<string, string> = {
    全国地方公共団体コード: "202053",
    ID: "DD2020530001",
    名称: "認定こども園丸山保育園",
    種別: "認定こども園（保育所型）",
    所在地_全国地方公共団体コード: "202053",
    所在地_連結表記: "長野県飯田市今宮町二丁目113番地2",
    所在地_町字: "今宮町2丁目",
    所在地_番地以下: "113番地2",
    "建物名等(方書)": "",
    緯度: "35.52143",
    経度: "137.816788",
    団体名: "飯田市",
    収容定員: "23",
    受入年齢: "3～5歳",
    利用可能曜日: "月火水木金土",
    開始時間: "07:30",
    終了時間: "18:00",
    利用可能日時特記事項: "",
    一時預かりの有無: "有",
    病児保育の有無: "",
    ...cells,
  };
  return HEADER.split(",").map((key) => base[key]).join(",");
};
const csv = (...lines: string[]) => [HEADER, ...lines].join("\r\n");

describe("buildChildcareRows", () => {
  it("施設を地区に振り分け、年齢や時間などをまとめる。4地区の外は地区なしで入れ、中身のない行は飛ばす", () => {
    const result = buildChildcareRows(
      csv(line({}), line({ ID: "DD2020530002", 名称: "認定こども園座光寺保育園", 所在地_町字: "座光寺", 所在地_連結表記: "長野県飯田市座光寺1716番地" }), ",".repeat(19)),
      resolveTown,
    );
    expect(result.skipped).toBe(1);
    expect(result.unmappedTowns).toEqual([]);
    expect(result.rows[1]).toMatchObject({ name: "認定こども園座光寺保育園", districtId: null, townName: "座光寺" });
    expect(result.rows.slice(0, 1)).toEqual([
      {
        kind: "childcare",
        subkind: "認定こども園（保育所型）",
        name: "認定こども園丸山保育園",
        address: "長野県飯田市今宮町二丁目113番地2",
        townName: "今宮町",
        districtId: "chushin",
        lat: 35.52143,
        lon: 137.816788,
        sourceKey: "DD2020530001",
        attributes: {
          ids: ["DD2020530001"],
          operator: "飯田市",
          temporary_care: "有",
          programs: [{ ages: "3～5歳", capacity: 23, days: "月火水木金土", opens: "07:30", closes: "18:00" }],
        },
      },
    ]);
  });

  it("同じ名前・同じ場所の行は1か所にまとめ、行ごとの年齢と時間を並べる", () => {
    const base = { 名称: "自然保育のっぱら", 種別: "その他", 所在地_連結表記: "長野県飯田市上郷飯沼3545", 所在地_町字: "上郷飯沼", 一時預かりの有無: "" };
    const { rows } = buildChildcareRows(
      csv(
        line({ ...base, ID: "DD2020530206", 受入年齢: "2歳", 開始時間: "08:00", 終了時間: "17:00", 収容定員: "5" }),
        line({ ...base, ID: "DD2020530207", 受入年齢: "3歳から5歳", 開始時間: "08:30", 終了時間: "14:30", 収容定員: "5" }),
      ),
      resolveTown,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].sourceKey).toBe("DD2020530206");
    expect(rows[0].attributes.ids).toEqual(["DD2020530206", "DD2020530207"]);
    expect(rows[0].attributes.programs.map((program) => program.ages)).toEqual(["2歳", "3歳から5歳"]);
  });

  it("住所は連結表記をそのまま使う（建物名がすでに入っているので足さない）", () => {
    const { rows } = buildChildcareRows(
      csv(line({ 所在地_連結表記: "長野県飯田市今宮町二丁目1番地病院内", "建物名等(方書)": "病院内" })),
      resolveTown,
    );
    expect(rows[0].address).toBe("長野県飯田市今宮町二丁目1番地病院内");
  });

  it("放課後児童クラブは保育施設と別の種類にする", () => {
    const { rows } = buildChildcareRows(csv(line({ 名称: "丸山児童センター", 種別: "放課後児童クラブ", 収容定員: "", 受入年齢: "" })), resolveTown);
    expect(rows[0]).toMatchObject({ kind: "after_school_club", subkind: "放課後児童クラブ" });
  });

  it("対応表にない町名は集めて返す。飯田市以外の施設や種別が空の施設があれば止める", () => {
    expect(buildChildcareRows(csv(line({ 所在地_町字: "馬場町三丁目" })), resolveTown).unmappedTowns).toEqual(["馬場町"]);
    expect(() => buildChildcareRows(csv(line({ 所在地_全国地方公共団体コード: "204072" })), resolveTown)).toThrow(/飯田市の施設になっていない/);
    expect(() => buildChildcareRows(csv(line({ 種別: "" })), resolveTown)).toThrow(/種別が空/);
  });
});

describe("buildChildcareSql", () => {
  it("市の記載例どおりのクレジットと、更新日・確認日を入れ、施設を入れ直す", () => {
    const { rows } = buildChildcareRows(csv(line({ 名称: "O'Kids" })), resolveTown);
    const sql = buildChildcareSql({ rows, csvUrl: "https://www.city.iida.lg.jp/uploaded/attachment/72372.csv", updatedOn: "2024-11-05", usedOn: "2026-10-24" });
    expect(sql).toContain("period_label = '2024年11月5日更新'");
    expect(sql).toContain("checked_on = '2026-10-24'::date");
    expect(sql).toContain("delete from public.facilities where source_id = 'iida_childcare';");
    expect(sql).toContain("'O''Kids'");
    expect(buildChildcareCreditText("2026-10-24")).toBe(
      "出典：飯田市（https://www.city.iida.lg.jp/soshiki/168/opendata.html）、PDL1.0（https://www.digital.go.jp/resources/open_data/public_data_license_v1.0）（2026年10月24日に利用）。" +
        "「子育て施設」（飯田市）（https://www.city.iida.lg.jp/soshiki/168/opendata.html）を加工して作成（同じ場所の行をまとめた）",
    );
  });

  it("施設が0件なら SQL を作らない", () => {
    expect(() => buildChildcareSql({ rows: [], csvUrl: "x", updatedOn: null, usedOn: "2026-10-24" })).toThrow(/0件/);
  });
});
