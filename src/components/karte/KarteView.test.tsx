import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BusOuting, DistrictData, ScreenData } from "@/lib/data/screen-data";
import { NOTICES } from "@/lib/notices";
import { availableFixture, MARKET_SOURCE, marketFixture, screenDataFixture, sourceFixture } from "@/test/screen-data-fixture";
import { KarteView } from "./KarteView";

// URL を持つだけの小さなルーター。replace で URL を書きかえ、useSearchParams を読み直させる
const url = vi.hoisted(() => {
  let query = "";
  const listeners = new Set<() => void>();
  return {
    get query() {
      return query;
    },
    set(next: string) {
      query = next.includes("?") ? next.slice(next.indexOf("?") + 1) : "";
      for (const listener of listeners) listener();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
});

vi.mock("next/navigation", async () => {
  const { useMemo, useSyncExternalStore } = await import("react");
  return {
    usePathname: () => "/karte",
    useRouter: () => ({ push: (href: string) => url.set(href), replace: (href: string) => url.set(href) }),
    useSearchParams: () => {
      const query = useSyncExternalStore(url.subscribe, () => url.query);
      return useMemo(() => new URLSearchParams(query), [query]);
    },
  };
});

let screenData: ScreenData;
vi.mock("@/lib/data/load-screen-data", () => ({ loadScreenData: () => Promise.resolve(screenData) }));

const BUS = sourceFixture("gtfs_minamishinshu_bus", { name: "南信州のバス", publisher: "GTFSデータリポジトリ" });
const STATIONS = sourceFixture("sena_jr_iida_line_stations", { name: "JR飯田線の駅", publisher: "SENA" });
const EVACUATION = sourceFixture("iida_evacuation", { name: "指定緊急避難場所一覧", publisher: "飯田市", checkedOn: "2026-10-26", fetchedOn: null });
const POPULATION = sourceFixture("estat_census_small_area", { name: "国勢調査 小地域集計", publisher: "総務省統計局" });

const BUS_OUTING: BusOuting = {
  originName: "鼎公民館前",
  destinationName: "飯田駅前",
  outbound: { departure: "10:01", arrival: "10:11", line: "市内線" },
  return: { departure: "12:00", arrival: "12:10", line: "市内線" },
  nextReturn: null,
  outboundTripsPerDay: 17,
  returnTripsPerDay: 16,
  originDeparturesPerDay: 21,
  dayType: "土曜",
  serviceDate: "2027-01-16",
  validUntil: "2027-03-31",
};

const KANAE: Partial<DistrictData> = {
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
};

async function open(query: string) {
  url.set(`/karte?${query}`);
  await act(async () => {
    render(<KarteView />);
  });
}

const cardTitles = () => within(screen.getByRole("list", { name: "分野ごとのカード" })).getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
const card = (id: string) => document.getElementById(`karte-${id}`) as HTMLDetailsElement;

beforeEach(() => {
  screenData = { ...screenDataFixture({ kanae: KANAE, igara: { trainStations: { status: "none", source: STATIONS } } }) };
});

afterEach(() => {
  window.location.hash = "";
});

describe("KarteView：並びと上部の一文（F-03・4章）", () => {
  it("子どもありは子育て・学校を先に置き、一文で伝える。公共施設は支援制度の前", async () => {
    await open("d=kanae&a=2&k=1&h=new");
    expect(cardTitles()).toEqual(["子育て・学校", "住まい", "交通", "防災", "人口", "公共施設", "支援制度"]);
    expect(screen.getByRole("note", { name: "表示の順番" })).toHaveTextContent("子どもがいるので、子育て・学校の情報を前の方に表示しています。");
    // 最初は1枚目だけ開く
    expect(card("childcare").open).toBe(true);
    expect(card("housing").open).toBe(false);
  });

  it("車0台・大切にしたいことあり：大切にしたいこと → 交通。交通カードに注意書きと冬の場面の便、gofreely へのリンク", async () => {
    await open("d=kanae&a=2&k=0&h=new&c=0&p=disaster");
    expect(cardTitles()).toEqual(["防災", "交通", "住まい", "人口", "公共施設", "子育て・学校", "支援制度"]);
    const note = screen.getByRole("note", { name: "表示の順番" });
    expect(note).toHaveTextContent("防災に関する情報を先に表示しています。");
    expect(note).toHaveTextContent("車を持たない暮らしなので、交通の情報を前の方に表示しています。");

    const transport = card("transport");
    expect(transport).toHaveTextContent(NOTICES.carFree);
    expect(transport).toHaveTextContent("2027年1月16日（土）の時刻表");
    expect(transport).toHaveTextContent("10:01 鼎公民館前発 → 10:11 飯田駅前着");
    expect(transport).toHaveTextContent("次の便はありません");
    expect(within(transport).getByRole("link", { name: /この便を gofreely で調べる/ }).getAttribute("href")).toContain("from=");
  });

  it("車1台以上は交通カードに冬の便を出さない", async () => {
    await open("d=kanae&k=1&c=1");
    expect(card("transport")).not.toHaveTextContent("冬の場面で使ったバスの便");
    expect(card("transport")).not.toHaveTextContent(NOTICES.carFree);
  });
});

describe("KarteView：住まいカード（5章）", () => {
  it("土地は真ん中の値・幅・坪単価・200㎡の目安、件数ラベルと注意書き・出典を出す。新しめは築20年以内を先に", async () => {
    await open("d=kanae&k=0&h=new&p=housing");
    const housing = card("housing");
    const titles = within(housing).getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual(["中古戸建て（築20年以内）", "土地（宅地）", "中古戸建て（築21年以上）"]);
    expect(housing).toHaveTextContent("3,350万円");
    expect(housing).toHaveTextContent("12件参考になる件数");
    expect(housing).toHaveTextContent("2.4万円／㎡");
    expect(housing).toHaveTextContent("1.7万円〜3万円／㎡");
    expect(housing).toHaveTextContent("約7.93万円／坪");
    expect(housing).toHaveTextContent("約480万円");
    expect(housing).toHaveTextContent("96件件数じゅうぶん");
    // 築21年以上は出典が公開済みで件数0なので「該当なし」
    expect(housing).toHaveTextContent("該当なし");
    expect(housing).toHaveTextContent(NOTICES.market);
    expect(housing).toHaveTextContent("2021年第1四半期〜2026年第1四半期");
    expect(housing).not.toHaveTextContent("中央値");
  });

  it("借りるときは家賃の情報がないことを出し、売買の相場は「参考に見る」の中に入れる", async () => {
    await open("d=kanae&k=0&h=rent&p=housing");
    const housing = card("housing");
    expect(housing).toHaveTextContent("家賃の情報はまだありません。");
    const reference = within(housing).getByText("売買の相場を参考に見る").closest("details");
    expect(reference).not.toBeNull();
    expect(reference?.open).toBe(false);
    expect(reference).toHaveTextContent("2.4万円／㎡");
  });
});

describe("KarteView：該当なし／データ未取得（F-09）", () => {
  it("出典が未公開の欄は「データ未取得」、駅のない地区は「地区内に駅はありません。」", async () => {
    await open("d=igara&k=1");
    for (const id of ["housing", "childcare", "transport", "disaster", "population", "public_facilities", "support"]) {
      expect(card(id)).toHaveTextContent("データ未取得");
    }
    expect(card("transport")).toHaveTextContent("地区内に駅はありません。");
    expect(card("transport")).not.toHaveTextContent("駅ごとの1日の本数");
  });

  it("値のある欄には出典と対象・確認日を出す", async () => {
    await open("d=kanae&k=1");
    expect(card("disaster")).toHaveTextContent("飯田市「指定緊急避難場所一覧」");
    expect(card("disaster")).toHaveTextContent("確認日2026年10月26日");
    expect(card("disaster")).toHaveTextContent("洪水・土砂災害");
    expect(card("population")).toHaveTextContent("12,000人");
    expect(card("population")).toHaveTextContent("12.5%");
    expect(card("population")).toHaveTextContent("2020年10月1日時点");
  });

  it("支援制度は制度名・概要・公式リンク・確認日と、公式で確認する注意書きを出す", async () => {
    screenData = {
      ...screenData,
      supportPrograms: [
        { name: "移住支援金", summary: "東京圏から移住した人への支援金", category: "住まい", officialUrl: "https://www.city.iida.lg.jp/x", checkedOn: "2026-10-26" },
      ],
    };
    await open("d=kanae&k=1");
    const support = card("support");
    expect(within(support).getByRole("link", { name: /移住支援金/ })).toHaveAttribute("href", "https://www.city.iida.lg.jp/x");
    expect(support).toHaveTextContent(NOTICES.support);
    expect(support).toHaveTextContent("2026年10月26日");
    expect(support).not.toHaveTextContent("対象になります");
  });
});

describe("KarteView：移動（F-04・F-14）", () => {
  it("くらしの場面から #karte-<card> で来たら、そのカードを開く", async () => {
    window.location.hash = "#karte-disaster";
    await open("s=summer&d=kanae&k=1");
    expect(card("disaster").open).toBe(true);
  });

  it("地区をこの画面のまま切り替えられる", async () => {
    await open("d=kanae&k=1");
    await act(async () => {
      fireEvent.change(screen.getAllByRole("combobox", { name: "地区を切り替える" })[0], { target: { value: "igara" } });
    });
    expect(new URLSearchParams(url.query).get("d")).toBe("igara");
    expect(screen.getByText("伊賀良の暮らしの根拠を、出典とともに確かめよう。")).toBeInTheDocument();
  });

  it("「くらしに戻る」は季節を残す。「条件を変える」はえらぶへ", async () => {
    await open("s=winter&d=kanae&a=2&k=1&h=new");
    expect(screen.getByRole("link", { name: /くらしに戻る/ })).toHaveAttribute("href", "/kurashi?s=winter&d=kanae&a=2&k=1&h=new");
    expect(screen.getAllByRole("link", { name: "条件を変える" })[0]).toHaveAttribute("href", "/erabu?d=kanae&a=2&k=1&h=new");
  });

  it("地区を選んでいなければ、えらぶへ案内する", async () => {
    await open("a=2&k=1");
    expect(screen.getByRole("link", { name: /地区をえらぶ/ })).toHaveAttribute("href", "/erabu?a=2&k=1&h=new");
  });
});
