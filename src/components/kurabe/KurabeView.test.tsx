import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DistrictData, ScreenData } from "@/lib/data/screen-data";
import { NOTICES } from "@/lib/notices";
import { availableFixture, MARKET_SOURCE, marketFixture, screenDataFixture, sourceFixture, tenureFixture } from "@/test/screen-data-fixture";
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
const TRAIN_COUNTS = sourceFixture("railway_honsu", { name: "全国鉄道運行本数データ", publisher: "地域・交通データ研究所（西澤明）" });
const POPULATION = sourceFixture("estat_census_small_area", { name: "国勢調査 小地域集計", publisher: "総務省統計局" });

const KANAE: Partial<DistrictData> = {
  market: {
    land: marketFixture(24000, 96, { p25: 17000, p75: 30000 }),
    house_built_within_20y: marketFixture(33500000, 8),
    house_built_over_20y: { status: "none", source: MARKET_SOURCE },
  },
  trainStations: availableFixture([{ name: "鼎", subkind: null, address: "鼎名古熊" }], STATIONS),
  trainCounts: availableFixture(
    [
      { stationName: "鼎", direction: "上り", tripsPerDay: 19 },
      { stationName: "鼎", direction: "下り", tripsPerDay: 19 },
    ],
    TRAIN_COUNTS,
  ),
  population: availableFixture({ asOf: "2020-10-01", total: 12000, age0to14: 1500, age15to64: 6900, age65plus: 3600 }, POPULATION),
  housingTenure: tenureFixture(5292, 1511),
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
    await open("t=all&d=igara&a=2&k=1");
    const [head] = within(screen.getByRole("table")).getAllByRole("rowgroup");
    const headers = within(head).getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual(["項目", "上郷", "鼎", "伊賀良選んだ地区", "中心市街地"]);
    expect(screen.queryByText(/順位|点数/)).toBeNull();
    expect(screen.getByText("地区の並びは固定です。優劣・おすすめ順ではありません。")).toBeInTheDocument();
  });

  it("相場は中央値・幅・「取引〇件・参考値」（件数で変わる札は出さない。040）。該当なしとデータ未取得を分ける", async () => {
    await open("t=all&d=kanae");
    expect(cells(tableRow("土地（宅地）"))).toEqual(["データ未取得", "2.4万円／m²幅 1.7万円〜3万円取引96件・参考値", "データ未取得", "データ未取得"]);
    expect(cells(tableRow("中古戸建て（築20年以内）"))[1]).toBe("3,350万円取引8件・参考値");
    expect(cells(tableRow("中古戸建て（築21年以上）"))[1]).toBe("該当なし");
    expect(screen.getAllByText(NOTICES.market).length).toBeGreaterThan(0);
    expect(document.body).not.toHaveTextContent(/真ん中の値|件数じゅうぶん|件数少なめ|参考になる件数/);
  });

  it("スマホの全項目の一覧は、項目ごとに4地区を縦に並べる", async () => {
    await open("t=all&d=kanae");
    const station = mobileRow("駅");
    const terms = within(station).getAllByRole("term").map((term) => term.textContent);
    expect(terms).toEqual(["上郷", "鼎選んだ地区", "伊賀良", "中心市街地"]);
    expect(within(station).getAllByRole("definition").map((d) => d.textContent)).toEqual(["データ未取得", "1か所", "該当なし", "データ未取得"]);
  });

  it("人口は総数と年齢3区分の割合", async () => {
    await open("t=all&d=kanae");
    expect(cells(tableRow("地区の人口"))[1]).toBe("12,000人");
    expect(cells(tableRow("年齢3区分の割合"))[1]).toBe("14歳以下 12.5%15〜64歳 57.5%65歳以上 30%");
  });

  it("行事は季節ごと。集めていない季節は「準備中」と出す（F-13）", async () => {
    await open("t=all&d=kanae");
    expect(cells(tableRow("秋"))[1]).toBe("鼎地区縦断駅伝大会");
    expect(cells(tableRow("春"))[1]).toBe("この季節の行事は準備中です");
  });

  it("出典と対象時点を表の下にまとめて出す", async () => {
    await open("t=all&d=kanae");
    const sources = screen.getByRole("region", { name: "出典と対象時点" });
    expect(sources).toHaveTextContent("国土交通省 不動産情報ライブラリ「不動産価格（取引価格・成約価格）情報」");
    expect(sources).toHaveTextContent("2021年第1四半期〜2026年第1四半期");
    expect(sources).toHaveTextContent("SENA「JR飯田線の駅」");
    expect(sources).toHaveTextContent("2020年10月1日時点");
    expect(sources).toHaveTextContent("地区の行事：飯田市の公民館活動（令和7年度）");
    expect(sources).toHaveTextContent("確認日2026年10月26日");
  });
});

