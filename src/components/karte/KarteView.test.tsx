import { existsSync } from "node:fs";
import { join } from "node:path";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ScreenData } from "@/lib/data/screen-data";
import { NOTICES } from "@/lib/notices";
import { karteScreenData } from "@/test/karte-fixture";
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
    useRouter: () => ({
      push: (href: string) => url.set(href),
      replace: (href: string) => url.set(href),
    }),
    useSearchParams: () => {
      const query = useSyncExternalStore(url.subscribe, () => url.query);
      return useMemo(() => new URLSearchParams(query), [query]);
    },
  };
});

let screenData: ScreenData;
vi.mock("@/lib/data/load-screen-data", () => ({
  loadScreenData: () => Promise.resolve(screenData),
}));

async function open(query: string) {
  url.set(`/karte?${query}`);
  await act(async () => {
    render(<KarteView />);
  });
}

const titlesIn = (name: string) =>
  within(screen.getByRole("list", { name }))
    .getAllByRole("heading", { level: 2 })
    .map((h) => h.textContent);
const minorTitles = () =>
  within(screen.getByRole("list", { name: "そのほかの項目" }))
    .getAllByRole("link")
    .map((link) => link.textContent);
const card = (id: string) => document.getElementById(`karte-${id}`) as HTMLElement;
const tabLabels = () =>
  within(screen.getByRole("navigation", { name: "項目へ移る" }))
    .getAllByRole("link")
    .map((link) => link.textContent);

beforeEach(() => {
  screenData = karteScreenData();
});

describe("KarteView：並びと上部の一文（F-03・4章）", () => {
  it("子どもありは子育て・学校を先に置き、一文で伝える。大きいカード4つと小さいカード3つに分け、タブは7項目を同じ順で", async () => {
    await open("d=kanae&a=2&k=1&h=new");
    expect(titlesIn("くらしの項目")).toEqual(["子育て・学校", "住まい", "交通", "防災"]);
    expect(minorTitles().map((text) => text?.slice(0, 4))).toEqual(["人口地区", "公共施設", "支援制度"]);
    expect(tabLabels()).toEqual(["子育て・学校", "住まい", "交通", "防災", "人口", "公共施設", "支援制度"]);
    expect(screen.getByRole("note", { name: "表示の順番" })).toHaveTextContent(
      "子どもがいるので、子育て・学校の情報を前の方に表示しています。",
    );
    expect(screen.getByText("鼎の暮らしを、ひとつずつ確かめよう。")).toBeInTheDocument();
  });

  it("下の画面の切り替えは「カルテ」を今の画面にし、くらし・地区くらべ・地図へ移れる", async () => {
    await open("s=autumn&d=kanae&a=2&k=1&h=new");
    const tabs = within(screen.getByRole("navigation", { name: "画面の切り替え" }));
    expect(tabs.getByText("カルテ")).toHaveAttribute("aria-current", "page");
    expect(tabs.getByRole("link", { name: "くらし" })).toHaveAttribute("href", "/kurashi?s=autumn&d=kanae&a=2&k=1&h=new");
    expect(tabs.getByRole("link", { name: "地図" })).toHaveAttribute("href", "/chizu?s=autumn&d=kanae&a=2&k=1&h=new");
  });

  it("タブは一覧のカードへ移る", async () => {
    await open("d=kanae&a=2&k=1&h=new");
    const tab = screen.getByRole("link", { name: "防災" });
    expect(tab).toHaveAttribute("href", "#karte-disaster");
    expect(card("disaster")).not.toBeNull();
  });

  it("車0台・大切にしたいことあり：大切にしたいこと → 交通。交通のカードは「車なしで」の問いと注意書き", async () => {
    await open("d=kanae&a=2&k=0&h=new&c=0&p=disaster");
    expect(titlesIn("くらしの項目")).toEqual(["防災", "交通", "住まい", "子育て・学校"]);
    const note = screen.getByRole("note", { name: "表示の順番" });
    expect(note).toHaveTextContent("防災に関する情報を先に表示しています。");
    expect(note).toHaveTextContent("車を持たない暮らしなので、交通の情報を前の方に表示しています。");
    expect(card("transport")).toHaveTextContent("車なしで、どう動く？");
    expect(card("transport")).toHaveTextContent(NOTICES.carFree);
  });

  it("車1台は問いに台数を入れ、車なしの注意書きは出さない", async () => {
    await open("d=kanae&k=1&c=1");
    expect(card("transport")).toHaveTextContent("車1台で、どう動く？");
    expect(card("transport")).not.toHaveTextContent(NOTICES.carFree);
  });
});

