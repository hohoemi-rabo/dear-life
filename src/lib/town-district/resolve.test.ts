import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseTownMapCsv } from "./csv";
import { createTownResolver, townNameForRecord } from "./resolve";

// 本物の対応表で確かめる（町名を足したときに、ほかの町名の当たり方が変わっていないかも見る）
const rows = parseTownMapCsv(readFileSync(join(__dirname, "../../../data/iida_district_map.csv"), "utf8"));
const resolveTown = createTownResolver(rows);

function districtOf(address: string) {
  const entry = resolveTown(address);
  return entry && { town: entry.townName, district: entry.districtId };
}

describe("createTownResolver", () => {
  it("対応表のどの町名も、その町名自身に当たる（書き方をそろえても別の町名とぶつからない）", () => {
    for (const row of rows) {
      expect(resolveTown(row.townName)).toBe(row);
    }
  });

  it.each([
    ["長野県飯田市上郷飯沼3145番地", "上郷飯沼", "kamisato"],
    ["〒395-0002 長野県飯田市上郷飯沼１２３", "上郷飯沼", "kamisato"],
    ["飯田市　鼎中平 1970", "鼎", "kanae"],
    ["飯田市大字鼎一色456", "鼎", "kanae"],
    ["飯田市大瀬木1101-1", "大瀬木", "igara"],
    ["飯田市三日市場１－２", "三日市場", "igara"],
    ["飯田市上飯田5329", "上飯田", "chushin"],
  ])("住所を地区に振り分ける：%s", (address, town, district) => {
    expect(districtOf(address)).toEqual({ town, district });
  });

  it("「松尾町」は中心市街地、「松尾明」「松尾代田」は松尾地区（対象外）になる", () => {
    expect(districtOf("飯田市松尾町三丁目12")).toEqual({ town: "松尾町", district: "chushin" });
    expect(districtOf("飯田市松尾明7600")).toEqual({ town: "松尾明", district: null });
    expect(districtOf("飯田市松尾代田1000")).toEqual({ town: "松尾", district: null });
  });

  it("羽場は中心市街地に含めない（対象外として当たる）", () => {
    expect(districtOf("飯田市羽場坂町2000")).toEqual({ town: "羽場坂町", district: null });
  });

  it.each([
    ["飯田市宮の上5000", "宮ノ上"],
    ["飯田市仲の町300", "仲ノ町"],
    ["飯田市竜江4000", "龍江"],
    ["飯田市島100", "嶋"],
    ["飯田市中央通1丁目", "中央通り"],
    ["飯田市東中央通り5", "東中央通"],
  ])("書き方の違いをそろえて当てる：%s → %s", (address, town) => {
    expect(resolveTown(address)?.townName).toBe(town);
  });

  it("対応表にない町名・飯田市の外・空の住所は null を返す", () => {
    expect(resolveTown("飯田市南信濃須沢100")).toBeNull();
    expect(resolveTown("長野県下伊那郡松川町元大島1000")).toBeNull();
    expect(resolveTown("飯田市")).toBeNull();
    expect(resolveTown("")).toBeNull();
  });
});

describe("townNameForRecord", () => {
  it.each([
    ["長野県飯田市南信濃須沢１２３", "南信濃須沢"],
    ["飯田市三日市場1-2", "三日市場"],
    ["飯田市二本松3丁目", "二本松"],
    ["飯田市松尾町三丁目12", "松尾町"],
    ["飯田市知久町一番地", "知久町"],
    ["飯田市大通", "大通"],
    ["", ""],
  ])("番地より前を町名として取り出す：%s → %s", (address, town) => {
    expect(townNameForRecord(address)).toBe(town);
  });
});
