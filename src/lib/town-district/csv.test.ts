import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildTownMapSql, parseTownMapCsv } from "./csv";

const ROOT = join(__dirname, "../../..");
const csvText = readFileSync(join(ROOT, "data/iida_district_map.csv"), "utf8");
const rows = parseTownMapCsv(csvText);

function row(townName: string) {
  return rows.find((r) => r.townName === townName);
}

describe("parseTownMapCsv（data/iida_district_map.csv）", () => {
  it("90町名をすべて読み、4地区それぞれに町名がある", () => {
    expect(rows).toHaveLength(90);
    const ids = new Set(rows.map((r) => r.districtId));
    expect(ids).toEqual(new Set(["kamisato", "kanae", "igara", "chushin", null]));
  });

  it("対象外の地区は district_id を持たない。「松尾町」は中心市街地になる", () => {
    expect(row("松尾明")).toMatchObject({ cityDistrict: "松尾", districtId: null });
    expect(row("羽場")).toMatchObject({ cityDistrict: "羽場", districtId: null });
    expect(row("松尾町")).toMatchObject({ cityDistrict: "中心市街地", districtId: "chushin", chushinArea: null });
  });

  it("中心市街地の元の地区名は、メモが1つの地区名のときだけ取り出す", () => {
    expect(row("二本松")?.chushinArea).toBe("橋北");
    expect(row("宮ノ上")?.chushinArea).toBe("東野");
    expect(row("丸山町")?.chushinArea).toBe("丸山");
    expect(row("上飯田")).toMatchObject({ chushinArea: null, note: expect.stringContaining("またがって") });
    expect(row("本町")).toMatchObject({ chushinArea: null, note: null });
  });

  it.each([
    ["見出しが違う", "町名,地区\n鼎,鼎"],
    ["列が足りない", "町名,地区,確度,メモ\n鼎,鼎,確実"],
    ["必須の値が空", "町名,地区,確度,メモ\n鼎,,確実,"],
    ["町名が重複", "町名,地区,確度,メモ\n鼎,鼎,確実,\n鼎,鼎,確実,"],
    ["引用符を含む", '町名,地区,確度,メモ\n鼎,鼎,確実,"a,b"'],
  ])("読み違えそうな CSV は止める：%s", (_, text) => {
    expect(() => parseTownMapCsv(text)).toThrow();
  });
});

describe("buildTownMapSql", () => {
  it("いちばん新しい *_town_district_map.sql が CSV と同じ中身になっている（npm run town-map:sql のし忘れを防ぐ）", () => {
    const dir = join(ROOT, "supabase/migrations");
    const latest = readdirSync(dir).filter((f) => f.endsWith("_town_district_map.sql")).sort().at(-1);
    expect(latest).toBeDefined();
    expect(readFileSync(join(dir, latest!), "utf8")).toBe(buildTownMapSql(rows));
  });

  it("引用符をエスケープする", () => {
    const sql = buildTownMapSql([
      { townName: "a'b", cityDistrict: "鼎", districtId: "kanae", chushinArea: null, certainty: "確実", note: null },
    ]);
    expect(sql).toContain("('a''b', '鼎', 'kanae', null, '確実', null)");
  });
});
