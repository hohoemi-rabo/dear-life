import { describe, expect, it } from "vitest";
import { isLivingAlone, singleMascotMotion } from "./single";
import { MASCOT_SPRITES } from "./sprites";

describe("一人のときのぽてり（043）", () => {
  it("大人1人・子ども0人のときだけ一人とみなす", () => {
    expect(isLivingAlone({ adults: 1, children: 0 })).toBe(true);
    expect(isLivingAlone({ adults: 1, children: 1 })).toBe(false);
    expect(isLivingAlone({ adults: 2, children: 0 })).toBe(false);
    expect(isLivingAlone({ adults: 2, children: 3 })).toBe(false);
  });

  it("一人のときは季節の服のまばたきの絵、ほかの家族では出さない", () => {
    expect(singleMascotMotion({ adults: 1, children: 0 }, "春")).toBe("single-blink-spring");
    expect(singleMascotMotion({ adults: 1, children: 0 }, "冬")).toBe("single-blink-winter");
    expect(singleMascotMotion({ adults: 1, children: 2 }, "春")).toBeNull();
  });

  it("まばたきの絵は 開く・半分・閉じる の3コマ（tailwind の mascot-blink の位置 0%・50%・100% とそろえる）", () => {
    for (const season of ["春", "夏", "秋", "冬"] as const) {
      const motion = singleMascotMotion({ adults: 1, children: 0 }, season);
      expect(motion && MASCOT_SPRITES[motion].frames).toBe(3);
    }
  });
});
