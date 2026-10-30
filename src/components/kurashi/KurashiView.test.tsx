import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BusOuting, DistrictData, DistrictEvent, ScreenData, SceneTemplate } from "@/lib/data/screen-data";
import { EVENTS_CREDIT } from "@/lib/credits";
import { NOTICES } from "@/lib/notices";
import { SCENE_TEMPLATE_DRAFTS } from "@/lib/scenes/drafts";
import { availableFixture, screenDataFixture, sourceFixture } from "@/test/screen-data-fixture";
import { KurashiView } from "./KurashiView";

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
    usePathname: () => "/kurashi",
    useRouter: () => ({ push: (href: string) => url.set(href), replace: (href: string) => url.set(href) }),
    useSearchParams: () => {
      const query = useSyncExternalStore(url.subscribe, () => url.query);
      return useMemo(() => new URLSearchParams(query), [query]);
    },
  };
});

let screenData: ScreenData;
vi.mock("@/lib/data/load-screen-data", () => ({ loadScreenData: () => Promise.resolve(screenData) }));

const CHILDCARE = sourceFixture("iida_childcare", { name: "子育て施設", publisher: "飯田市", checkedOn: "2026-10-24", fetchedOn: null });
const BUS = sourceFixture("gtfs_minamishinshu_bus", { name: "南信州のバス", publisher: "GTFSデータリポジトリ" });
const WINTER = sourceFixture("rakuen_shinshu_iida_sheet");

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
    participation: "自由参加",
    participationNote: null,
    isForChildren: false,
    art: "運動会",
    sourceNote: "令和7年度 飯田市の公民館活動",
    checkedOn: "2026-10-26",
    ...extra,
  };
}

const KANAE: Partial<DistrictData> = {
  childcare: availableFixture(
    [
      { name: "かなえ保育園", subkind: "認可公立保育所", address: "鼎中平1" },
      { name: "みどり園", subkind: "認可私立保育所", address: "鼎東鼎2" },
    ],
    CHILDCARE,
  ),
  busOuting: availableFixture(BUS_OUTING, BUS),
  events: [
    event("鼎地区運動会"),
    event("子ども祭り", { isForChildren: true, art: "祭り", scope: "区ごと", participation: "区や組ごと" }),
  ],
};

// 下書きのひな形を公開済みとして入れた ScreenData
function published(kanae: Partial<DistrictData> = KANAE): ScreenData {
  const templates: SceneTemplate[] = SCENE_TEMPLATE_DRAFTS.map((draft, index) => ({ id: index + 1, ...draft }));
  return { ...screenDataFixture({ kanae }), sources: [WINTER], sceneTemplates: templates };
}

async function open(query: string) {
  url.set(`/kurashi?${query}`);
  await act(async () => {
    render(<KurashiView />);
  });
}

const params = () => new URLSearchParams(url.query);
const sceneWindow = () => screen.getByRole("region", { name: /^.｜/ });

beforeEach(() => {
  screenData = published();
});

describe("KurashiView：季節の切り替え（F-11）", () => {
  it("最初は春。季節のボタンで切り替え、季節は URL の s に入る", async () => {
    await open("d=kanae&a=2&k=1&h=new");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^鼎で、わが家の春(がはじまる)?。$/);
    expect(screen.getByRole("group", { name: "季節" })).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "季節" })).getByRole("button", { name: "春" })).toHaveAttribute("aria-pressed", "true");

    await act(async () => {
      fireEvent.click(within(screen.getByRole("group", { name: "季節" })).getByRole("button", { name: "夏" }));
    });
    expect(params().get("s")).toBe("summer");
    expect(params().get("d")).toBe("kanae");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^鼎で、わが家の夏(がはじまる)?。$/);
    expect(sceneWindow()).toHaveTextContent("大雨と避難");
  });

  it("URL の季節で開く", async () => {
    await open("d=kanae&s=autumn");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^鼎で、わが家の秋(がはじまる)?。$/);
  });
});