describe("KarteView：わが家の確認メモ", () => {
  const memo = () => screen.getByRole("region", { name: "わが家の確認メモ" });

  it("子どもあり・車0台は3つの問いを出し、詳細と地図へつなぐ。カードにも同じ札を付ける", async () => {
    await open("s=winter&d=kanae&a=2&k=2&h=old&c=0");
    const box = within(memo());
    expect(box.getByRole("list", { name: "メモのもとにした条件" })).toHaveTextContent("子ども2人車0台買う・古め");
    expect(box.getByRole("link", { name: "学校・保育施設を見る" })).toHaveAttribute(
      "href",
      "/karte/childcare?s=winter&d=kanae&a=2&k=2&h=old&c=0",
    );
    expect(box.getByRole("link", { name: "駅・バス停を地図で見る" })).toHaveAttribute("href", "/chizu?s=winter&d=kanae&a=2&k=2&h=old&c=0");
    expect(box.getByRole("link", { name: "住まいの詳細を見る" })).toHaveAttribute("href", "/karte/housing?s=winter&d=kanae&a=2&k=2&h=old&c=0");
    expect(card("childcare")).toHaveTextContent("子どもがいるわが家へ");
    expect(card("transport")).toHaveTextContent("車を持たないなら");
    expect(card("housing")).toHaveTextContent("古めの家を買うなら");
    expect(card("disaster")).not.toHaveTextContent("わが家へ");
  });

  it("子どもなし・車ありは住まいの問いだけ", async () => {
    await open("d=kanae&a=2&k=0&h=new&c=1");
    expect(within(memo()).getAllByRole("link").map((link) => link.textContent)).toEqual(["住まいの詳細を見る→"]);
  });
});

describe("KarteView：わが家の設定の車", () => {
  const carOptions = () =>
    within(screen.getByRole("combobox", { name: "車" }))
      .getAllByRole("option")
      .map((option) => [option.textContent, (option as HTMLOptionElement).disabled]);

  it("車は必須なので「未選択」は選択肢に出さない", async () => {
    await open("d=kanae&k=1&c=1");
    expect(carOptions()).toEqual([
      ["0台", false],
      ["1台", false],
      ["2台以上", false],
    ]);
  });

  it("c のない古い URL では、選べない「選んでください」だけを足す", async () => {
    await open("d=kanae&k=1");
    expect(carOptions()[0]).toEqual(["選んでください", true]);
    expect(carOptions()).toHaveLength(4);
  });
});

describe("KarteView：住まいのカード（5章）", () => {
  it("選んだ家に近い相場を、真ん中の値・件数・件数ラベル・注意書き・出典つきで出す", async () => {
    await open("d=kanae&k=0&h=new");
    const housing = card("housing");
    expect(housing).toHaveTextContent("家を買うとしたら？");
    expect(housing).toHaveTextContent("築20年以内の中古戸建て");
    expect(housing).toHaveTextContent("3,350万円");
    expect(housing).toHaveTextContent("過去の取引12件参考になる件数");
    expect(housing).toHaveTextContent(NOTICES.market);
    expect(housing).toHaveTextContent("国土交通省 不動産情報ライブラリ「不動産価格（取引価格・成約価格）情報」");
    expect(housing).toHaveTextContent("2021年第1四半期〜2026年第1四半期");
    expect(housing).not.toHaveTextContent("中央値");
  });

  it("古めは築21年以上を出す。該当がなければ「該当なし」", async () => {
    await open("d=kanae&k=0&h=old");
    expect(card("housing")).toHaveTextContent("築21年以上の中古戸建て");
    expect(card("housing")).toHaveTextContent("該当なし");
  });

  it("借りるは飯田市の家賃の平均と地区の借家の世帯数を、市全体の値だという断り書きと一緒に出す（034）", async () => {
    await open("d=kanae&k=0&h=rent");
    const housing = card("housing");
    expect(housing).toHaveTextContent("家を借りるとしたら？");
    expect(housing).toHaveTextContent("飯田市の民営借家の家賃の平均（1か月）");
    expect(housing).toHaveTextContent("約5.0万円");
    expect(housing).toHaveTextContent("1,511世帯（約29%）");
    expect(housing).toHaveTextContent("飯田市全体の平均で、地区ごとの値ではありません。");
    expect(housing).not.toHaveTextContent("家賃の情報はまだありません");
  });

  it("出典が未公開なら「データ未取得」", async () => {
    await open("d=igara&k=1");
    expect(card("housing")).toHaveTextContent("データ未取得");
  });
});

