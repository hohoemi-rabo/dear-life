import { act, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DistrictData, ScreenData } from "@/lib/data/screen-data";
import { NOTICES } from "@/lib/notices";
import { availableFixture, MARKET_SOURCE, marketFixture, screenDataFixture, sourceFixture } from "@/test/screen-data-fixture";
import { KurabeView } from "./KurabeView";

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
    usePathname: () => "/kurabe",
    useRouter: () => ({ push: (href: string) => url.set(href), replace: (href: string) => url.set(href) }),
    useSearchParams: () => {
      const query = useSyncExternalStore(url.subscribe, () => url.query);
      return useMemo(() => new URLSearchParams(query), [query]);
    },
  };
});

let screenData: ScreenData;
vi.mock("@/lib/data/load-screen-data", () => ({ loadScreenData: () => Promise.resolve(screenData) }));

const STATIONS = sourceFixture("sena_jr_iida_line_stations", { name: "JR飯田線の駅", publisher: "SENA" });
const POPULATION = sourceFixture("estat_census_small_area", { name: "国勢調査 小地域集計", publisher: "総務省統計局" });

const KANAE: Partial<DistrictData> = {
  market: {
    land: marketFixture(24000, 96, { p25: 17000, p75: 30000 }),
    house_built_within_20y: marketFixture(33500000, 8),
    house_built_over_20y: { status: "none", source: MARKET_SOURCE },
  },
  trainStations: availableFixture([{ name: "鼎", subkind: null, address: "鼎名古熊" }], STATIONS),
  population: availableFixture({ asOf: "2020-10-01", total: 12000, age0to14: 1500, age15to64: 6900, age65plus: 3600 }, POPULATION),
  events: [
    {
      season: "秋",
      name: "鼎地区縦断駅伝大会",
      chushinArea: null,
      timingNote: "11月",
      scope: "地区全体",
      participation: "未確認",
      participationNote: null,
      isForChildren: false,
      art: "運動会",
      sourceNote: "飯田市の公民館活動（令和7年度）",
      checkedOn: "2026-10-26",
    },
  ],
};

async function open(query: string) {
  url.set(`/kurabe?${query}`);
  await act(async () => {
    render(<KurabeView />);
  });
}

// スマホの並べ方（項目ごとに4地区）。PC の表は CSS で出し分けるので、jsdom ではどちらも DOM にある
const mobileRow = (label: string) => screen.getByRole("region", { name: label });
const tableRow = (label: string) => within(screen.getByRole("table")).getByRole("rowheader", { name: new RegExp(`^${label}`) }).closest("tr") as HTMLTableRowElement;
const cells = (row: HTMLElement) => within(row).getAllByRole("cell").map((cell) => cell.textContent);

beforeEach(() => {
  screenData = screenDataFixture({ kanae: KANAE, igara: { trainStations: { status: "none", source: STATIONS } } });
});

describe("KurabeView：4地区を同じ項目で並べる（F-05）", () => {
  it("表の列は地区マスタの順で固定。選んだ地区には目印だけを付ける", async () => {
    await open("d=igara&a=2&k=1");
    const [head] = within(screen.getByRole("table")).getAllByRole("rowgroup");
    const headers = within(head).getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual(["項目", "上郷", "鼎", "伊賀良選んだ地区", "中心市街地"]);
    expect(screen.queryByText(/おすすめ|順位|点数/)).toBeNull();
  });

  it("相場は真ん中の値・幅・件数ラベル。件数が少ない値には「件数少なめ・参考程度」。該当なしとデータ未取得を分ける", async () => {
    await open("d=kanae");
    expect(cells(tableRow("土地（宅地）"))).toEqual(["データ未取得", "2.4万円／㎡幅 1.7万円〜3万円96件件数じゅうぶん", "データ未取得", "データ未取得"]);
    expect(cells(tableRow("中古戸建て（築20年以内）"))[1]).toBe("3,350万円8件件数少なめ・参考程度");
    expect(cells(tableRow("中古戸建て（築21年以上）"))[1]).toBe("該当なし");
    expect(screen.getAllByText(NOTICES.market).length).toBeGreaterThan(0);
    expect(document.body).not.toHaveTextContent("中央値");
  });

  it("スマホは項目ごとに4地区を縦に並べる", async () => {
    await open("d=kanae");
    const station = mobileRow("駅");
    const terms = within(station).getAllByRole("term").map((term) => term.textContent);
    expect(terms).toEqual(["上郷", "鼎選んだ地区", "伊賀良", "中心市街地"]);
    expect(within(station).getAllByRole("definition").map((d) => d.textContent)).toEqual(["データ未取得", "1か所", "該当なし", "データ未取得"]);
  });

  it("人口は総数と年齢3区分の割合", async () => {
    await open("d=kanae");
    expect(cells(tableRow("地区の人口"))[1]).toBe("12,000人");
    expect(cells(tableRow("年齢3区分の割合"))[1]).toBe("14歳以下 12.5%15〜64歳 57.5%65歳以上 30%");
  });

  it("行事は季節ごと。集めていない季節は「準備中」と出す（F-13）", async () => {
    await open("d=kanae");
    expect(cells(tableRow("秋"))[1]).toBe("鼎地区縦断駅伝大会");
    expect(cells(tableRow("春"))[1]).toBe("この季節の行事は準備中です");
  });

  it("出典と対象時点を表の下にまとめて出す", async () => {
    await open("d=kanae");
    const sources = screen.getByRole("region", { name: "出典と対象時点" });
    expect(sources).toHaveTextContent("国土交通省 不動産情報ライブラリ「不動産価格（取引価格・成約価格）情報」");
    expect(sources).toHaveTextContent("2021年第1四半期〜2026年第1四半期");
    expect(sources).toHaveTextContent("SENA「JR飯田線の駅」");
    expect(sources).toHaveTextContent("2020年10月1日時点");
    expect(sources).toHaveTextContent("地区の行事：飯田市の公民館活動（令和7年度）");
    expect(sources).toHaveTextContent("確認日2026年10月26日");
  });
});

describe("KurabeView：移動", () => {
  it("カルテ・くらしに戻るときは条件と季節を残す", async () => {
    await open("s=winter&d=kanae&a=2&k=1&h=new");
    expect(screen.getByRole("link", { name: /カルテに戻る/ })).toHaveAttribute("href", "/karte?s=winter&d=kanae&a=2&k=1&h=new");
    expect(screen.getByRole("link", { name: "くらしを見る" })).toHaveAttribute("href", "/kurashi?s=winter&d=kanae&a=2&k=1&h=new");
  });

  it("地区を選んでいなくても見られ、目印は付けない。えらぶへ案内する", async () => {
    await open("a=2&k=1");
    expect(screen.queryByText("選んだ地区")).toBeNull();
    expect(screen.getByRole("link", { name: /地区をえらんで/ })).toHaveAttribute("href", "/erabu?a=2&k=1&h=new");
  });
});