describe("KurashiView：場面（F-12）", () => {
  it("ドット絵1枚と、文の種類ごとの印、出典の番号、カルテの該当カードへのリンクを出す", async () => {
    await open("d=kanae&a=2&k=1&h=new");
    expect(screen.getByRole("img", { name: /春の景色/ })).toBeInTheDocument();
    expect(screen.getByText("鼎の春")).toBeInTheDocument();

    const scene = sceneWindow();
    expect(scene).toHaveTextContent("春｜入園・入学の季節");
    expect(within(scene).getByText(/鼎には、保育園・幼稚園等が2か所あります。/)).toHaveTextContent("出典1");
    expect(within(scene).getByText(/春、入園と入学の季節です。/)).toHaveTextContent("想定");
    // 学区はデータ未取得なので、文を出さずに知らせにする
    expect(within(scene).getByText(/データ未取得/)).toBeInTheDocument();
    expect(within(scene).getByRole("link", { name: /子育て・学校をカルテで確認/ })).toHaveAttribute(
      "href",
      "/karte?s=spring&d=kanae&a=2&k=1&h=new#karte-childcare",
    );
    expect(within(scene).getByText(NOTICES.schoolDistrict)).toBeInTheDocument();

    fireEvent.click(within(scene).getByText("出典・確認日を見る"));
    expect(within(scene).getByText("飯田市「子育て施設」")).toBeInTheDocument();
  });

  it("冬・車0台：本物の便と、いつの時刻表かを出す", async () => {
    await open("d=kanae&c=0&s=winter");
    const scene = sceneWindow();
    expect(scene).toHaveTextContent("土曜日、鼎公民館前を10:01に出るバスに乗り");
    expect(within(scene).getByText("2027年1月16日（土）の時刻表")).toBeInTheDocument();
    const gofreely = within(scene).getByRole("link", { name: /この便を gofreely で調べる/ });
    expect(gofreely).toHaveAttribute("target", "_blank");
    expect(gofreely.getAttribute("href")).toMatch(/^https:\/\/gofreely\.rabo-hohoemi\.workers\.dev\/\?from=/);
    expect(within(scene).getByText(NOTICES.carFree)).toBeInTheDocument();
    expect(within(scene).getByRole("link", { name: /交通をカルテで確認/ })).toHaveAttribute(
      "href",
      "/karte?s=winter&d=kanae&a=2&k=1&h=new&c=0#karte-transport",
    );
  });

  it("ひな形がまだ公開されていない季節も、絵は出して文章は「準備中」と出す", async () => {
    screenData = { ...published(), sceneTemplates: [] };
    await open("d=kanae");
    expect(screen.getByRole("img", { name: /春の景色/ })).toBeInTheDocument();
    expect(sceneWindow()).toHaveTextContent("この季節の場面の文章は準備中です。");
  });
});

describe("KurashiView：地区の行事（F-13）", () => {
  it("その季節の行事がなければ「準備中」と出す", async () => {
    await open("d=kanae");
    expect(screen.getByRole("region", { name: "春の楽しみ" })).toHaveTextContent("この季節の行事は準備中です。");
  });

  it("「秋の楽しみ」から行事のシートを開く。子ども向けを先に出し、区ごとの行事は「区によって違います」。確認日と注意書きを添える", async () => {
    await open("d=kanae&k=1&s=autumn");
    const card = screen.getByRole("region", { name: "秋の楽しみ" });
    expect(card).toHaveTextContent("子ども祭り");
    await act(async () => {
      fireEvent.click(within(card).getByRole("button"));
    });
    const sheet = screen.getByRole("dialog", { name: "鼎の秋の行事" });
    const titles = within(sheet).getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent);
    expect(titles).toEqual(["子ども祭り", "鼎地区運動会"]);
    expect(sheet).toHaveTextContent("区によって違います");
    expect(sheet).toHaveTextContent("確認日 2026年10月26日");
    expect(within(sheet).getByText(EVENTS_CREDIT)).toBeInTheDocument();
  });
});

describe("KurashiView：地区の切り替えと移動（F-04・F-14）", () => {
  it("条件の「変更」から地区をこの画面のまま切り替えられ、季節はそのまま。ほかの条件はえらぶで選び直す", async () => {
    await open("d=kanae&s=summer");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "条件を変更" }));
    });
    const sheet = screen.getByRole("dialog", { name: "地区を切り替える" });
    expect(within(sheet).getByRole("link", { name: /家族・住まい・車を選び直す/ })).toHaveAttribute("href", "/erabu?d=kanae&a=2&k=1&h=new");
    await act(async () => {
      fireEvent.click(within(sheet).getByRole("button", { name: "伊賀良" }));
    });
    expect(params().get("d")).toBe("igara");
    expect(params().get("s")).toBe("summer");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^伊賀良で、わが家の夏(がはじまる)?。$/);
  });

  it("どの季節からも「わが家のカルテへ」を出し、下のタブで地区くらべ・地図へ移れる", async () => {
    await open("d=kanae&s=autumn");
    expect(screen.getByRole("link", { name: /わが家のカルテへ/ })).toHaveAttribute("href", "/karte?s=autumn&d=kanae&a=2&k=1&h=new");
    const tabs = screen.getByRole("navigation", { name: "画面の切り替え" });
    expect(within(tabs).getByText("くらし")).toHaveAttribute("aria-current", "page");
    expect(within(tabs).getByRole("link", { name: "カルテ" })).toHaveAttribute("href", "/karte?s=autumn&d=kanae&a=2&k=1&h=new");
    expect(within(tabs).getByRole("link", { name: "地区くらべ" }).getAttribute("href")).toMatch(/^\/kurabe\?/);
    expect(within(tabs).getByRole("link", { name: "地図" }).getAttribute("href")).toMatch(/^\/chizu\?/);
  });

  it("地区がまだないときは、えらぶへ案内する", async () => {
    await open("");
    expect(screen.getByText(/住む地区がまだ選ばれていません/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /地区をえらぶ/ })).toHaveAttribute("href", "/erabu?a=2&k=1&h=new");
  });

  it("PC の季節の絵からも季節を切り替えられる", async () => {
    await open("d=kanae");
    await act(async () => {
      fireEvent.click(within(screen.getByRole("list", { name: "季節の場面" })).getByRole("button", { name: "冬の場面" }));
    });
    expect(params().get("s")).toBe("winter");
  });
});