describe("KarteView：移動（F-04・F-14）", () => {
  it("カードのボタンから、条件と季節を持ったまま詳細のページへ", async () => {
    await open("s=summer&d=kanae&a=2&k=1&h=new");
    expect(within(card("housing")).getByRole("link", { name: /価格の内訳を見る/ })).toHaveAttribute(
      "href",
      "/karte/housing?s=summer&d=kanae&a=2&k=1&h=new",
    );
    expect(
      within(card("disaster")).getByRole("link", {
        name: /避難場所を確かめる/,
      }),
    ).toHaveAttribute("href", "/karte/disaster?s=summer&d=kanae&a=2&k=1&h=new");
    expect(within(card("public_facilities")).getByRole("link")).toHaveAttribute(
      "href",
      "/karte/public-facilities?s=summer&d=kanae&a=2&k=1&h=new",
    );
  });

  it("地区をこの画面のまま切り替えられる", async () => {
    await open("d=kanae&k=1");
    await act(async () => {
      fireEvent.change(screen.getByRole("combobox", { name: "地区を切り替える" }), { target: { value: "igara" } });
    });
    expect(new URLSearchParams(url.query).get("d")).toBe("igara");
    expect(screen.getByText("伊賀良の暮らしを、ひとつずつ確かめよう。")).toBeInTheDocument();
  });

  it("「くらしに戻る」「地区をくらべる」は季節を残す。「条件を変える」はえらぶへ", async () => {
    await open("s=winter&d=kanae&a=2&k=1&h=new");
    expect(screen.getByRole("link", { name: /くらしに戻る/ })).toHaveAttribute("href", "/kurashi?s=winter&d=kanae&a=2&k=1&h=new");
    expect(screen.getByRole("link", { name: "地区をくらべる" })).toHaveAttribute("href", "/kurabe?s=winter&d=kanae&a=2&k=1&h=new");
    expect(screen.getAllByRole("link", { name: "条件を変える" })[0]).toHaveAttribute("href", "/erabu?d=kanae&a=2&k=1&h=new");
  });

  it("地区を選んでいなければ、えらぶへ案内する", async () => {
    await open("a=2&k=1");
    expect(screen.getByRole("link", { name: /地区をえらぶ/ })).toHaveAttribute("href", "/erabu?a=2&k=1&h=new");
  });
});

describe("わが家の設定の欄のアイコン（2026-11-05 まさゆきさん）", () => {
  it("上から順に、歯車・ピン・家・車・ハート・地図・錠の絵を出し、どの絵のファイルもある", async () => {
    await open("d=kamisato");
    const panel = screen.getByRole("complementary", { name: "わが家の設定" });
    const sources = Array.from(panel.querySelectorAll<HTMLImageElement>('img[src*="/settings-"]')).map((image) => image.getAttribute("src") ?? "");
    expect(sources).toEqual(
      ["settings", "district", "housing", "car", "priorities", "districts", "noSignup"].map((icon) => `/illust/settings-${icon}-64.webp`),
    );
    for (const source of sources) {
      expect(existsSync(join(process.cwd(), "public", source))).toBe(true);
    }
  });
});

describe("項目ごとの印（2026-11-05 まさゆきさん）", () => {
  it("タブは7項目それぞれの絵を出す。住まいはわが家の設定の家の絵で、どの絵のファイルもある", async () => {
    await open("d=kamisato");
    const nav = screen.getByRole("navigation", { name: "項目へ移る" });
    const sources = Array.from(nav.querySelectorAll("img")).map((image) => image.getAttribute("src") ?? "");
    expect(new Set(sources)).toEqual(
      new Set([
        "/illust/settings-housing-64.webp",
        ...["childcare", "transport", "disaster", "population", "public_facilities", "support"].map((card) => `/illust/karte-icon-${card}-64.webp`),
      ]),
    );
    for (const source of sources) {
      expect(existsSync(join(process.cwd(), "public", source))).toBe(true);
    }
  });
});

describe("下の帯の絵（2026-11-05 まさゆきさん）", () => {
  it.each(["kamisato", "kanae", "igara", "chushin"])("%s は地区の背景の上を家族が歩き、絵のファイルもある", async (district) => {
    await open(`d=${district}&a=2&k=1`);
    const band = screen.getByRole("navigation", { name: "次は、現地で確かめよう" });
    const background = band.querySelector<HTMLImageElement>(`img[src*="karte-next-step-bg-${district}"]`);
    expect(background).not.toBeNull();
    expect(existsSync(join(process.cwd(), "public", background?.getAttribute("src") ?? ""))).toBe(true);
    expect(band.querySelectorAll('img[src*="/person-"]')).toHaveLength(3);
  });
});

