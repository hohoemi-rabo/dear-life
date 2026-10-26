import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DISTRICT_NAMES, DISTRICTS, familyLabel, KARTE_CARDS, PRIORITIES } from "./labels";

describe("labels", () => {
  it("地区の名前と並びは、Supabase の地区マスタ（003 の seed）と同じ", () => {
    const seed = readFileSync("supabase/migrations/20261022071111_seed_districts.sql", "utf8");
    const rows = [...seed.matchAll(/\('(\w+)', '([^']+)', (\d+),/g)]
      .sort((a, b) => Number(a[3]) - Number(b[3]))
      .map(([, id, name]) => ({ id, name }));
    expect(DISTRICTS).toEqual(rows);
    expect(DISTRICT_NAMES.chushin).toBe("中心市街地");
  });

  it("大切にしたいことの選択肢は、支援制度を除いたカードを既定の並びで持つ", () => {
    expect(PRIORITIES).toEqual(KARTE_CARDS.slice(0, -1));
    expect(KARTE_CARDS.at(-1)).toBe("support");
  });

  it("家族を一続きの表記にする", () => {
    expect(familyLabel(2, 0)).toBe("大人2人・子ども0人");
  });
});
