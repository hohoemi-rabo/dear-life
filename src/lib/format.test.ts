import { describe, expect, it } from "vitest";
import { formatJaDate, formatJaDateWithWeekday, formatManYen, formatQuarterRange, formatServiceTime } from "./format";

describe("formatJaDateWithWeekday", () => {
  it("日付に曜日を添える", () => {
    expect(formatJaDateWithWeekday("2027-01-16")).toBe("2027年1月16日（土）");
    expect(formatJaDateWithWeekday("2027-01-18")).toBe("2027年1月18日（月）");
  });

  it("形の違う日付は受け付けない", () => {
    expect(() => formatJaDateWithWeekday("2027/01/16")).toThrow(RangeError);
  });
});

describe("formatJaDate", () => {
  it("YYYY-MM-DD を「年月日」で出し、月日の0を付けない", () => {
    expect(formatJaDate("2026-01-05")).toBe("2026年1月5日");
    expect(formatJaDate("2026-10-21")).toBe("2026年10月21日");
  });

  it.each(["2026/10/21", "2026-10-21T00:00:00Z", ""])("%j は受け付けない", (value) => {
    expect(() => formatJaDate(value)).toThrow(RangeError);
  });
});

describe("formatServiceTime", () => {
  it("時の0を付けずに出し、24時以上は「翌」を付けて日付の境目で戻す", () => {
    expect(formatServiceTime("09:05")).toBe("9:05");
    expect(formatServiceTime("23:59")).toBe("23:59");
    expect(formatServiceTime("24:30")).toBe("翌0:30");
    expect(formatServiceTime("25:00")).toBe("翌1:00");
  });

  it.each(["9:05", "09:05:00", ""])("%j は受け付けない", (value) => {
    expect(() => formatServiceTime(value)).toThrow(RangeError);
  });
});

describe("formatManYen", () => {
  it("要件 5.1 と同じ書き方にする", () => {
    expect(formatManYen(28000)).toBe("2.8万円");
    expect(formatManYen(12500)).toBe("1.25万円");
    expect(formatManYen(4600)).toBe("0.46万円");
    expect(formatManYen(39_000_000)).toBe("3,900万円");
    expect(formatManYen(6_250_000)).toBe("625万円");
  });

  it.each([-1, Number.NaN])("%s は受け付けない", (value) => {
    expect(() => formatManYen(value)).toThrow(RangeError);
  });
});

describe("formatQuarterRange", () => {
  it("四半期の範囲を「年第◯四半期」でつなぐ", () => {
    expect(formatQuarterRange("2021Q1", "2026Q1")).toBe("2021年第1四半期〜2026年第1四半期");
  });

  it("形の違う四半期は受け付けない", () => {
    expect(() => formatQuarterRange("2021-1", "2026Q1")).toThrow(RangeError);
  });
});
