import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createTownResolver } from "../town-district/resolve.ts";
import { buildClinicSql, countClinicsByDistrict, parseClinicExclusionsCsv } from "./clinics.ts";

const ROOT = join(import.meta.dirname, "../../..");
const resolve = createTownResolver([
  { townName: "鼎", cityDistrict: "鼎", districtId: "kanae" },
  { townName: "本町", cityDistrict: "橋北", districtId: "chushin" },
  { townName: "松尾", cityDistrict: "松尾", districtId: null },
]);
const HEADER = '"ID","正式名称","都道府県コード","市区町村コード","所在地"';
const row = (id: string, name: string, address: string, city = "205") => `"${id}","${name}","20","${city}","長野県飯田市${address}"`;
const csv = (...rows: string[]) => [HEADER, ...rows].join("\n") + "\n";

describe("countClinicsByDistrict（037）", () => {
  it("飯田市の診療所を住所で4地区に振り分け、除く一覧のものは数えない。4地区の外とほかの市は数えない", () => {
    const { counts, unmappedTowns } = countClinicsByDistrict(
      csv(row("1", "鼎医院", "鼎中平１"), row("2", "鼎健診", "鼎名古熊２"), row("3", "本町医院", "本町１丁目"), row("4", "松尾医院", "松尾代田"), row("5", "よその医院", "鼎", "201")),
      resolve,
      [{ id: "2", name: "鼎健診", reason: "健診" }],
    );
    expect(unmappedTowns).toEqual([]);
    expect(counts.find((c) => c.districtId === "kanae")).toMatchObject({ clinicCount: 1, excludedCount: 1, clinics: ["鼎医院"] });
    expect(counts.find((c) => c.districtId === "chushin")).toMatchObject({ clinicCount: 1 });
    expect(counts.find((c) => c.districtId === "kamisato")).toMatchObject({ clinicCount: 0 });
  });

  it("対応表にない町名を返す。除く一覧が国の一覧と合わなければ止める", () => {
    expect(countClinicsByDistrict(csv(row("1", "山の医院", "南信濃１")), resolve, []).unmappedTowns).toEqual(["南信濃"]);
    expect(() => countClinicsByDistrict(csv(row("1", "鼎医院", "鼎")), resolve, [{ id: "9", name: "x", reason: "x" }])).toThrow("国の一覧にない");
    expect(() => countClinicsByDistrict(csv(row("1", "鼎医院", "鼎")), resolve, [{ id: "1", name: "別の名前", reason: "x" }])).toThrow("名前");
    expect(() => countClinicsByDistrict(csv(row("1", "よそ", "鼎", "201")), resolve, [])).toThrow("飯田市の診療所が1件もない");
  });
});

describe("リポジトリのデータ（037）", () => {
  it("除く診療所の一覧が読める", () => {
    const exclusions = parseClinicExclusionsCsv(readFileSync(join(ROOT, "data/clinic_exclusions.csv"), "utf8"));
    expect(exclusions.map((e) => e.name)).toEqual(["南信州健診センター", "地域密着型特別養護老人ホームたまゆら診療所"]);
  });

  it("いちばん新しい *_clinic_counts_data.sql に4地区の行がある（npm run clinics:sql で作る）", () => {
    const dir = join(ROOT, "supabase/migrations");
    const latest = readdirSync(dir).filter((f) => f.endsWith("_clinic_counts_data.sql")).sort().at(-1);
    const sql = readFileSync(join(dir, latest!), "utf8");
    expect(sql.match(/^ {2}\('(kamisato|kanae|igara|chushin)', '\d{4}-\d{2}-\d{2}'::date, \d+, \d+, 'mhlw_medical_clinics'\)/gm)).toHaveLength(4);
  });

  it("4地区そろっていなければ SQL を作らない", () => {
    expect(() => buildClinicSql([], "2026-11-11")).toThrow("4地区");
  });
});
