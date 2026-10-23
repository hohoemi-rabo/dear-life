import { describe, expect, it } from "vitest";
import { buildTrainOutings, countTrainDepartures, findDirectTrains, parseTrainOutingsCsv } from "./outing";
import { parseTimetableCsv } from "./timetable";

// 上り（豊橋方面）：鼎 → 飯田 → 天竜峡。U2 は特急、U3 は飯田止まり、U4 は U5 に追い越される
const UP = [
  "駅,U1,U2,U3,U4,U5",
  "種別,普通,特急 伊那路2号,普通,普通,快速 みすず",
  "鼎,9:00,,10:00,11:00,11:05",
  "飯田着,9:08,,10:08,11:20,11:12",
  "飯田発,9:10,9:58,,11:21,11:13",
  "天竜峡,9:40,10:13,,11:50,11:40",
].join("\n");
// 下り（辰野方面）：天竜峡 → 飯田 → 鼎
const DOWN = [
  "駅,D1,D2,D3",
  "種別,普通,特急 伊那路1号,普通",
  "天竜峡,12:10,12:25,13:30",
  "飯田着,12:40,12:41,14:00",
  "飯田発,12:42,,14:02",
  "鼎,12:50,,14:10",
].join("\n");
const timetables = [parseTimetableCsv(UP, "上り"), parseTimetableCsv(DOWN, "下り")];

const HEADER = "地区,並び順,乗る駅,行き先,行きの時刻以降,帰りの時刻以降";

describe("直通の列車", () => {
  it("特急を除き、行き先が終点の列車も入れる", () => {
    expect(findDirectTrains(timetables, "鼎", "飯田").map((trip) => trip.trainId)).toEqual(["U1", "U3", "U4", "U5"]);
    expect(findDirectTrains(timetables, "飯田", "天竜峡").map((trip) => trip.trainId)).toEqual(["U1", "U5", "U4"]);
    expect(findDirectTrains(timetables, "天竜峡", "飯田").map((trip) => trip.trainId)).toEqual(["D1", "D3"]);
  });

  it("飯田で着と発が分かれる列車は、着の時刻で降り、発の時刻で乗る", () => {
    const [u1] = findDirectTrains(timetables, "飯田", "天竜峡");
    expect(u1).toMatchObject({ departure: 9 * 3600 + 600 });
    expect(findDirectTrains(timetables, "鼎", "飯田")[0]).toMatchObject({ arrival: 9 * 3600 + 480 });
  });

  it("乗る駅の本数は上り・下りの合計で、特急とその駅止まりの列車を除く", () => {
    expect(countTrainDepartures(timetables, "飯田")).toBe(5); // U1・U4・U5・D1・D3
    expect(countTrainDepartures(timetables, "鼎")).toBe(4); // U1・U3・U4・U5（D は鼎が終点）
  });

  it("時刻の CSV にない駅は止める", () => {
    expect(() => findDirectTrains(timetables, "鼎", "豊橋")).toThrow("時刻の CSV にない");
  });
});

describe("電車のおでかけ", () => {
  it("行きの後に、帰りとその次の便を選ぶ。追い越される列車と特急は選ばない", () => {
    const configs = parseTrainOutingsCsv(`${HEADER}\n鼎,1,鼎,天竜峡,10:30,12:00\n`);
    const [outing] = buildTrainOutings(timetables, configs);
    expect(outing.status).toBe("available");
    expect(outing.outbound).toMatchObject({ trainId: "U5", trainType: "快速 みすず" });
    expect(outing.return).toMatchObject({ trainId: "D1" });
    expect(outing.nextReturn).toMatchObject({ trainId: "D3" });
    expect([outing.outboundTripsPerDay, outing.returnTripsPerDay, outing.originDeparturesPerDay]).toEqual([3, 2, 4]);
  });

  it("便がないときは状態で返す", () => {
    const configs = parseTrainOutingsCsv(`${HEADER}\n鼎,1,鼎,天竜峡,12:00,12:00\n鼎,2,鼎,天竜峡,09:00,14:00\n`);
    const [noOutbound, noReturn] = buildTrainOutings(timetables, configs);
    expect(noOutbound).toMatchObject({ status: "no_outbound", outbound: null, return: null });
    expect(noReturn).toMatchObject({ status: "no_return", return: null, nextReturn: null });
  });

  it("設定の CSV の誤りは止める", () => {
    expect(() => parseTrainOutingsCsv("地区,並び順\n")).toThrow("見出し");
    expect(() => parseTrainOutingsCsv(`${HEADER}\n松尾,1,毛賀,飯田,09:00,12:00\n`)).toThrow("4地区");
    expect(() => parseTrainOutingsCsv(`${HEADER}\n鼎,1,鼎,飯田,09:00,12:00\n鼎,1,切石,飯田,09:00,12:00\n`)).toThrow("重複");
    expect(() => parseTrainOutingsCsv(`${HEADER}\n鼎,1,鼎,鼎,09:00,12:00\n`)).toThrow("同じ");
    expect(() => parseTrainOutingsCsv(`${HEADER}\n鼎,1,鼎,飯田,25:00,12:00\n`)).toThrow("24:00");
  });
});
