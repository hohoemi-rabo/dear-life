import { describe, expect, it } from "vitest";
import { countLabel } from "./count-label";

describe("countLabel", () => {
  it.each([
    [30, "enough", "件数じゅうぶん"],
    [120, "enough", "件数じゅうぶん"],
    [29, "moderate", "参考になる件数"],
    [11, "moderate", "参考になる件数"],
    [10, "few", "件数少なめ・参考程度"],
    [1, "few", "件数少なめ・参考程度"],
  ])("%i件は %s（%s）", (count, level, text) => {
    expect(countLabel(count)).toEqual({ level, text });
  });

  it.each([-1, 1.5, Number.NaN])("%s は受け付けない", (count) => {
    expect(() => countLabel(count)).toThrow(RangeError);
  });
});
