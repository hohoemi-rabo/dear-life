import { describe, expect, it } from "vitest";
import { parseConditions } from "../conditions/url";
import { resolveQuestion } from "../erabu/questions";
import { erabuHrefFor } from "./links";

describe("erabuHrefFor", () => {
  it("その地区を選んだ状態で、えらぶの最初の質問を開く", () => {
    const href = erabuHrefFor("kanae");
    expect(href).toBe("/erabu?d=kanae");
    const params = new URLSearchParams(href.split("?")[1]);
    const conditions = parseConditions(params);
    expect(conditions.district).toBe("kanae");
    expect(resolveQuestion(params.get("q"), conditions)).toBe("district");
  });
});
