import { describe, expect, it } from "vitest";
import { buildTrainCountsSql, parseLineCounts } from "./counts";

// 実際の CSV の列のうち、読むところだけ（路線２_ 以降の列は空）
const HEADER =
  '"ID","事業者名","駅名","路線数","路線１_路線名","路線１_方向１","路線１_方向１着数","路線１_方向１発数","路線１_方向２","路線１_方向２着数","路線１_方向２発数","路線２_路線名","路線２_方向１","路線２_方向１発数","路線２_方向２","路線２_方向２発数"';
const csv = (...rows: string[]) => [HEADER, ...rows].join("\r\n");

describe("parseLineCounts", () => {
  it("JR東海の飯田線の駅だけを、向きごとの発車本数にする（ほかの路線の列にあっても拾う）", () => {
    const rows = parseLineCounts(
      csv(
        '1,"JR東海","鼎",1,"飯田線","下り",19,19,"上り",19,19,,,,,',
        '2,"JR東海","伊那上郷",1,"飯田線","下り",18,18,"上り",20,20,,,,,',
        '3,"JR東海","辰野",2,"中央線","下り",30,30,"上り",30,30,"飯田線","下り",0,"上り",15',
        '4,"JR東日本","鼎",1,"飯田線","下り",1,1,"上り",1,1,,,,,',
        '5,"JR東海","名古屋",1,"東海道線","下り",9,9,"上り",9,9,,,,,',
      ),
    );
    expect(rows).toEqual([
      { stationName: "伊那上郷", direction: "下り", departuresPerDay: 18 },
      { stationName: "伊那上郷", direction: "上り", departuresPerDay: 20 },
      { stationName: "辰野", direction: "下り", departuresPerDay: 0 },
      { stationName: "辰野", direction: "上り", departuresPerDay: 15 },
      { stationName: "鼎", direction: "下り", departuresPerDay: 19 },
      { stationName: "鼎", direction: "上り", departuresPerDay: 19 },
    ]);
  });

  it("向きの名前や本数がおかしい・飯田線がない・見出しが違うときは止める", () => {
    expect(() => parseLineCounts(csv('1,"JR東海","鼎",1,"飯田線","北",19,19,"上り",19,19,,,,,'))).toThrow("向き");
    expect(() => parseLineCounts(csv('1,"JR東海","鼎",1,"飯田線","下り",19,,"上り",19,19,,,,,'))).toThrow("本数");
    expect(() => parseLineCounts(csv('1,"JR東海","名古屋",1,"東海道線","下り",9,9,"上り",9,9,,,,,'))).toThrow("飯田線の駅が見つからない");
    expect(() => parseLineCounts('"駅名","本数"\r\n"鼎",1')).toThrow("見出し");
  });
});

describe("buildTrainCountsSql", () => {
  it("出典のクレジットに作成者と両方のライセンスを書き、行を入れ直す", () => {
    const sql = buildTrainCountsSql({ rows: [{ stationName: "鼎", direction: "上り", departuresPerDay: 19 }], importedOn: "2026-11-06" });
    expect(sql).toContain("地域・交通データ研究所（西澤明）「全国鉄道運行本数データ」");
    expect(sql).toMatch(/CC BY 4\.0.*ODbL/);
    expect(sql).toContain("checked_on = '2026-11-06'::date");
    expect(sql).toContain("delete from public.train_station_counts where source_id = 'railway_honsu';");
    expect(sql).toContain("('飯田線', '鼎', '上り', 19, 'railway_honsu')");
  });
});
