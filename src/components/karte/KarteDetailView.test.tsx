import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { KarteCard } from "@/lib/conditions/labels";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ScreenData } from "@/lib/data/screen-data";
import { NOTICES } from "@/lib/notices";
import { karteScreenData } from "@/test/karte-fixture";
import { KarteDetailView } from "./KarteDetailView";

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
    usePathname: () => "/karte/housing",
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

async function open(card: KarteCard, query: string) {
  url.set(`/karte/x?${query}`);
  await act(async () => {
    render(<KarteDetailView card={card} />);
  });
}

const prices = () => screen.getByRole("tabpanel");
const basis = () => screen.getByText("数字の根拠を見る").closest("details") as HTMLDetailsElement;

beforeEach(() => {
  screenData = karteScreenData();
});

describe("KarteDetailView：住まい（5章）", () => {
  it("番号・問い・選んだ家の相場（真ん中の値・件数・件数ラベル・注意書き）と、数字の根拠を出す", async () => {
    await open("housing", "d=kanae&a=2&k=1&h=new");
    // 子どもありは子育て・学校が1番目なので、住まいは2番目
    expect(screen.getByText("02")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("家を買うとしたら、いくらくらい？");
    expect(prices()).toHaveTextContent("中古戸建て（築20年以内）の真ん中の値");
    expect(prices()).toHaveTextContent("3,350万円");
    expect(prices()).toHaveTextContent("過去の取引 12件参考になる件数");
    expect(prices()).toHaveTextContent(NOTICES.market);
    expect(screen.getByText("鼎で過去に取引された住宅の参考値です。")).toBeInTheDocument();
    const table = within(basis());
    expect(table.getByRole("row", { name: /集計対象/ })).toHaveTextContent("鼎・築20年以内の中古戸建て");
    expect(table.getByRole("row", { name: /対象期間/ })).toHaveTextContent("2021年第1四半期〜2026年第1四半期");
    expect(table.getByRole("row", { name: /取得日/ })).toHaveTextContent("2026年10月26日");
    expect(document.body).not.toHaveTextContent("中央値");
  });

  it("土地のタブは真ん中の値・幅・坪単価・200m²の目安。ほかの築年数で件数0なら「該当なし」", async () => {
    await open("housing", "d=kanae&k=0&h=new");
    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name: /土地/ }));
    });
    expect(screen.getByRole("tab", { name: /土地/ })).toHaveAttribute("aria-selected", "true");
    expect(prices()).toHaveTextContent("2.4万円／m²");
    expect(prices()).toHaveTextContent("96件件数じゅうぶん");
    expect(prices()).toHaveTextContent("1.7万円〜3万円／m²");
    expect(prices()).toHaveTextContent("約7.93万円／坪");
    expect(prices()).toHaveTextContent("約480万円");
    expect(prices().textContent).not.toContain("㎡");
    expect(screen.getByText("鼎で過去に取引された土地の参考値です。")).toBeInTheDocument();
    expect(within(basis()).getByRole("row", { name: /集計対象/ })).toHaveTextContent("鼎・土地（宅地）");

    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name: /ほかの築年数/ }));
    });
    expect(prices()).toHaveTextContent("中古戸建て（築21年以上）の真ん中の値");
    expect(prices()).toHaveTextContent("該当なし");
  });

  it("借りるは「選んだ家」に家賃の情報がないことを出し、売買の相場はほかのタブで見せる", async () => {
    await open("housing", "d=kanae&k=0&h=rent");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("家を借りるとしたら、いくらくらい？");
    expect(prices()).toHaveTextContent("家賃の情報はまだありません。");
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["選んだ家", "築20年以内", "築21年以上", "土地"]);
    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name: /築20年以内/ }));
    });
    expect(prices()).toHaveTextContent("3,350万円");
  });

  it("確かめたいことは押せる（どこにも保存しない）", async () => {
    await open("housing", "d=kanae&k=0&h=new");
    const check = screen.getByRole("checkbox", { name: "土地・建物の広さ" });
    fireEvent.click(check);
    expect(check).toBeChecked();
    expect(url.query).toBe("d=kanae&k=0&h=new");
  });
});

