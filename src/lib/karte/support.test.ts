import { describe, expect, it } from "vitest";
import type { SupportProgram } from "../data/screen-data.ts";
import { supportCheckedRange, supportPurposeTabs } from "./support.ts";

const program = (name: string, category: SupportProgram["category"], checkedOn = "2026-10-26"): SupportProgram => ({
  name,
  title: null,
  tag: null,
  summary: "",
  category,
  officialUrl: "https://example.com/",
  checkedOn,
});

describe("supportPurposeTabs", () => {
  it("移住 → 住まい → 子育ての順に並べ、制度のない目的（その他）は出さない", () => {
    const tabs = supportPurposeTabs([program("児童手当", "子育て"), program("空き家バンク", "住まい"), program("移住相談", "移住")]);
    expect(tabs.map((tab) => tab.heading)).toEqual(["移住の支援", "住まいの支援", "子育ての支援"]);
  });

  it("タブの中は届いた順のまま", () => {
    const tabs = supportPurposeTabs([program("子育て相談", "子育て"), program("妊婦の支援", "子育て"), program("児童手当", "子育て")]);
    expect(tabs[0].programs.map((item) => item.name)).toEqual(["子育て相談", "妊婦の支援", "児童手当"]);
  });

  it("「その他」の制度が入ったら4つ目のタブになる", () => {
    const tabs = supportPurposeTabs([program("移住相談", "移住"), program("何かの制度", "その他")]);
    expect(tabs.map((tab) => tab.category)).toEqual(["移住", "その他"]);
  });

  it("制度がなければタブもない", () => {
    expect(supportPurposeTabs([])).toEqual([]);
  });
});

describe("supportCheckedRange", () => {
  it("いちばん古い確認日と新しい確認日を返す", () => {
    expect(
      supportCheckedRange([program("a", "移住", "2026-11-02"), program("b", "移住", "2026-10-26"), program("c", "住まい", "2026-11-10")]),
    ).toEqual({ oldest: "2026-10-26", newest: "2026-11-10" });
  });

  it("制度がなければ null", () => {
    expect(supportCheckedRange([])).toBeNull();
  });
});
