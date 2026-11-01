import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

  it("借りるは家賃の情報がないことを出し、土地の相場を参考として見せる", async () => {
    await open("d=kanae&k=0&h=rent");
    const housing = card("housing");
    expect(housing).toHaveTextContent("家を借りるとしたら？");
    expect(housing).toHaveTextContent("家賃の情報はまだありません。");
    expect(housing).toHaveTextContent("参考：土地（宅地）（1m²あたり）");
    expect(housing).toHaveTextContent("2.4万円／m²");
    expect(housing.textContent).not.toContain("㎡");
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
