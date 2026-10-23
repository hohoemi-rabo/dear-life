import { describe, expect, it } from "vitest";
import { departuresAt, parseTimetableCsv } from "./timetable";

// 上り（豊橋方面）の小さな時刻表。T1 は飯田で止まる、T2 は飯田で着と発が分かれる、T3 は桜町を通過、T4 は飯田から出る
const CSV = [
  "﻿駅,T1,T2,T3,T4",
  "種別,普通,普通,特急 伊那路2号,普通",
  "伊那上郷,6:13,7:30,,",
  "桜町,6:16,7:33,↓,",
  "飯田着,6:18,7:35,8:00,",
  "飯田発,,7:40,8:02,9:00",
  "切石,,7:44,↓,9:04",
  "千代,,7:50,8:20,9:10",
].join("\r\n");

describe("時刻の CSV", () => {
  it("着と発の行を1つの駅にまとめ、空欄と通過の駅は入れない", () => {
    const timetable = parseTimetableCsv(CSV, "上り");
    expect(timetable.stations).toEqual(["伊那上郷", "桜町", "飯田", "切石", "千代"]);
    const t3 = timetable.trains.find((train) => train.id === "T3");
    expect(t3?.trainType).toBe("特急 伊那路2号");
    expect(t3?.stops.map((stop) => stop.station)).toEqual(["飯田", "千代"]);
    expect(t3?.stops[0]).toEqual({ station: "飯田", arrival: 8 * 3600, departure: 8 * 3600 + 120 });
  });

  it("駅を発車する列車だけを時刻の順に返す。その駅止まり・通過の列車は入れない", () => {
    const timetable = parseTimetableCsv(CSV, "上り");
    expect(departuresAt(timetable, "飯田").map((d) => [d.trainId, d.departure])).toEqual([
      ["T2", "07:40"],
      ["T3", "08:02"],
      ["T4", "09:00"],
    ]);
    expect(departuresAt(timetable, "桜町").map((d) => d.trainId)).toEqual(["T1", "T2"]);
    expect(departuresAt(timetable, "切石").map((d) => d.trainId)).toEqual(["T2", "T4"]);
    // 終点の駅からは発車しない
    expect(departuresAt(timetable, "千代")).toEqual([]);
    expect(departuresAt(timetable, "伊那上郷")[0]).toEqual({ direction: "上り", departure: "06:13", trainType: "普通", trainId: "T1" });
  });

  it("「千代」のように着・発で終わらない駅名は、そのまま1つの駅として読む", () => {
    const csv = ["駅,T1", "種別,普通", "千代,6:00", "金野,6:03"].join("\n");
    expect(parseTimetableCsv(csv, "下り").stations).toEqual(["千代", "金野"]);
  });

  it("CSV の誤りは止める", () => {
    expect(() => parseTimetableCsv(CSV.replace("6:16", "6:1x"), "上り")).toThrow("時刻は H:MM");
    expect(() => parseTimetableCsv(CSV.replace("7:44", "7:20"), "上り")).toThrow("前の駅より早い");
    expect(() => parseTimetableCsv(CSV.replace("T4", "T1"), "上り")).toThrow("重複");
    expect(() => parseTimetableCsv(CSV.replace("種別", "列車"), "上り")).toThrow("2行目");
    expect(() => parseTimetableCsv(CSV.replace("切石", "桜町"), "上り")).toThrow("同じ駅の行が2つ");
    expect(() => parseTimetableCsv(CSV.replace("特急 伊那路2号", ""), "上り")).toThrow("種別がない");
    expect(() => departuresAt(parseTimetableCsv(CSV, "上り"), "鼎")).toThrow("時刻の CSV（上り）にない");
  });
});
