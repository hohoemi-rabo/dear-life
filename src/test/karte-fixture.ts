// カルテの一覧（KarteView）と詳細（KarteDetailView）のテストで使う、鼎・伊賀良の値（028）
import type { BusOuting, DistrictData, ScreenData } from "@/lib/data/screen-data";
import { availableFixture, busOutingFixture, MARKET_SOURCE, marketFixture, rentFixture, screenDataFixture, sourceFixture, tenureFixture } from "./screen-data-fixture";

const BUS = sourceFixture("gtfs_minamishinshu_bus", { name: "南信州のバス", publisher: "GTFSデータリポジトリ" });
const STATIONS = sourceFixture("sena_jr_iida_line_stations", { name: "JR飯田線の駅", publisher: "SENA" });
const EVACUATION = sourceFixture("iida_evacuation", { name: "指定緊急避難場所一覧", publisher: "飯田市", checkedOn: "2026-10-26", fetchedOn: null });
const POPULATION = sourceFixture("estat_census_small_area", { name: "国勢調査 小地域集計", publisher: "総務省統計局" });

const BUS_OUTING: BusOuting = busOutingFixture();

export const KANAE: Partial<DistrictData> = {
  market: {
    land: marketFixture(24000, 96, { p25: 17000, p75: 30000 }),
    house_built_within_20y: marketFixture(33500000, 12),
    house_built_over_20y: { status: "none", source: MARKET_SOURCE },
  },
  busStops: availableFixture(
    [
      { name: "鼎公民館前", subkind: null, address: null },
      { name: "鼎駅前", subkind: null, address: null },
    ],
    BUS,
  ),
  trainStations: availableFixture([{ name: "鼎", subkind: null, address: "鼎名古熊" }], STATIONS),
  evacuationSites: availableFixture(
    [{ name: "鼎小学校", subkind: "指定緊急避難場所", address: "鼎中平", hazards: ["flood", "landslide"] }],
    EVACUATION,
  ),
  population: availableFixture({ asOf: "2020-10-01", total: 12000, age0to14: 1500, age15to64: 6900, age65plus: 3600 }, POPULATION),
  busOuting: availableFixture(BUS_OUTING, BUS),
  housingTenure: tenureFixture(5292, 1511),
};


// 鼎は値あり、伊賀良は駅が「該当なし」で、ほかは出典が未公開（データ未取得）。家賃は飯田市全体の値（034）
export function karteScreenData(): ScreenData {
  return { ...screenDataFixture({ kanae: KANAE, igara: { trainStations: { status: "none", source: STATIONS } } }), rent: rentFixture() };
}