describe("見出しの本の絵（2026-11-05 まさゆきさん）", () => {
  it("PC 用とスマホ用の本を出し、絵のファイルもある", async () => {
    await open("d=kamisato");
    const books = document.querySelectorAll('header img[src="/illust/karte-title-book-96.webp"]');
    expect(books).toHaveLength(2);
    expect(existsSync(join(process.cwd(), "public/illust/karte-title-book-96.webp"))).toBe(true);
  });
});

describe("地区を切りかえたときの知らせ（2026-11-05 まさゆきさん）", () => {
  const status = () => screen.getByRole("status", { name: "地区の切りかえの知らせ" });
  const switchTo = (value: string) =>
    act(async () => void fireEvent.change(screen.getByRole("combobox", { name: "地区を切り替える" }), { target: { value } }));
  // 読み込みの偽物は呼ぶたびに新しい Promise を返すので、毎回 await して描き直しを待つ
  const advance = (ms: number) => act(async () => void vi.advanceTimersByTime(ms));
  const firstCard = () => screen.getByRole("list", { name: "くらしの項目" }).querySelector("li") as HTMLElement;

  afterEach(() => {
    vi.useRealTimers();
  });

  it("開いたときは出さない", async () => {
    await open("d=kamisato");
    expect(status().textContent).toBe("");
  });

  it("切りかえると地区の名前と読みを出し、約1.5秒で消えて、カードを一度だけ強調する", async () => {
    await open("d=kamisato");
    vi.useFakeTimers();
    await switchTo("kanae");
    expect(status().textContent).toContain("鼎のカルテに切り替わりました");
    expect(status().textContent).toContain("かなえ");
    expect(status().textContent).toContain("住まい・学校・交通など、鼎の情報をご覧ください。");
    expect(status().textContent).not.toContain("KANAE");
    expect(firstCard().className).not.toContain("animate-card-glow");

    await advance(1500);
    expect(status().textContent).toBe("");
    expect(firstCard().className).toContain("animate-card-glow");

    await advance(900);
    expect(firstCard().className).not.toContain("animate-card-glow");
  });

  it("続けて切りかえたら、新しい地区に入れかえて数え直す", async () => {
    await open("d=kamisato");
    vi.useFakeTimers();
    await switchTo("kanae");
    await advance(1000);
    await switchTo("chushin");
    expect(status().textContent).toContain("中心市街地のカルテに切り替わりました");
    expect(status().textContent).not.toContain("鼎");
    await advance(1000);
    expect(status().textContent).toContain("中心市街地");
    await advance(500);
    expect(status().textContent).toBe("");
  });

  it("地区以外の条件を変えても出さない。パネルは押せない作りで、閉じるボタンもない", async () => {
    await open("d=kamisato");
    await act(async () => void fireEvent.change(screen.getByRole("combobox", { name: "住まい" }), { target: { value: "old" } }));
    expect(status().textContent).toBe("");
    vi.useFakeTimers();
    await switchTo("igara");
    expect(status().className).toContain("pointer-events-none");
    expect(within(status()).queryByRole("button")).toBeNull();
  });
});

describe("KarteView：印刷（023）", () => {
  beforeEach(() => {
    window.print = vi.fn();
  });

  it("一覧から開くと、まとめと7項目すべてにチェックが入り、並びはカルテと同じ。まとめのあとに項目ごとのページを出す", async () => {
    await open("d=kanae&a=2&k=1&h=new&c=0");
    fireEvent.click(screen.getByRole("button", { name: "印刷する" }));
    const sheet = within(screen.getByRole("dialog"));
    const boxes = sheet.getAllByRole("checkbox") as HTMLInputElement[];
    expect(boxes.map((box) => box.labels?.[0].textContent)).toEqual([
      "カルテのまとめ（一覧）",
      "子育て・学校",
      "交通",
      "住まい",
      "防災",
      "人口",
      "公共施設",
      "支援制度",
    ]);
    expect(boxes.every((box) => box.checked)).toBe(true);
    for (const label of ["交通", "住まい", "防災", "人口", "公共施設", "支援制度"]) fireEvent.click(sheet.getByRole("checkbox", { name: label }));
    await act(async () => {
      fireEvent.click(sheet.getByRole("button", { name: "印刷する" }));
    });
    const paper = document.querySelector("[data-print-document]") as HTMLElement;
    expect(Array.from(paper.querySelectorAll("section[aria-label]"), (section) => section.getAttribute("aria-label")).slice(0, 2)).toEqual([
      "カルテのまとめ",
      "子育て・学校",
    ]);
    // 紙のカードには、画面のカードと同じ id を付けない
    expect(paper.querySelector("[id^='karte-']")).toBeNull();
  });
});