describe("KurabeView：項目をタブで切りかえる（028 見本）", () => {
  const tab = (name: string) => screen.getByRole("tab", { name });
  const rowLabels = () => within(screen.getByRole("table")).getAllByRole("rowheader").map((row) => row.textContent);

  it("最初は住まいのタブ。中央値・件数・幅を押さずに読める", async () => {
    await open("d=kanae");
    expect(tab("住まい")).toHaveAttribute("aria-selected", "true");
    expect(rowLabels()).toEqual([
      "土地（宅地）1m²あたりの中央値。",
      "中古戸建て（築20年以内）総額の中央値。",
      "中古戸建て（築21年以上）総額の中央値。",
      "民営の借家に住む世帯住宅に住む世帯のうち、民営の借家に住む世帯の数と割合。",
    ]);
    expect(cells(tableRow("土地（宅地）"))[1]).toBe("2.4万円/ m²取引96件・参考値幅 1.7万円〜3万円200m²（約60坪）なら 約480万円");
    expect(cells(tableRow("中古戸建て（築20年以内）"))[1]).toBe("3,350万円取引8件・参考値");
    // 借家に住む世帯（034）。家賃は飯田市全体の値なので、地区くらべには出さない
    expect(cells(tableRow("民営の借家に住む世帯"))).toEqual(["データ未取得", "1,511世帯住宅に住む世帯の 約29%", "データ未取得", "データ未取得"]);
    expect(screen.getByRole("tabpanel")).not.toHaveTextContent("家賃");
    expect(screen.getByRole("tabpanel")).toHaveTextContent(NOTICES.market);
    expect(screen.getByRole("tabpanel")).toHaveTextContent(NOTICES.marketFewCount);
    expect(document.body).not.toHaveTextContent(/真ん中の値|件数じゅうぶん|件数少なめ|参考になる件数/);
  });

  it("スマホは選んだ地区を左に固定し、右の地区と読みくらべる。最初の相手は並びで最初の別の地区", async () => {
    await open("d=kanae");
    expect(within(screen.getByRole("tabpanel")).getAllByRole("region").map((region) => region.getAttribute("aria-label"))).toEqual([
      "土地（宅地）",
      "中古戸建て（築20年以内）",
      "中古戸建て（築21年以上）",
      "民営の借家に住む世帯",
    ]);
    expect(screen.queryByRole("region", { name: "出典と対象時点" })).toBeNull();
    expect(screen.getByLabelText(/比べる地区/)).toHaveValue("kamisato");
    const land = mobileRow("土地（宅地）");
    expect(within(land).getAllByRole("term").map((term) => term.textContent)).toEqual(["鼎", "上郷"]);
    expect(within(land).getAllByRole("definition")[0]).toHaveTextContent("2.4万円/ m²取引96件・参考値幅 1.7万円〜3万円200m²（約60坪）なら 約480万円");
  });

  it("比べる地区の選択肢に選んだ地区は出さない。変えると URL の v に残り、タブを変えても続く", async () => {
    await open("d=kanae");
    const picker = screen.getByLabelText(/比べる地区/);
    expect(within(picker).getAllByRole("option").map((option) => option.textContent)).toEqual(["上郷", "伊賀良", "中心市街地"]);
    await act(async () => {
      fireEvent.change(picker, { target: { value: "igara" } });
    });
    expect(url.query).toBe("d=kanae&v=igara");
    expect(within(mobileRow("土地（宅地）")).getAllByRole("term").map((term) => term.textContent)).toEqual(["鼎", "伊賀良"]);
    await act(async () => {
      fireEvent.click(tab("人口"));
    });
    expect(url.query).toBe("d=kanae&v=igara&t=population");
    expect(screen.getByLabelText(/比べる地区/)).toHaveValue("igara");
  });

  it("「4地区を一覧」で4地区を縦に並べ、「2地区で比較」で戻す", async () => {
    await open("t=transport&d=kanae");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "4地区を一覧" }));
    });
    expect(url.query).toBe("t=transport&d=kanae&v=all");
    expect(screen.queryByLabelText(/比べる地区/)).toBeNull();
    expect(within(mobileRow("駅")).getAllByRole("term").map((term) => term.textContent)).toEqual(["上郷", "鼎選んだ地区", "伊賀良", "中心市街地"]);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "2地区で比較" }));
    });
    expect(url.query).toBe("t=transport&d=kanae");
    expect(screen.getByLabelText(/比べる地区/)).toBeInTheDocument();
  });

  it("地区を選んでいないときは4地区の一覧だけを出す", async () => {
    await open("a=2&k=1");
    expect(screen.queryByRole("button", { name: "2地区で比較" })).toBeNull();
    expect(screen.queryByLabelText(/比べる地区/)).toBeNull();
    expect(within(mobileRow("土地（宅地）")).getAllByRole("term")).toHaveLength(4);
  });

  it("タブを押すと URL の t が変わり、条件を残したまま中身が入れかわる", async () => {
    await open("s=winter&d=kanae&a=2&k=1");
    await act(async () => {
      fireEvent.click(tab("交通・防災・施設"));
    });
    expect(url.query).toBe("s=winter&d=kanae&a=2&k=1&t=transport");
    expect(rowLabels()).toEqual(["バス停", "駅", "電車の本数地区の駅を出る1日の本数（上り・下りの合計。特急を除く）。", "指定緊急避難場所", "公共施設"]);
    expect(cells(tableRow("駅"))).toEqual(["データ未取得", "1か所", "該当なし", "データ未取得"]);
    // 時刻が非公開のあいだは運行本数データの平日の本数（031）
    expect(cells(tableRow("電車の本数"))).toEqual(["データ未取得", "38本鼎駅・平日", "データ未取得", "データ未取得"]);
  });

  it("学校・子育てのタブの学区は、市の規則の通う学校を出し、町によって分かれる地区にはその一言を添える（039）", async () => {
    const ZONES = sourceFixture("iida_school_zone_rule", { name: "飯田市立小学校及び中学校の通学区域に関する規則 別表", publisher: "飯田市教育委員会" });
    const zone = (townName: string, elementary: string, juniorHigh: string) => ({ townName, elementarySchools: [elementary], juniorHighSchools: [juniorHigh], isPartial: false });
    screenData = screenDataFixture({
      kanae: { ...KANAE, schoolZones: availableFixture([zone("鼎中平", "鼎小学校", "鼎中学校")], ZONES) },
      chushin: { schoolZones: availableFixture([zone("本町1丁目", "追手町小学校", "飯田東中学校"), zone("曙町", "丸山小学校", "飯田西中学校")], ZONES) },
    });
    await open("t=school&d=kanae");
    expect(cells(tableRow("通う小学校（学区）"))).toEqual(["データ未取得", "鼎小学校", "データ未取得", "追手町小学校・丸山小学校町によって分かれます"]);
    expect(cells(tableRow("通う中学校（学区）"))).toEqual(["データ未取得", "鼎中学校", "データ未取得", "飯田東中学校・飯田西中学校町によって分かれます"]);
    const details = screen.getByRole("tabpanel").querySelector("details") as HTMLDetailsElement;
    expect(details).toHaveTextContent("飯田市教育委員会");
  });

  it("出典は開く欄に、そのタブの項目の分だけを出す", async () => {
    await open("t=population&d=kanae");
    const panel = within(screen.getByRole("tabpanel"));
    expect(panel.getByText(/^出典・対象時点/)).toHaveTextContent("出典・対象時点を見る");
    const details = screen.getByRole("tabpanel").querySelector("details") as HTMLDetailsElement;
    expect(details.open).toBe(false);
    expect(details).toHaveTextContent("総務省統計局「国勢調査 小地域集計」");
    expect(details).not.toHaveTextContent("SENA");
    expect(details).not.toHaveTextContent("集計方法");
  });

  it("住まいの出典の欄には集計方法も出す", async () => {
    await open("d=kanae");
    const details = screen.getByRole("tabpanel").querySelector("details") as HTMLDetailsElement;
    expect(details).toHaveTextContent("出典・対象期間・集計方法を見る");
    expect(details).toHaveTextContent("2021年第1四半期〜2026年第1四半期");
    expect(within(details).getByRole("link", { name: /くわしい計算のしかた/ })).toHaveAttribute("href", "/about-data#about-market");
  });

  it("行事のタブも集めていない季節は「準備中」と出す", async () => {
    await open("t=events&d=kanae");
    expect(cells(tableRow("秋"))[1]).toBe("鼎地区縦断駅伝大会");
    expect(cells(tableRow("春"))[1]).toBe("この季節の行事は準備中です");
  });

  it("下の帯は次のタブへ案内し、最後のタブは最初のタブへ戻す", async () => {
    await open("d=kanae");
    expect(screen.getByRole("link", { name: /学校・子育てを比べる/ })).toHaveAttribute("href", "/kurabe?d=kanae&t=school");
    url.set("/kurabe?d=kanae&t=events");
    await act(async () => {});
    expect(screen.getByRole("link", { name: /住まいを比べる/ })).toHaveAttribute("href", "/kurabe?d=kanae&t=housing");
  });

  it("一覧と行き来できる。一覧ではタブを出さない", async () => {
    await open("d=kanae");
    expect(screen.getAllByRole("link", { name: /すべての項目を一覧で見る/ })[0]).toHaveAttribute("href", "/kurabe?d=kanae&t=all");
    url.set("/kurabe?d=kanae&t=all");
    await act(async () => {});
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.getAllByRole("link", { name: /項目を切りかえて見る/ })[0]).toHaveAttribute("href", "/kurabe?d=kanae&t=housing");
  });

  it("知らない t は最初のタブで開く", async () => {
    await open("t=unknown&d=kanae");
    expect(tab("住まい")).toHaveAttribute("aria-selected", "true");
  });
});

