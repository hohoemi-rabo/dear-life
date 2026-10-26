import { describe, expect, it } from "vitest";
import { DEFAULT_CONDITIONS, type Conditions } from "@/lib/conditions/model";
import { availableFixture, marketFixture, screenDataFixture, sourceFixture } from "@/test/screen-data-fixture";
import { erabuReply } from "./replies";

const EDUCATION = sourceFixture("iida_education");
const CHILDCARE = sourceFixture("iida_childcare");
const BUS = sourceFixture("gtfs_minamishinshu_bus");

const data = screenDataFixture({
  kamisato: {
    market: {
      land: marketFixture(28000, 202),
      house_built_within_20y: marketFixture(39_000_000, 9),
      house_built_over_20y: marketFixture(8_600_000, 39),
    },
    schools: availableFixture(
      [
        { name: "上郷小学校", subkind: "小学校", address: null },
        { name: "高陵中学校", subkind: "中学校", address: null },
      ],
      EDUCATION,
    ),
    childcare: availableFixture(
      [
        { name: "A保育園", subkind: "認定こども園（保育所型）", address: null },
        { name: "B保育園", subkind: "その他", address: null },
      ],
      CHILDCARE,
    ),
    busStops: availableFixture([{ name: "上郷公民館前", subkind: null, address: null }], BUS),
  },
});

const kamisato = (update: Partial<Conditions> = {}): Conditions => ({ ...DEFAULT_CONDITIONS, district: "kamisato", ...update });

describe("erabuReply（要件 4章「えらぶ画面での返事」）", () => {
  it("地区を選ぶ前は、どの質問でも返事をしない", () => {
    expect(erabuReply("district", DEFAULT_CONDITIONS, data)).toBeNull();
  });

  it("住む地区：地区の範囲と、土地の真ん中の値・件数", () => {
    expect(erabuReply("district", kamisato(), data)).toEqual({
      kind: "district",
      districtName: "上郷",
      area: "上郷の範囲",
      land: marketFixture(28000, 202),
    });
  });

  it("子ども1人以上：保育園・幼稚園等の数と、小学校だけの数", () => {
    expect(erabuReply("family", kamisato({ children: 2 }), data)).toEqual({
      kind: "children",
      districtName: "上郷",
      childcare: { status: "available", value: 2, source: CHILDCARE },
      elementarySchools: { status: "available", value: 1, source: EDUCATION },
    });
  });

  it("子ども0人：返事なし", () => {
    expect(erabuReply("family", kamisato({ children: 0 }), data)).toBeNull();
  });

  it("家：買う・新しめ：築20年以内の値で、件数によらず件数少なめのラベルを付ける", () => {
    expect(erabuReply("housing", kamisato({ housing: "new" }), data)).toMatchObject({
      kind: "house",
      housing: "new",
      house: marketFixture(39_000_000, 9),
      alwaysFew: true,
    });
  });

  it("家：買う・古め：築21年以上の値", () => {
    expect(erabuReply("housing", kamisato({ housing: "old" }), data)).toMatchObject({
      kind: "house",
      housing: "old",
      house: marketFixture(8_600_000, 39),
      alwaysFew: false,
    });
  });

  it("家：借りる：家賃の情報はまだないことを返す", () => {
    expect(erabuReply("housing", kamisato({ housing: "rent" }), data)).toEqual({ kind: "rent" });
  });

  it("車：0台：バス停の数。1台以上・未選択は返事なし", () => {
    expect(erabuReply("car", kamisato({ car: 0 }), data)).toEqual({
      kind: "busStops",
      districtName: "上郷",
      busStops: { status: "available", value: 1, source: BUS },
    });
    expect(erabuReply("car", kamisato({ car: 1 }), data)).toBeNull();
    expect(erabuReply("car", kamisato({ car: 2 }), data)).toBeNull();
    expect(erabuReply("car", kamisato({ car: null }), data)).toBeNull();
  });

  it("大切にしたいこと：返事なし", () => {
    expect(erabuReply("priorities", kamisato({ priorities: ["housing"] }), data)).toBeNull();
  });

  it("出典が未公開ならデータ未取得、公開済みで当てはまるものがなければ該当なし", () => {
    const kanae = { ...kamisato(), district: "kanae" as const, children: 1 };
    const withoutElementary = screenDataFixture({
      kanae: { schools: availableFixture([{ name: "鼎中学校", subkind: "中学校", address: null }], EDUCATION) },
    });
    expect(erabuReply("family", kanae, withoutElementary)).toMatchObject({
      childcare: { status: "unavailable" },
      elementarySchools: { status: "none", source: EDUCATION },
    });
  });
});
