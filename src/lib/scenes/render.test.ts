import { describe, expect, it } from "vitest";
import { DEFAULT_CONDITIONS, type Conditions } from "@/lib/conditions/model";
import { planScene } from "@/lib/conditions/scene";
import type { BusOuting, DistrictData, DistrictEvent, Facility, ScreenData, SceneTemplate } from "@/lib/data/screen-data";
import { NOTICES } from "@/lib/notices";
import { availableFixture, screenDataFixture, sourceFixture } from "@/test/screen-data-fixture";
import { SCENE_TEMPLATE_DRAFTS } from "./drafts";
import { pickChildcareExample, pickPublicFacilityExample } from "./placeholders";
import { renderScene, selectSceneEvents } from "./render";

const CHILDCARE = sourceFixture("iida_childcare");
const EDUCATION_DISTRICTS = sourceFixture("reinfolib_xkt004");
const JUNIOR_DISTRICTS = sourceFixture("reinfolib_xkt005");
const EVACUATION = sourceFixture("iida_evacuation");
const BUS = sourceFixture("gtfs_minamishinshu_bus");
const STATIONS = sourceFixture("sena_iida_line_stations");
const POPULATION = sourceFixture("estat_census_small_area");
const WINTER = sourceFixture("rakuen_shinshu_iida_sheet");

const facility = (name: string, subkind: string | null, address: string | null = `${name}の住所`): Facility => ({ name, subkind, address });

const BUS_OUTING: BusOuting = {
  originName: "鼎公民館前",
  destinationName: "飯田駅前",
  outbound: { departure: "10:01", arrival: "10:11", line: "市内線" },
  return: { departure: "12:00", arrival: "12:10", line: "市内線" },
  nextReturn: { departure: "12:20", arrival: "12:30", line: "市内線" },
  outboundTripsPerDay: 17,
  returnTripsPerDay: 16,
  originDeparturesPerDay: 21,
  dayType: "土曜",
  serviceDate: "2027-01-16",
  validUntil: "2027-03-31",
};

function event(name: string, extra: Partial<DistrictEvent> = {}): DistrictEvent {
  return {
    season: "秋",
    name,
    chushinArea: null,
    timingNote: "例年10月中旬",
    scope: "地区全体",
    participation: "未確認",
    participationNote: null,
    isForChildren: false,
    art: "運動会",
    sourceNote: "公民館の資料",
    checkedOn: "2026-10-26",
    ...extra,
  };
}

// 下書きのひな形を公開済みとして入れた ScreenData
function dataWith(kanae: Partial<DistrictData>, sources = [WINTER]): ScreenData {
  const templates: SceneTemplate[] = SCENE_TEMPLATE_DRAFTS.map((draft, index) => ({ id: index + 1, ...draft }));
  return { ...screenDataFixture({ kanae }), sources, sceneTemplates: templates };
}

const conditions = (extra: Partial<Conditions> = {}): Conditions => ({ ...DEFAULT_CONDITIONS, district: "kanae", ...extra });

const texts = (scene: ReturnType<typeof renderScene>) =>
  scene?.lines.map((line) => (line.status === "shown" ? line.text : `[${line.message}]`));

