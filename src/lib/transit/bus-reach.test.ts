import { describe, expect, it } from "vitest";
import type { BusOuting } from "../data/screen-data";
import { busReachDateNote, busReachSentence, reachableStopsPhrase, tripsPerDayRange } from "./bus-reach";

const outing = (reachable: number, all: number): BusOuting => ({
  dayType: "土曜",
  serviceDate: "2027-01-16",
  validUntil: "2027-03-31",
  destinationPlace: "飯田駅",
  districtStopCount: all,
  reachableStopCount: reachable,
});

describe("バスで行けるバス停の数の一文（036）", () => {
  it("バス停の名前を出さず、地区のバス停の数のうちいくつから行けるかを言う", () => {
    expect(busReachSentence("伊賀良", outing(8, 16))).toBe("伊賀良のバス停16か所のうち8か所から、飯田駅へ乗りかえなしで行けるバスがあります。");
  });

  it("すべてのバス停から行けるときは「すべて」と言う", () => {
    expect(reachableStopsPhrase(outing(11, 11))).toBe("11か所すべて");
    expect(busReachSentence("上郷", outing(11, 11))).toBe("上郷のバス停11か所すべてから、飯田駅へ乗りかえなしで行けるバスがあります。");
  });

  it("行けるバス停がなければ、ないと言う", () => {
    expect(reachableStopsPhrase(outing(0, 5))).toBeNull();
    expect(busReachSentence("鼎", outing(0, 5))).toBe("鼎のバス停からは、飯田駅へ乗りかえなしで行けるバスはありません。");
  });

  it("いつの時刻表で数えたかを添える", () => {
    expect(busReachDateNote(outing(1, 1))).toBe("2027年1月16日（土）の時刻表で数えました");
  });
});

describe("行ける場所の1日の本数（038）", () => {
  it("乗るバス停によって違えば幅で、同じなら1つの数で言う", () => {
    expect(tripsPerDayRange(4, 14)).toBe("4〜14本／日");
    expect(tripsPerDayRange(4, 4)).toBe("4本／日");
  });
});