describe("KurabeView：移動", () => {
  it("カルテ・地図へは条件と季節を残して移る。カルテのボタンには地区名を出す", async () => {
    await open("s=winter&d=kanae&a=2&k=1&h=new");
    const karte = "/karte?s=winter&d=kanae&a=2&k=1&h=new";
    expect(screen.getByRole("link", { name: "鼎のカルテに戻る" })).toHaveAttribute("href", karte);
    expect(screen.getByRole("link", { name: /わが家のカルテ/ })).toHaveAttribute("href", karte);
    expect(screen.getByRole("link", { name: "地図で場所を見る" })).toHaveAttribute("href", "/chizu?s=winter&d=kanae&a=2&k=1&h=new");
    const tabs = within(screen.getByRole("navigation", { name: "画面の切り替え" }));
    expect(tabs.getByText("地区くらべ")).toHaveAttribute("aria-current", "page");
    expect(tabs.getByRole("link", { name: "くらし" })).toHaveAttribute("href", "/kurashi?s=winter&d=kanae&a=2&k=1&h=new");
  });

  it("地区を選んでいなくても見られ、目印は付けない。えらぶへ案内する", async () => {
    await open("a=2&k=1");
    expect(screen.queryByText("選んだ地区")).toBeNull();
    expect(screen.queryByRole("link", { name: /カルテ/ })).toBeNull();
    expect(screen.queryByRole("navigation", { name: "画面の切り替え" })).toBeNull();
    expect(screen.getByRole("link", { name: /地区をえらんで/ })).toHaveAttribute("href", "/erabu?a=2&k=1&h=new");
    expect(screen.getByRole("link", { name: "地図で場所を見る" })).toBeInTheDocument();
  });
});