describe("renderScene", () => {
  it("春・子どもあり：保育施設の数と例、学区を差し込み、文の種類・出典・カルテのカードを付ける", () => {
    const data = dataWith({
      childcare: availableFixture([facility("ひよこ園", "その他"), facility("かなえ保育園", "認定こども園（保育所型）")], CHILDCARE),
      elementarySchoolDistricts: availableFixture(["鼎小学校"], EDUCATION_DISTRICTS),
      juniorHighSchoolDistricts: availableFixture(["鼎中学校"], JUNIOR_DISTRICTS),
    });
    const scene = renderScene("春", conditions(), data);
    expect(texts(scene)).toEqual([
      "春、入園と入学の季節です。",
      "鼎には、保育園・幼稚園等が2か所あります。",
      "たとえばかなえ保育園（かなえ保育園の住所）です。",
      "小学校は主に鼎小学校、中学校は主に鼎中学校の学区になります。",
      "家族で、新しい毎日の準備をします。",
    ]);
    expect(scene?.lines[0]).toMatchObject({ kind: "想定", sources: [], karteCard: null });
    expect(scene?.lines[1]).toMatchObject({ kind: "データ", sources: [CHILDCARE], karteCard: "childcare" });
    expect(scene?.sources).toEqual([CHILDCARE, EDUCATION_DISTRICTS, JUNIOR_DISTRICTS]);
    expect(scene?.notices).toEqual([NOTICES.schoolDistrict]);
  });

  it("同じ条件・同じデータなら、何度作っても同じ文章になる", () => {
    const data = dataWith({ childcare: availableFixture([facility("かなえ保育園", "保育所")], CHILDCARE) });
    expect(renderScene("春", conditions(), data)).toEqual(renderScene("春", conditions(), data));
  });

  it("データ未取得の文は知らせ1つにまとめ、該当なしとは書き分ける", () => {
    const data = dataWith({
      childcare: { status: "none", source: CHILDCARE },
      elementarySchoolDistricts: { status: "unavailable" },
    });
    expect(texts(renderScene("春", conditions(), data))).toEqual([
      "春、入園と入学の季節です。",
      "[保育園・幼稚園等：該当なし]",
      "[学区：データ未取得]",
      "家族で、新しい毎日の準備をします。",
    ]);
  });

  it("値の一部が該当なし（住所がない）なら、言いかえの本文を出す", () => {
    const data = dataWith({ childcare: availableFixture([facility("かなえ保育園", "保育所", null)], CHILDCARE) });
    expect(texts(renderScene("春", conditions(), data))?.[2]).toBe("たとえばかなえ保育園です。");
  });

  it("春・子どもなしは公共施設の場面にし、例は公民館を先に選ぶ", () => {
    const publicFacilities = availableFixture(
      [facility("かなえ公園", "公園"), facility("かなえ図書館", "図書館"), facility("かなえ公民館", "公民館")],
      sourceFixture("iida_public_facilities"),
    );
    const scene = renderScene("春", conditions({ children: 0 }), dataWith({ publicFacilities }));
    expect(scene?.plan.axis).toBe("spring-public-facility");
    expect(texts(scene)?.[2]).toBe("たとえばかなえ公民館（かなえ公民館の住所）があります。");
  });

  it("夏：避難場所の数と、洪水と土砂災害の両方に使える場所を差し込む", () => {
    const evacuationSites = availableFixture(
      [
        { ...facility("川の広場", "指定緊急避難場所"), hazards: ["flood" as const] },
        { ...facility("丘の体育館", "指定緊急避難場所"), hazards: ["flood" as const, "landslide" as const] },
      ],
      EVACUATION,
    );
    expect(texts(renderScene("夏", conditions(), dataWith({ evacuationSites })))?.slice(1, 3)).toEqual([
      "鼎には、市の指定緊急避難場所が2か所あります。",
      "そのうち洪水と土砂災害の両方に使える場所は1か所で、たとえば丘の体育館（丘の体育館の住所）です。",
    ]);
  });

  it("秋：行事は地区の情報として確認日を付け、区ごとの行事は「区によって違います」と書く", () => {
    const data = dataWith({
      events: [event("区の運動会", { scope: "区ごと" }), event("春の行事", { season: "春" })],
      population: availableFixture({ asOf: "2020-10-01", total: 12345, age0to14: 1500, age15to64: null, age65plus: null }, POPULATION),
    });
    const scene = renderScene("秋", conditions(), data);
    expect(texts(scene)?.slice(1, 3)).toEqual([
      "鼎では、例年10月中旬に区の運動会（区によって違います）があります。",
      "鼎に住んでいる人は12,345人で、そのうち14歳以下は1,500人です（2020年10月1日時点）。",
    ]);
    expect(scene?.lines[1]).toMatchObject({ kind: "地区の情報", checkedOn: "2026-10-26", sources: [] });
    expect(scene?.notices).toEqual([NOTICES.events]);
  });

  it("秋：その季節の行事がなければ「この季節の行事は準備中です」と出し、作り話で埋めない", () => {
    expect(texts(renderScene("秋", conditions(), dataWith({ events: [] })))?.[1]).toBe("[この季節の行事は準備中です]");
  });

  it("冬・車0台：バスの本物の便を差し込み、駅のない地区では電車の文を出さない", () => {
    const data = dataWith({
      busOuting: availableFixture(BUS_OUTING, BUS),
      trainStations: { status: "none", source: STATIONS },
    });
    const scene = renderScene("冬", conditions({ car: 0 }), data);
    expect(texts(scene)).toEqual([
      "冬の休みの日、車を使わずに出かけます。",
      "土曜日、鼎公民館前を10:01に出るバスに乗り、10:11に飯田駅前に着きます。",
      "鼎公民館前から飯田駅前へ乗りかえなしで行くバスは、この日は1日17本です。帰りは12:00発、その次の便は12:20発です。",
    ]);
    expect(scene?.lines[1]).toMatchObject({ karteCard: "transport", transit: { mode: "bus", outing: BUS_OUTING } });
    expect(scene?.notices).toEqual([NOTICES.carFree]);
  });

  it("冬・車0台：帰りの次の便がなければ「そのあとの帰りの便はありません」と書く", () => {
    const data = dataWith({ busOuting: availableFixture({ ...BUS_OUTING, nextReturn: null }, BUS) });
    expect(texts(renderScene("冬", conditions({ car: 0 }), data))?.[2]).toBe(
      "鼎公民館前から飯田駅前へ乗りかえなしで行くバスは、この日は1日17本です。帰りは12:00発で、そのあとの帰りの便はありません。",
    );
  });

  it("冬・車0台：使える便がない・電車の時刻が未公開なら、それぞれ書き分ける", () => {
    const data = dataWith({
      busOuting: { status: "none", source: BUS },
      trainStations: availableFixture([facility("鼎", null)], STATIONS),
      trainOuting: { status: "unavailable" },
    });
    expect(texts(renderScene("冬", conditions({ car: 0 }), data))).toEqual([
      "冬の休みの日、車を使わずに出かけます。",
      "[この条件で使えるバスの便は見つかりませんでした]",
      "[電車の便：データ未取得]",
    ]);
  });

  it("冬・車0台：駅のある地区は電車の便も出す", () => {
    const data = dataWith({
      busOuting: availableFixture(BUS_OUTING, BUS),
      trainStations: availableFixture([facility("鼎", null)], STATIONS),
      trainOuting: availableFixture(
        {
          originName: "鼎",
          destinationName: "飯田",
          outbound: { departure: "09:00", arrival: "09:08", line: "普通" },
          return: { departure: "12:19", arrival: "12:27", line: "普通" },
          nextReturn: { departure: "13:25", arrival: "13:33", line: "普通" },
          outboundTripsPerDay: 19,
          returnTripsPerDay: 19,
          originDeparturesPerDay: 38,
        },
        sourceFixture("iida_jr_timetable"),
      ),
    });
    const scene = renderScene("冬", conditions({ car: 0, housing: "old" }), data);
    expect(texts(scene)?.slice(3)).toEqual([
      "電車なら、鼎駅を9:00に出る普通で、9:08に飯田駅に着きます。飯田駅へ行く電車は特急を除いて1日19本で、帰りは12:19発、その次は13:25発です。",
      "古い家では、朝の冷えこみを部屋の中でも感じることがあります。",
    ]);
    expect(scene?.lines[3]).toMatchObject({ transit: { mode: "train" } });
  });

  it("冬・車あり（未選択も）：凍結の文に出典を付け、出典が未公開なら「データ未取得」にする", () => {
    const published = renderScene("冬", conditions({ car: null }), dataWith({}));
    expect(published?.plan.axis).toBe("winter-car");
    expect(published?.lines[1]).toMatchObject({ status: "shown", sources: [WINTER], karteCard: null });
    expect(published?.lines).toHaveLength(3 + 0 + 1);

    const unpublished = renderScene("冬", conditions({ car: 1 }), dataWith({}, []));
    expect(texts(unpublished)).toEqual(["冬の朝、車で出かけます。", "[冬の道路のようす：データ未取得]", "出かける前に、車の窓の霜をとかします。"]);
  });

  it("冬・買う・古めだけ、古い家の寒さの文が入る", () => {
    const old = texts(renderScene("冬", conditions({ housing: "old" }), dataWith({})));
    const fresh = texts(renderScene("冬", conditions({ housing: "new" }), dataWith({})));
    expect(old).toContain("古い家では、朝の冷えこみを部屋の中でも感じることがあります。");
    expect(fresh).not.toContain("古い家では、朝の冷えこみを部屋の中でも感じることがあります。");
  });

  it("地区が未選択、または公開済みのひな形がなければ null", () => {
    expect(renderScene("春", { ...DEFAULT_CONDITIONS }, dataWith({}))).toBeNull();
    expect(renderScene("春", conditions(), screenDataFixture())).toBeNull();
  });
});

