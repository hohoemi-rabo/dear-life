import { describe, expect, it } from "vitest";
import { mascotMotion, mascotPlacement } from "./spots";

describe("mascotMotion（042）", () => {
  it("地区のしぐさを、季節の服装で選ぶ", () => {
    expect(mascotMotion("kamisato", "春")).toBe("kamisato-sweep-spring");
    expect(mascotMotion("kamisato", "冬")).toBe("kamisato-sweep-winter");
    expect(mascotMotion("kanae", "夏")).toBe("kanae-jumprope-summer");
    expect(mascotMotion("igara", "秋")).toBe("igara-drink-autumn");
    expect(mascotMotion("chushin", "冬")).toBe("chushin-spin-winter");
  });

  it("地区を選んでいないときは出さない", () => {
    expect(mascotMotion(null, "春")).toBeNull();
  });

  it("くらしの絵の上では、4季節とも同じ場所に置く", () => {
    expect(mascotPlacement("kamisato", "春")?.wide).toEqual(mascotPlacement("kamisato", "冬")?.wide);
    expect(mascotPlacement("kanae", "春")?.tall).toEqual(mascotPlacement("kanae", "冬")?.tall);
    expect(mascotPlacement("igara", "夏")?.wide).toEqual(mascotPlacement("igara", "冬")?.wide);
    expect(mascotPlacement("chushin", "春")?.tall).toEqual(mascotPlacement("chushin", "秋")?.tall);
  });
});