describe("KurabeView：印刷（023）", () => {
  beforeEach(() => {
    window.print = vi.fn();
  });

  it("窓は5項目すべてにチェックを入れて開き、外した項目は紙に出さない。紙はどの項目も4地区を並べる", async () => {
    await open("d=kanae&a=2&k=1&h=new");
    fireEvent.click(screen.getByRole("button", { name: "印刷する" }));
    const sheet = within(screen.getByRole("dialog"));
    const boxes = sheet.getAllByRole("checkbox") as HTMLInputElement[];
    expect(boxes.map((box) => box.labels?.[0].textContent)).toEqual(["住まい", "学校・子育て", "交通・防災・施設", "人口", "季節の行事"]);
    expect(boxes.every((box) => box.checked)).toBe(true);
    fireEvent.click(sheet.getByRole("checkbox", { name: "季節の行事" }));
    await act(async () => {
      fireEvent.click(sheet.getByRole("button", { name: "印刷する" }));
    });
    expect(window.print).toHaveBeenCalledTimes(1);
    const paper = within(document.querySelector("[data-print-document]") as HTMLElement);
    const tables = paper.getAllByRole("table");
    expect(tables).toHaveLength(4);
    for (const table of tables) {
      expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual(["項目", "上郷", "鼎選んだ地区", "伊賀良", "中心市街地"]);
    }
    expect(paper.queryByRole("heading", { name: "季節の行事" })).toBeNull();
    expect(paper.getByText(/地区：鼎/)).toBeInTheDocument();
  });
});