const KAMISATO_SCHOOLS = sourceFixture("iida_education", { name: "教育機関一覧", publisher: "飯田市", checkedOn: "2026-10-24", fetchedOn: null });

const KAMISATO: Partial<DistrictData> = {
  schools: availableFixture(
    [
      { name: "上郷小学校", subkind: "小学校", address: "上郷飯沼1" },
      { name: "高陵中学校", subkind: "中学校", address: "上郷黒田1" },
    ],
    KAMISATO_SCHOOLS,
  ),
  childcare: availableFixture([{ name: "上郷保育園", subkind: "認可公立保育所", address: "上郷別府1" }], CHILDCARE),
};

describe("KurashiView：上郷・春の風景とピン（028）", () => {
  beforeEach(() => {
    screenData = { ...published(), districts: { ...published().districts, kamisato: { ...published().districts.kamisato, ...KAMISATO } } };
  });

  const pin = (name: string) => screen.getByRole("button", { name, expanded: false });

  it("風景に学校・地域の行事・住まいのピンを立てる。子どもなしのときは公共施設のピンも足す", async () => {
    await open("d=kamisato&a=2&k=1&h=new");
    expect(screen.getByRole("group", { name: /上郷の春の風景（イメージ）。家族：大人2人・子ども1人/ })).toBeInTheDocument();
    for (const name of ["学校", "地域の行事", "住まい"]) expect(pin(name)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "公共施設" })).not.toBeInTheDocument();
    // 場面の文は風景の下ではなく、ピンのシートに出す
    expect(screen.queryByText(/入園と入学の季節です/)).not.toBeInTheDocument();
    cleanup();

    await open("d=kamisato&a=2&k=0&h=new");
    expect(pin("学校")).toBeInTheDocument();
    expect(pin("公共施設")).toBeInTheDocument();
  });

  it("学校のピンを押すと、小学校の数を見出しにしたシートに場面の文・出典・カルテの子育て・学校へのボタンを出す", async () => {
    await open("d=kamisato&a=2&k=1&h=new");
    await act(async () => {
      fireEvent.click(pin("学校"));
    });
    const sheet = screen.getByRole("dialog", { name: "上郷の小学校は1校" });
    expect(sheet).toHaveTextContent("暮らしの発見");
    expect(within(sheet).getByText(/上郷には、保育園・幼稚園等が1か所あります。/)).toHaveTextContent("出典");
    expect(within(sheet).getByText(/春、入園と入学の季節です。/)).toHaveTextContent("想定");
    expect(within(sheet).getByText(NOTICES.schoolDistrict)).toBeInTheDocument();
    expect(sheet).toHaveTextContent("出典：飯田市「教育機関一覧」");
    expect(within(sheet).getByRole("link", { name: /学区と場所を確かめる/ })).toHaveAttribute(
      "href",
      "/karte?s=spring&d=kamisato&a=2&k=1&h=new#karte-childcare",
    );
    await act(async () => {
      fireEvent.click(within(sheet).getByRole("button", { name: "風景にもどる" }));
      // 閉じる動きのあとで閉じる（BottomSheet）
      await new Promise((resolve) => setTimeout(resolve, 250));
    });
    expect(sheet).not.toHaveAttribute("open");
    expect(pin("学校")).toBeInTheDocument();
  });

  it("小学校の数が出せないときは、見出しから数を外して「データ未取得」と出す", async () => {
    screenData = published();
    await open("d=kamisato&a=2&k=1&h=new");
    await act(async () => {
      fireEvent.click(pin("学校"));
    });
    const sheet = screen.getByRole("dialog", { name: "上郷の小学校" });
    expect(sheet).toHaveTextContent("データ未取得");
  });

  it("住まいのピン：借りるときは家賃を「データ未取得」と出す", async () => {
    await open("d=kamisato&a=2&k=1&h=rent");
    await act(async () => {
      fireEvent.click(pin("住まい"));
    });
    const sheet = screen.getByRole("dialog", { name: "借りるときの家賃" });
    expect(sheet).toHaveTextContent("データ未取得");
    expect(within(sheet).getByRole("link", { name: /住まいの相場を確かめる/ })).toHaveAttribute(
      "href",
      "/karte?s=spring&d=kamisato&a=2&k=1&h=rent#karte-housing",
    );
  });

  it("地域の行事のピン：その季節の行事がまだなければ「準備中」と出す", async () => {
    await open("d=kamisato&a=2&k=1&h=new");
    await act(async () => {
      fireEvent.click(pin("地域の行事"));
    });
    expect(screen.getByRole("dialog", { name: "上郷の春の行事" })).toHaveTextContent("この季節の行事は準備中です。");
  });

  it("上郷でもほかの季節は、今のドット絵と場面の文で出す（ピンはない）", async () => {
    await open("d=kamisato&a=2&k=1&h=new&s=summer");
    expect(sceneWindow()).toHaveTextContent("大雨と避難");
    expect(screen.queryByRole("button", { name: "学校" })).not.toBeInTheDocument();
  });
});
