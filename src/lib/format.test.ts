import { describe, expect, it } from "vitest";
import { formatJaDate, formatServiceTime } from "./format";

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
