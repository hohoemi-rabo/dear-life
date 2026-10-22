import { describe, expect, it } from "vitest";
import { formatJaDate } from "./format";

describe("formatJaDate", () => {
  it("YYYY-MM-DD を「年月日」で出し、月日の0を付けない", () => {
    expect(formatJaDate("2026-01-05")).toBe("2026年1月5日");
    expect(formatJaDate("2026-10-21")).toBe("2026年10月21日");
  });

  it.each(["2026/10/21", "2026-10-21T00:00:00Z", ""])("%j は受け付けない", (value) => {
    expect(() => formatJaDate(value)).toThrow(RangeError);
  });
});
