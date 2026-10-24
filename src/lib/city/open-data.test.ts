import { describe, expect, it } from "vitest";
import { buildCityCreditText, buildPeriodLabel, findOpenDataset } from "./open-data";

describe("findOpenDataset", () => {
  const html = `<table>
    <tr><th>分類</th><th>データ名</th><th>更新日</th><th>CSV</th></tr>
    <tr><td>教育</td><td>教育機関一覧</td><td>—</td><td><a href="/uploaded/attachment/72005.csv">CSV（10KB）</a></td></tr>
    <tr><td>教育</td><td><p>子育て施設</p></td><td>2024年11月5日</td><td><a href="/uploaded/attachment/72372.csv">CSV（30KB）</a></td></tr>
  </table>`;

  it("データ名の行から CSV の URL と更新日を取る。更新日がなければ null", () => {
    expect(findOpenDataset(html, "子育て施設", "https://www.city.iida.lg.jp/soshiki/168/opendata.html")).toEqual({
      csvUrl: "https://www.city.iida.lg.jp/uploaded/attachment/72372.csv",
      updatedOn: "2024-11-05",
    });
    expect(findOpenDataset(html, "教育機関一覧", "https://www.city.iida.lg.jp/x.html").updatedOn).toBeNull();
  });

  it("行がなければ止める", () => {
    expect(() => findOpenDataset(html, "避難場所", "https://www.city.iida.lg.jp/")).toThrow(/「避難場所」の行がない/);
  });
});

describe("クレジットと対象時点", () => {
  it("市の「PDL1.0に関する重要情報」の記載例どおりに書く", () => {
    expect(buildCityCreditText("教育機関一覧", "2026-10-24", "幼保連携型認定こども園を除いた")).toBe(
      "出典：飯田市（https://www.city.iida.lg.jp/soshiki/168/opendata.html）、PDL1.0（https://www.digital.go.jp/resources/open_data/public_data_license_v1.0）（2026年10月24日に利用）。" +
        "「教育機関一覧」（飯田市）（https://www.city.iida.lg.jp/soshiki/168/opendata.html）を加工して作成（幼保連携型認定こども園を除いた）",
    );
  });

  it("更新日がなければ、そう書く", () => {
    expect(buildPeriodLabel("2024-11-05")).toBe("2024年11月5日更新");
    expect(buildPeriodLabel(null)).toBe("更新日の記載なし");
  });
});
