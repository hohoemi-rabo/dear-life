// @vitest-environment node
import { describe, expect, it } from "vitest";
import { toJstDate } from "./time";

describe("toJstDate", () => {
  it("Cron の時刻（UTC 18:00）を日本時間の翌日 03:00 の日付にする", () => {
    expect(toJstDate(Date.parse("2026-10-21T18:00:00Z"))).toEqual({
      year: 2026,
      month: 10,
      day: 22,
      weekday: 4,
      iso: "2026-10-22",
    });
  });

  it("年をまたぐ日も日本時間で数える", () => {
    expect(toJstDate(Date.parse("2026-12-31T15:00:00Z")).iso).toBe("2027-01-01");
    expect(toJstDate(Date.parse("2026-12-31T14:59:59Z")).iso).toBe("2026-12-31");
  });
});