describe("selectSceneEvents", () => {
  const district = { ...screenDataFixture().districts.kanae, events: [event("運動会"), event("文化祭"), event("子ども会", { isForChildren: true })] };

  it("その季節の行事を並び順どおりに2つまで出す", () => {
    expect(selectSceneEvents(district, planScene("秋", conditions({ children: 0 }))).map((e) => e.name)).toEqual(["運動会", "文化祭"]);
  });

  it("秋・子どもありは子ども向けの行事を先にする", () => {
    expect(selectSceneEvents(district, planScene("秋", conditions())).map((e) => e.name)).toEqual(["子ども会", "運動会"]);
  });
});

describe("「たとえば◯◯」の施設の選び方", () => {
  it("保育施設は認可外・その他より先に、ほかの施設から並び順で選ぶ。それしかなければそれを選ぶ", () => {
    expect(pickChildcareExample([facility("a", "その他"), facility("b", "認可外保育所"), facility("c", "保育所")])?.name).toBe("c");
    expect(pickChildcareExample([facility("a", "その他")])?.name).toBe("a");
    expect(pickChildcareExample([])).toBeNull();
  });

  it("公共施設は公民館 → 図書館 → そのほかの順", () => {
    expect(pickPublicFacilityExample([facility("a", "公園"), facility("b", "図書館")])?.name).toBe("b");
    expect(pickPublicFacilityExample([facility("a", "公園")])?.name).toBe("a");
  });
});
