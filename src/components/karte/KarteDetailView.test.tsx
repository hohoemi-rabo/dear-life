import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { KarteCard } from "@/lib/conditions/labels";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ScreenData } from "@/lib/data/screen-data";
import { NOTICES } from "@/lib/notices";
import { KANAE, karteScreenData } from "@/test/karte-fixture";
import { availableFixture, screenDataFixture, sourceFixture } from "@/test/screen-data-fixture";
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

  it("下の画面の切り替えの「カルテ」は、今の画面を示したまま一覧へ戻る", async () => {
    await open("transport", "s=winter&d=kanae&a=2&k=1&h=new&c=0");
    const karte = within(screen.getByRole("navigation", { name: "画面の切り替え" })).getByRole("link", { name: "カルテ" });
    expect(karte).toHaveAttribute("href", "/karte?s=winter&d=kanae&a=2&k=1&h=new&c=0");
    expect(karte).toHaveAttribute("aria-current", "true");
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

describe("KarteDetailView：住まい以外（住まいと同じ形：大きい数字・注意書き・タブ）", () => {
  const card = (name: string) => screen.getByRole("region", { name });
  const figure = () => screen.getByRole("tabpanel");
  const tabNames = () => screen.getAllByRole("tab").map((tab) => tab.textContent);
  const choose = async (name: RegExp) => {
    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name }));
    });
  };

  it("車0台の交通は、冬のおでかけのタブから開き、本数・注意書き・便・gofreely へのリンクを出す", async () => {
    await open("transport", "d=kanae&a=2&k=0&h=new&c=0");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("車なしで、どう動く？");
    expect(tabNames()).toEqual(["冬のおでかけ", "バス停", "電車"]);
    expect(screen.getByRole("tab", { name: /冬のおでかけ/ })).toHaveAttribute("aria-selected", "true");
    expect(figure()).toHaveTextContent("鼎公民館前から飯田駅前へ乗りかえなしで行くバス（1日）");
    expect(figure()).toHaveTextContent("17本");
    expect(figure()).toHaveTextContent(NOTICES.carFree);
    const main = card("交通");
    expect(main).toHaveTextContent("2027年1月16日（土）の時刻表");
    expect(main).toHaveTextContent("10:01 鼎公民館前発 → 10:11 飯田駅前着");
    expect(within(main).getByRole("link", { name: /この便を gofreely で調べる/ }).getAttribute("href")).toContain("from=");
    expect(within(basis()).getByRole("row", { name: /出典/ })).toHaveTextContent("GTFSデータリポジトリ「南信州のバス」");
  });

  it("車1台以上は冬のおでかけのタブを出さず、バス停から開く。電車のタブは駅と本数（未公開ならデータ未取得）", async () => {
    await open("transport", "d=kanae&k=1&c=1");
    expect(tabNames()).toEqual(["バス停", "電車"]);
    expect(figure()).toHaveTextContent("地区のバス停2か所");
    expect(figure()).not.toHaveTextContent(NOTICES.carFree);
    await choose(/電車/);
    expect(figure()).toHaveTextContent("地区の駅1か所");
    expect(card("交通")).toHaveTextContent("駅ごとの1日の本数（特急を除く）データ未取得");
    expect(within(basis()).getByRole("row", { name: /出典/ })).toHaveTextContent("SENA「JR飯田線の駅」");
  });

  it("電車の本数があれば、いちばん本数の多い駅の上り・下りの合計を大きく出す", async () => {
    screenData = screenDataFixture({
      kanae: {
        ...KANAE,
        trainDepartures: availableFixture(
          [
            { stationName: "鼎", direction: "上り", tripsPerDay: 20, firstDeparture: "06:13", lastDeparture: "23:52" },
            { stationName: "鼎", direction: "下り", tripsPerDay: 18, firstDeparture: "05:06", lastDeparture: "23:04" },
          ],
          sourceFixture("iida_jr_timetable"),
        ),
      },
    });
    await open("transport", "d=kanae&k=1&c=1");
    await choose(/電車/);
    expect(figure()).toHaveTextContent("鼎駅を出る電車（1日・特急を除く）38本上り・下りの合計");
    expect(card("交通")).toHaveTextContent("下り（辰野方面）18本5:0623:04");
  });

  it("時刻が非公開のあいだは、運行本数データの平日の本数を出し、始発・最終は出さない（031）", async () => {
    screenData = screenDataFixture({
      kanae: {
        ...KANAE,
        trainCounts: availableFixture(
          [
            { stationName: "鼎", direction: "上り", tripsPerDay: 19 },
            { stationName: "鼎", direction: "下り", tripsPerDay: 19 },
          ],
          sourceFixture("railway_honsu", { name: "全国鉄道運行本数データ", publisher: "地域・交通データ研究所（西澤明）" }),
        ),
      },
    });
    await open("transport", "d=kanae&k=1&c=1");
    await choose(/電車/);
    expect(figure()).toHaveTextContent("鼎駅を出る電車（平日1日・特急を除く）38本上り・下りの合計");
    expect(card("交通")).toHaveTextContent("本数（平日）");
    expect(card("交通")).toHaveTextContent("下り（辰野方面）19本");
    expect(card("交通")).not.toHaveTextContent("始発");
    expect(basis()).toHaveTextContent("地域・交通データ研究所（西澤明）「全国鉄道運行本数データ」");
  });

  it("防災は災害の種類のタブで避難場所を絞る。大規模な火事は使える場所がなければタブにしない", async () => {
    await open("disaster", "d=kanae&k=1");
    expect(tabNames()).toEqual(["すべて1", "洪水1", "土砂災害1", "地震0"]);
    expect(figure()).toHaveTextContent("地区の指定緊急避難場所1か所");
    expect(card("防災")).toHaveTextContent("使える災害：洪水・土砂災害");
    await choose(/地震/);
    expect(figure()).toHaveTextContent("地震のときに使える指定緊急避難場所0か所");
    expect(card("防災")).not.toHaveTextContent("鼎小学校");
    const table = within(basis());
    expect(table.getByRole("row", { name: /出典/ })).toHaveTextContent("飯田市「指定緊急避難場所一覧」");
    expect(table.getByRole("row", { name: /確認日/ })).toHaveTextContent("2026年10月26日");
  });

  it("人口はタブなしで、人数・対象時点と年齢の割合", async () => {
    await open("population", "d=kanae&k=1");
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
    expect(figure()).toHaveTextContent("地区の人口（2020年10月1日時点）12,000人");
    expect(card("人口")).toHaveTextContent("14歳以下1,500人12.5%");
  });

  it("子育て・学校は学区から開き、学校のタブは数と種類ごとの内訳・一覧", async () => {
    const education = sourceFixture("iida_education", { name: "教育機関一覧", publisher: "飯田市" });
    screenData = screenDataFixture({
      kanae: {
        ...KANAE,
        elementarySchoolDistricts: availableFixture(["鼎小学校"], sourceFixture("reinfolib_xkt004")),
        schools: availableFixture(
          [
            { name: "鼎小学校", subkind: "小学校", address: null },
            { name: "鼎中学校", subkind: "中学校", address: null },
          ],
          education,
        ),
      },
    });
    await open("childcare", "d=kanae&k=1");
    expect(tabNames()).toEqual(["学区", "学校", "保育園など", "放課後クラブ"]);
    expect(figure()).toHaveTextContent("小学校鼎小学校");
    expect(figure()).toHaveTextContent("中学校データ未取得");
    expect(figure()).toHaveTextContent(NOTICES.schoolDistrict);
    await choose(/学校/);
    expect(figure()).toHaveTextContent("地区にある学校2校小学校1・中学校1");
    expect(card("子育て・学校")).toHaveTextContent("学校の一覧（2か所）");
    expect(within(basis()).getByRole("row", { name: /出典/ })).toHaveTextContent("飯田市「教育機関一覧」");
  });

  it("出典が未公開なら「データ未取得」、駅のない地区は「地区内に駅はありません。」", async () => {
    for (const item of ["childcare", "transport", "disaster", "population", "public_facilities", "support"] as const) {
      await open(item, "d=igara&k=1");
      expect(figure()).toHaveTextContent("データ未取得");
      if (item === "transport") {
        await choose(/電車/);
        expect(figure()).toHaveTextContent("地区内に駅はありません。");
      }
      document.body.innerHTML = "";
    }
  });

  it("支援制度は種類のタブで絞り、制度名・概要・公式リンク・確認日と、公式で確認する注意書きを出す", async () => {
    screenData = {
      ...screenData,
      supportPrograms: [
        {
          name: "移住支援金",
          summary: "東京圏から移住した人への支援金",
          category: "移住",
          officialUrl: "https://www.city.iida.lg.jp/x",
          checkedOn: "2026-10-26",
        },
        { name: "子育て応援", summary: "子育ての支援", category: "子育て", officialUrl: "https://www.city.iida.lg.jp/y", checkedOn: "2026-10-26" },
      ],
    };
    await open("support", "d=kanae&k=1");
    expect(tabNames()).toEqual(["すべて2", "移住1", "子育て1"]);
    const support = card("支援制度");
    expect(within(support).getByRole("link", { name: /移住支援金/ })).toHaveAttribute("href", "https://www.city.iida.lg.jp/x");
    expect(figure()).toHaveTextContent(NOTICES.support);
    expect(support).toHaveTextContent("2026年10月26日");
    expect(support).not.toHaveTextContent("対象になります");
    await choose(/子育て/);
    expect(figure()).toHaveTextContent("子育ての支援制度（飯田市全体）1件");
    expect(within(support).queryByRole("link", { name: /移住支援金/ })).toBeNull();
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
