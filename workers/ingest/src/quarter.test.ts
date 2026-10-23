// @vitest-environment node
import { describe, expect, it } from "vitest";
import { addQuarters, compareQuarters, parsePeriod, quarterCode, quarterLabel, quarterOf } from "./quarter";
import { toJstDate } from "./time";

describe("四半期", () => {
  it("API の取引時期を読み、形が違えば null を返す", () => {
    expect(parsePeriod("2026年第1四半期")).toEqual({ year: 2026, quarter: 1 });
    expect(parsePeriod("2026年第5四半期")).toBeNull();
    expect(parsePeriod("2026年1月")).toBeNull();
  });

  it("年をまたいで足し引きできる", () => {
    expect(addQuarters({ year: 2026, quarter: 1 }, -20)).toEqual({ year: 2021, quarter: 1 });
    expect(addQuarters({ year: 2025, quarter: 4 }, 1)).toEqual({ year: 2026, quarter: 1 });
  });

  it("新しい四半期ほど大きいとみなす", () => {
    expect(compareQuarters({ year: 2026, quarter: 1 }, { year: 2025, quarter: 4 })).toBeGreaterThan(0);
    expect(compareQuarters({ year: 2025, quarter: 2 }, { year: 2025, quarter: 2 })).toBe(0);
  });

  it("日本時間の日付が入る四半期を返す", () => {
    // 2026-10-01 00:30 JST（UTC ではまだ9月）
    expect(quarterOf(toJstDate(Date.parse("2026-09-30T15:30:00Z")))).toEqual({ year: 2026, quarter: 4 });
  });

  it("保存用と表示用の書き方にする", () => {
    expect(quarterCode({ year: 2021, quarter: 1 })).toBe("2021Q1");
    expect(quarterLabel({ year: 2021, quarter: 1 })).toBe("2021年第1四半期");
  });
});