describe("KarteDetailView：住まい以外", () => {
  it("車0台の交通は、注意書きと冬の場面の便、gofreely へのリンクを出す", async () => {
    await open("transport", "d=kanae&a=2&k=0&h=new&c=0");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("車なしで、どう動く？");
    const main = screen.getByRole("region", { name: "交通" });
    expect(main).toHaveTextContent(NOTICES.carFree);
    expect(main).toHaveTextContent("2027年1月16日（土）の時刻表");
    expect(main).toHaveTextContent("10:01 鼎公民館前発 → 10:11 飯田駅前着");
    expect(
      within(main)
        .getByRole("link", { name: /この便を gofreely で調べる/ })
        .getAttribute("href"),
    ).toContain("from=");
  });

  it("車1台以上は冬の便を出さない", async () => {
    await open("transport", "d=kanae&k=1&c=1");
    expect(screen.getByRole("region", { name: "交通" })).not.toHaveTextContent("冬の場面で使ったバスの便");
  });

  it("防災・人口は値と出典・対象・確認日を出す", async () => {
    await open("disaster", "d=kanae&k=1");
    const disaster = screen.getByRole("region", { name: "防災" });
    expect(disaster).toHaveTextContent("飯田市「指定緊急避難場所一覧」");
    expect(disaster).toHaveTextContent("確認日2026年10月26日");
    expect(disaster).toHaveTextContent("洪水・土砂災害");
    expect(within(basis()).getByRole("row", { name: /出典/ })).toHaveTextContent("飯田市「指定緊急避難場所一覧」");
  });

  it("人口は人数と年齢の割合、対象時点", async () => {
    await open("population", "d=kanae&k=1");
    const population = screen.getByRole("region", { name: "人口" });
    expect(population).toHaveTextContent("12,000人");
    expect(population).toHaveTextContent("12.5%");
    expect(population).toHaveTextContent("2020年10月1日時点");
  });

  it("出典が未公開なら「データ未取得」、駅のない地区は「地区内に駅はありません。」", async () => {
    for (const card of ["childcare", "transport", "disaster", "population", "public_facilities", "support"] as const) {
      await open(card, "d=igara&k=1");
      expect(screen.getByRole("region", { name: /./ })).toHaveTextContent("データ未取得");
      if (card === "transport") expect(screen.getByRole("region", { name: "交通" })).toHaveTextContent("地区内に駅はありません。");
      document.body.innerHTML = "";
    }
  });

  it("支援制度は制度名・概要・公式リンク・確認日と、公式で確認する注意書きを出す", async () => {
    screenData = {
      ...screenData,
      supportPrograms: [
        {
          name: "移住支援金",
          summary: "東京圏から移住した人への支援金",
          category: "住まい",
          officialUrl: "https://www.city.iida.lg.jp/x",
          checkedOn: "2026-10-26",
        },
      ],
    };
    await open("support", "d=kanae&k=1");
    const support = screen.getByRole("region", { name: "支援制度" });
    expect(within(support).getByRole("link", { name: /移住支援金/ })).toHaveAttribute("href", "https://www.city.iida.lg.jp/x");
    expect(support).toHaveTextContent(NOTICES.support);
    expect(support).toHaveTextContent("2026年10月26日");
    expect(support).not.toHaveTextContent("対象になります");
  });
});

describe("KarteDetailView：移動", () => {
  it("「カルテ一覧」と地図へのボタンは、条件と季節を持ったまま", async () => {
    await open("disaster", "s=winter&d=kanae&a=2&k=1&h=new");
    expect(screen.getByRole("link", { name: "カルテ一覧" })).toHaveAttribute("href", "/karte?s=winter&d=kanae&a=2&k=1&h=new");
    expect(screen.getByRole("link", { name: /カルテ一覧へ/ })).toHaveAttribute("href", "/karte?s=winter&d=kanae&a=2&k=1&h=new");
    expect(screen.getByRole("link", { name: /地図で周辺を確かめる/ }).getAttribute("href")).toMatch(/^\/chizu\?s=winter&d=kanae/);
  });

  it("地区を選んでいなければ、えらぶへ案内する", async () => {
    await open("housing", "a=2&k=1");
    expect(screen.getByRole("link", { name: /地区をえらぶ/ })).toHaveAttribute("href", "/erabu?a=2&k=1&h=new");
  });
});
