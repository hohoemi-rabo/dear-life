import { describe, expect, it } from "vitest";
import { mascotMotion, mascotPlacement } from "./spots";

describe("mascotMotion（042）", () => {
  it("地区のしぐさを、季節の服装で選ぶ", () => {
    expect(mascotMotion("kamisato", "春")).toBe("kamisato-sweep-spring");
    expect(mascotMotion("kamisato", "冬")).toBe("kamisato-sweep-winter");
  });

  it("動きがまだない地区と、地区を選んでいないときは出さない", () => {
    expect(mascotMotion("kanae", "春")).toBeNull();
    expect(mascotMotion(null, "春")).toBeNull();
    expect(mascotPlacement("igara", "夏")).toBeNull();
  });

  it("くらしの絵の上では、4季節とも同じ場所に置く", () => {
    expect(mascotPlacement("kamisato", "春")?.wide).toEqual(mascotPlacement("kamisato", "冬")?.wide);
  });
});
