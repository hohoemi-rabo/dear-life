import { act, cleanup as cleanupRender, fireEvent, render, screen, within } from "@testing-library/react";
import type { KarteCard } from "@/lib/conditions/labels";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EvacuationSite, ScreenData } from "@/lib/data/screen-data";
import { NOTICES } from "@/lib/notices";
import { KANAE, karteScreenData } from "@/test/karte-fixture";
import { availableFixture, compareCityFixture, compareMetricFixture, screenDataFixture, sourceFixture } from "@/test/screen-data-fixture";
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
const EVACUATION = sourceFixture("iida_evacuation", { name: "指定緊急避難場所一覧", publisher: "飯田市", checkedOn: "2026-10-26", fetchedOn: null });
const PUBLIC_FACILITIES = [
  { name: "城東2号公園", subkind: "公園", address: "長野県飯田市鼎1" },
  { name: "鼎図書館", subkind: "図書館", address: null },
  { name: "鼎公民館", subkind: "公民館", address: null },
  { name: "野底山森林公園", subkind: "公園", address: null },
  { name: "市立病院", subkind: "病院・診療所", address: null },
];
function withPublicFacilities(facilities: typeof PUBLIC_FACILITIES): ScreenData {
  const kanae = screenData.districts.kanae;
  return {
    ...screenData,
    districts: { ...screenData.districts, kanae: { ...kanae, publicFacilities: availableFixture(facilities, sourceFixture("iida_public_facilities")) } },
  };
}
vi.mock("@/lib/data/load-screen-data", () => ({
  loadScreenData: () => Promise.resolve(screenData),
}));

async function open(card: KarteCard, query: string) {
  url.set(`/karte/x?${query}`);
  await act(async () => {
    render(<KarteDetailView card={card} />);
  });
}

const basis = () => screen.getByText("数字の根拠を見る").closest("details") as HTMLDetailsElement;
const section = (name: string) => screen.getByRole("region", { name });
const houseCard = () => section("中古戸建ての取引価格を見比べる");
const houseOption = (name: string) => within(houseCard()).getByRole("heading", { level: 3, name }).parentElement as HTMLElement;

beforeEach(() => {
  screenData = karteScreenData();
  localStorage.clear();
});

describe("KarteDetailView：住まい（5章）", () => {
  it("番号・問い・選んだ条件の札、築年数の2枚（選んだほうに「選んだ条件」）・注意書き・土地のカードと、閉じた出典・集計条件を出す（040）", async () => {
    await open("housing", "d=kanae&a=2&k=1&h=new");
    // 子どもありは子育て・学校が1番目なので、住まいは2番目
    expect(screen.getByText("02")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("家を買うとしたら、いくらくらい？");
    expect(screen.getByText(/選んだ条件：買う・新しめ/)).toBeInTheDocument();
    const houses = houseCard();
    expect(houses).toHaveTextContent("鼎・過去の取引価格の中央値");
    expect(houseOption("築20年以内")).toHaveTextContent("選んだ条件築20年以内3,350万円取引12件・参考値");
    // 鼎の築21年以上は件数0
    expect(houseOption("築21年以上")).toHaveTextContent("築21年以上該当なし");
    expect(houseOption("築21年以上")).not.toHaveTextContent("選んだ条件");
    expect(houses).toHaveTextContent(NOTICES.marketHousingDetail);
    // 土地は中央値と200m²の目安だけ。幅と坪単価は出さない（2026-11-13 まさゆきさん）
    const land = section("土地（宅地）の取引価格");
    expect(land).toHaveTextContent("中央値2.4万円/ m²取引96件・参考値");
    expect(land).toHaveTextContent("200m²なら約480万円（土地のみ）");
    expect(land).not.toHaveTextContent(/坪|幅|1\.7万円/);
    // タブはなくした
    expect(screen.queryByRole("tab")).toBeNull();
    // 「この数字から分かること」は7つの詳細すべてで出さない（2026-11-13 まさゆきさん）
    expect(screen.queryByText("この数字から分かること")).toBeNull();
    const details = screen.getByText("出典・集計条件を見る").closest("details") as HTMLDetailsElement;
    expect(details.open).toBe(false);
    const table = within(details);
    expect(table.getByRole("row", { name: /集計対象/ })).toHaveTextContent("鼎・築20年以内の中古戸建て、築21年以上の中古戸建て、土地（宅地）");
    expect(table.getByRole("row", { name: /対象期間/ })).toHaveTextContent("2021年第1四半期〜2026年第1四半期");
    expect(table.getByRole("row", { name: /除いた取引/ })).toHaveTextContent("調停・競売等、関係者間取引、隣地の購入");
    expect(table.getByRole("row", { name: /取得日/ })).toHaveTextContent("2026年10月26日");
    expect(document.body).not.toHaveTextContent(/真ん中の値|件数じゅうぶん|参考になる件数|件数少なめ/);
  });

  it("古めは右の築21年以上に「選んだ条件」を付け、並びは変えない", async () => {
    await open("housing", "d=kanae&k=0&h=old");
    expect(screen.getByText(/選んだ条件：買う・古め/)).toBeInTheDocument();
    const names = within(houseCard()).getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent);
    expect(names).toEqual(["築20年以内", "築21年以上"]);
    expect(houseOption("築21年以上")).toHaveTextContent("選んだ条件");
    expect(houseOption("築20年以内")).not.toHaveTextContent("選んだ条件");
  });

  it("「物件を探す・下見する」：空き家バンクを別のタブで開くボタン、地図へのボタン、下見で確かめたいこと。下のボタンは「カルテ一覧へ」だけ", async () => {
    await open("housing", "s=winter&d=kanae&k=0&h=new");
    const search = section("物件を探す・下見する");
    const akiya = within(search).getByRole("link", { name: /物件情報を探す/ });
    expect(akiya).toHaveAttribute("href", "https://www.city.iida.lg.jp/site/yuiturn/akiya.html");
    expect(akiya).toHaveAttribute("target", "_blank");
    expect(within(search).getByRole("link", { name: /地図で周辺を確かめる/ })).toHaveAttribute("href", "/chizu?s=winter&d=kanae&a=2&k=0&h=new");
    expect(within(search).getByText("下見で確かめたいこと")).toBeInTheDocument();
    expect(within(search).getByText("建物の傷みや修繕の必要性")).toBeInTheDocument();
    expect(within(search).getByText("候補の家から学校やお店までの道")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /地図で/ })).toHaveLength(1);
    expect(screen.getByRole("link", { name: /カルテ一覧へ/ })).toBeInTheDocument();
  });

  it("下の画面の切り替えの「カルテ」は、今の画面を示したまま一覧へ戻る", async () => {
    await open("transport", "s=winter&d=kanae&a=2&k=1&h=new&c=0");
    const karte = within(screen.getByRole("navigation", { name: "画面の切り替え" })).getByRole("link", { name: "カルテ" });
    expect(karte).toHaveAttribute("href", "/karte?s=winter&d=kanae&a=2&k=1&h=new&c=0");
    expect(karte).toHaveAttribute("aria-current", "true");
  });

  it("借りるは、いちばん上に家賃のカード（選んだ条件）を出し、中古戸建てと土地は参考として下に並べる（034・040）", async () => {
    await open("housing", "d=kanae&k=0&h=rent");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("家を借りるとしたら、いくらくらい？");
    const rent = section("家賃の参考値");
    expect(rent).toHaveTextContent("選んだ条件");
    expect(rent).toHaveTextContent("飯田市の民営借家の家賃の平均（1か月）");
    expect(rent).toHaveTextContent("約5.0万円");
    expect(rent).toHaveTextContent("一戸建約5.2万円");
    expect(rent).toHaveTextContent("鼎で民営の借家に住む世帯1,511世帯（住宅に住む5,292世帯の約29%）");
    expect(rent).toHaveTextContent("飯田市全体の平均で、地区ごとの値ではありません。");
    // 中古戸建てはどちらも選んだ条件ではない
    expect(houseCard()).not.toHaveTextContent("選んだ条件");
    expect(houseOption("築20年以内")).toHaveTextContent("3,350万円");
    const order = screen.getAllByRole("region").map((region) => region.getAttribute("aria-labelledby") && region.querySelector("h2")?.textContent);
    expect(order.slice(0, 3)).toEqual(["家賃の参考値", "中古戸建ての取引価格を見比べる", "土地（宅地）の取引価格"]);
    // 出典：家賃（飯田市）と、借家の世帯数（地区）と、取引価格
    expect(screen.getByText("飯田市・民営借家（専用住宅）・家賃0円を除く")).toBeInTheDocument();
    expect(screen.getByText("鼎・住宅に住む一般世帯")).toBeInTheDocument();
    expect(screen.getByText(/鼎・築20年以内の中古戸建て/)).toBeInTheDocument();
  });

  it("確かめたいことは箇条書きにし、チェックの箱は出さない（036）", async () => {
    await open("housing", "d=kanae&k=0&h=new");
    expect(screen.getByText("建物の傷みや修繕の必要性")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).toBeNull();
    // 新しめの家には下見メモの項目がない
    expect(screen.queryByRole("button", { name: /下見プランに入れる/ })).toBeNull();
  });
});

describe("KarteDetailView：下見プランに入れる（036）", () => {
  it("古めの家は「＋ 下見プランに入れる」。押すとその場で「追加済み」になり、画面は移らない。端末には地区ごとに ID だけを残す", async () => {
    await open("housing", "s=winter&d=kanae&k=0&h=old");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /下見プランに入れる.*古めの家で聞くこと/ }));
    });
    expect(screen.getByRole("status")).toHaveTextContent("追加済み");
    expect(screen.getByRole("link", { name: /下見プランを見る/ })).toHaveAttribute("href", "/karte?s=winter&d=kanae&a=2&k=0&h=old#shitami-memo");
    expect(url.query).toBe("s=winter&d=kanae&k=0&h=old");
    expect(localStorage.getItem("dearlife:shitami-memo:kanae")).toBe('["old-house-questions"]');
    expect(localStorage.getItem("dearlife:shitami-memo:igara")).toBeNull();
  });

  it("学校は子どもがいるとき、バスは車0台のときだけ出す", async () => {
    await open("childcare", "d=kanae&k=1&h=new");
    expect(screen.getByRole("button", { name: /学校のまわりを親子で歩く/ })).toBeInTheDocument();
    cleanupRender();
    await open("transport", "d=kanae&k=1&h=new&c=1");
    expect(screen.queryByRole("button", { name: /下見プランに入れる/ })).toBeNull();
    cleanupRender();
    await open("transport", "d=kanae&k=1&h=new&c=0");
    expect(screen.getByRole("button", { name: /バスで街へ行って帰る/ })).toBeInTheDocument();
  });

  it("前に入れた項目は、開いたときから「追加済み」", async () => {
    localStorage.setItem("dearlife:shitami-memo:kanae", '["walk-around-school"]');
    await open("childcare", "d=kanae&k=1&h=new");
    expect(screen.getByRole("status")).toHaveTextContent("追加済み");
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

  it("車0台の交通は、行ける場所のタブから開き、表の形で行き先ごとに1日の本数と行けるバス停の数を出す（バス停の名前は出さない。036〜038）", async () => {
    await open("transport", "d=kanae&a=2&k=0&h=new&c=0");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("車なしで、どう動く？");
    expect(tabNames()).toEqual(["行ける場所", "冬のおでかけ", "バス停", "電車"]);
    expect(screen.getByRole("tab", { name: /行ける場所/ })).toHaveAttribute("aria-selected", "true");
    // タブはカードの上（038 見本）
    const main = card("交通");
    expect(within(main).queryByRole("tablist")).toBeNull();
    expect(figure()).toHaveTextContent("バスで行ける場所");
    expect(figure()).toHaveTextContent("鼎から乗り換えなしで行ける施設");
    // そばにバス停がない店と、直通のない行き先は数えない（5か所のうち3か所）
    expect(figure()).toHaveTextContent("3か所");
    expect(within(figure()).getByRole("link", { name: /家の近くから調べる/ })).toHaveAttribute("href", "https://gofreely.rabo-hohoemi.workers.dev/");
    const row = (name: string) => within(main).getByText(name).closest("li") as HTMLElement;
    expect(row("飯田市役所")).toHaveTextContent("4〜14本／日");
    expect(row("飯田市役所")).toHaveTextContent("25か所中18か所");
    expect(row("健和会病院")).toHaveTextContent("乗りかえなしで行けるバスはありません");
    // はじめは 買い物 → 病院 → 市役所。学校・駅は「ほかの行き先を見る」で同じ表の下に出す
    const groups = () => within(main).getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent);
    expect(groups()).toEqual(["買い物", "病院", "市役所", "住む場所の近くから、どう行く？"]);
    expect(within(main).queryByText("鼎小学校")).toBeNull();
    const more = within(main).getByRole("button", { name: "学校など、ほかの行き先を見る" });
    expect(more).toHaveAttribute("aria-expanded", "false");
    await act(async () => {
      fireEvent.click(more);
    });
    expect(groups()).toEqual(["買い物", "病院", "市役所", "学校", "駅", "住む場所の近くから、どう行く？"]);
    expect(row("鼎小学校")).toHaveTextContent("4本／日");
    expect(within(main).getByRole("button", { name: "ほかの行き先を閉じる" })).toHaveAttribute("aria-expanded", "true");
    // 診療所は病院のまとまりに数だけ
    expect(row("診療所（クリニック）")).toHaveTextContent("鼎の中に8か所");
    expect(row("診療所（クリニック）")).toHaveTextContent("歯科は入っていません");
    // 店は全部、公式ページへのリンク。バス停がなければ数えない
    expect(within(main).getByRole("link", { name: /西友飯田鼎店/ })).toHaveAttribute("href", "https://www.seiyu.co.jp/shop/kanae/");
    expect(within(main).getByRole("link", { name: /キラヤ 黒田店/ }).closest("li")).toHaveTextContent("そばにバス停がないため、バスでは数えていません");
    expect(main).toHaveTextContent("乗るバス停によって便数が変わります。");
    expect(main).toHaveTextContent(NOTICES.carFree);
    expect(main).toHaveTextContent("2027年1月15日（金）の時刻表で数えました。本数は行きの便の数です。");
    expect(within(main).getByRole("link", { name: /GoFreelyで行き方を調べる/ })).toBeInTheDocument();
    expect(main).not.toHaveTextContent("市役所前");
    expect(within(basis()).getByText(/医療情報ネット/)).toBeInTheDocument();
  });

  it("伊賀良の行ける場所の駅は、駅がないことを伝える（037）", async () => {
    await open("transport", "d=igara&a=2&k=0&h=new&c=0");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "学校など、ほかの行き先を見る" }));
    });
    expect(card("交通")).toHaveTextContent("地区内に駅はありません。");
  });

  it("車0台の冬のおでかけのタブは、バス停の名前と時刻は出さずに行けるバス停の数・注意書き・gofreely の枠を出す（036）", async () => {
    await open("transport", "d=kanae&a=2&k=0&h=new&c=0");
    await choose(/冬のおでかけ/);
    expect(figure()).toHaveTextContent("飯田駅へ乗りかえなしで行けるバスがあるバス停（土曜）");
    expect(figure()).toHaveTextContent("25か所");
    expect(figure()).toHaveTextContent("地区のバス停 25か所のうち");
    expect(figure()).toHaveTextContent(NOTICES.carFree);
    const main = card("交通");
    expect(main).toHaveTextContent("鼎のバス停25か所すべてから、飯田駅へ乗りかえなしで行けるバスがあります。");
    expect(main).toHaveTextContent("2027年1月16日（土）の時刻表で数えました");
    expect(main).not.toHaveTextContent("鼎公民館前");
    expect(within(main).getByRole("link", { name: /gofreely で行き方を調べる/ })).toHaveAttribute("href", "https://gofreely.rabo-hohoemi.workers.dev/");
    expect(within(basis()).getByRole("row", { name: /出典/ })).toHaveTextContent("GTFSデータリポジトリ「南信州のバス」");
  });

  it("車1台以上は冬のおでかけのタブを出さず、バス停から開く。電車のタブは駅と本数（未公開ならデータ未取得）", async () => {
    await open("transport", "d=kanae&k=1&c=1");
    expect(tabNames()).toEqual(["バス停", "電車", "行ける場所"]);
    // 「この数字から分かること」は出さない（2026-11-13 まさゆきさん）
    expect(screen.queryByText("この数字から分かること")).toBeNull();
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

  it("防災は見本の形：地区の札・ハザードマップの帯・災害の種類のタブ（最初は洪水）・3件ずつの一覧と Google マップ・確かめたいこと・注意書き（040）", async () => {
    const site = (name: string, hazards: EvacuationSite["hazards"]) => ({ name, subkind: "指定緊急避難場所", address: `長野県飯田市鼎${name}`, hazards });
    const kanae = screenData.districts.kanae;
    screenData = {
      ...screenData,
      districts: {
        ...screenData.districts,
        kanae: {
          ...kanae,
          evacuationSites: availableFixture(
            [
              site("鼎小学校", ["flood", "landslide"]),
              site("鼎中学校", ["flood", "large_fire"]),
              site("鼎公民館", ["flood"]),
              site("切石体育館", ["flood", "earthquake"]),
            ],
            EVACUATION,
          ),
        },
      },
    };
    await open("disaster", "d=kanae&k=1");
    expect(screen.getByText("地区：")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /飯田市のハザードマップを開く/ })).toHaveAttribute("href", "https://www.city.iida.lg.jp/soshiki/35/hazardmap.html");
    // 大規模な火事は使える場所のある地区（鼎）だけ4つ目のタブ。「すべて」はない
    expect(tabNames()).toEqual(["洪水", "土砂災害", "地震", "大規模な火事"]);
    expect(screen.getByRole("tab", { name: "洪水" })).toHaveAttribute("aria-selected", "true");
    const list = () => within(screen.getByRole("list", { name: /指定緊急避難場所/ })).getAllByRole("listitem");
    expect(figure()).toHaveTextContent("洪水に対応する指定緊急避難場所4か所");
    expect(list().map((item) => item.textContent)).toEqual([
      expect.stringContaining("鼎小学校"),
      expect.stringContaining("鼎中学校"),
      expect.stringContaining("鼎公民館"),
    ]);
    expect(within(list()[0]).getByRole("link", { name: /地図で見る/ }).getAttribute("href")).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("鼎小学校 長野県飯田市鼎鼎小学校")}`,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /洪水の避難場所をすべて見る/ }));
    });
    expect(list()).toHaveLength(4);
    expect(screen.getByRole("button", { name: /閉じる/ })).toHaveAttribute("aria-expanded", "true");
    // 絞り込みはタブを変えても残る
    await act(async () => {
      fireEvent.change(screen.getByRole("searchbox", { name: "施設名・町名で絞り込む" }), { target: { value: "体育館" } });
    });
    expect(figure()).toHaveTextContent("洪水に対応する指定緊急避難場所1か所");
    await choose(/地震/);
    expect(screen.getByRole("searchbox")).toHaveValue("体育館");
    expect(list().map((item) => item.textContent)).toEqual([expect.stringContaining("切石体育館")]);
    await choose(/土砂災害/);
    expect(figure()).toHaveTextContent("見つかりませんでした");
    // 「この数字から分かること」は出さず、見本の確かめたいことと注意書き
    expect(screen.queryByText("この数字から分かること")).toBeNull();
    expect(screen.getByText("候補の家から避難場所まで歩いてみる")).toBeInTheDocument();
    expect(screen.getByText("災害時は、飯田市の最新の避難情報を確認してください。")).toBeInTheDocument();
    const sources = screen.getByText("出典・更新日を見る").closest("details") as HTMLDetailsElement;
    expect(sources.open).toBe(false);
    const table = within(sources);
    expect(table.getByRole("row", { name: /出典/ })).toHaveTextContent("飯田市「指定緊急避難場所一覧」");
    expect(table.getByRole("row", { name: /確認日/ })).toHaveTextContent("2026年10月26日");
  });

  it("防災：最初に「雨と風は、どれくらい？」で飯田市の値を出し、値のないものは「データ未取得」。いまの街とくらべるへ条件を持って移る（041）", async () => {
    const JMA = sourceFixture("jma_climate_normals", { name: "過去の気象データ検索 平年値（1991〜2020年）", publisher: "気象庁", checkedOn: "2026-11-14", fetchedOn: null });
    screenData = {
      ...screenData,
      compareCities: [compareCityFixture("tokyo"), compareCityFixture("iida", { metrics: { rain30_days: compareMetricFixture(12.3, "日/年", JMA) } })],
    };
    await open("disaster", "s=summer&d=kanae&k=1");
    const card = section("雨と風は、どれくらい？");
    expect(within(card).getByText("日降水量30mm以上の日数").closest("div")).toHaveTextContent("12.3日/年1991〜2020年");
    expect(within(card).getByText("最深積雪").closest("div")).toHaveTextContent("データ未取得");
    expect(within(card).getByRole("link", { name: /いまの街とくらべる/ })).toHaveAttribute("href", expect.stringMatching(/^\/kurabe\?.*d=kanae.*&t=city$/));
    // 避難場所より前に出す
    expect(card.compareDocumentPosition(screen.getByRole("region", { name: "災害の種類から避難先を探す" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const sources = within(screen.getByText("出典・更新日を見る").closest("details") as HTMLDetailsElement);
    expect(sources.getAllByRole("row", { name: /出典/ })[0]).toHaveTextContent("気象庁「過去の気象データ検索 平年値（1991〜2020年）」");
  });

  it("防災：大規模な火事の場所がなければ3つのタブ。避難場所の出典が未公開なら「データ未取得」", async () => {
    await open("disaster", "d=kanae&k=1");
    expect(tabNames()).toEqual(["洪水", "土砂災害", "地震"]);
    cleanupRender();
    await open("disaster", "d=igara&k=1");
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
    expect(screen.getByRole("region", { name: "災害の種類から避難先を探す" })).toHaveTextContent("データ未取得");
  });

  it("公共施設は見本の形：使い道のタブ（施設のない使い道は出さない）・帯の見出し・名前と Google マップ・すべて見る・注意書き・下見で確かめたいこと（040）", async () => {
    screenData = withPublicFacilities(PUBLIC_FACILITIES);
    await open("public_facilities", "d=kanae&k=1");
    expect(screen.getByRole("heading", { name: "使い道から施設を探す" })).toBeInTheDocument();
    // 運動施設・市役所の施設がないので「体を動かす」「手続きをする」は出さない
    expect(tabNames()).toEqual(["子どもと遊ぶ公園", "本を借りる図書館", "地域の活動・文化公民館・文化施設", "受診する病院・診療所"]);
    expect(screen.getByRole("tab", { name: /子どもと遊ぶ/ })).toHaveAttribute("aria-selected", "true");
    expect(figure()).toHaveTextContent("鼎の公園2か所");
    const rows = () => within(screen.getByRole("list", { name: /^鼎の/ })).getAllByRole("listitem");
    expect(rows().map((row) => row.textContent)).toEqual([expect.stringContaining("城東2号公園"), expect.stringContaining("野底山森林公園")]);
    expect(within(rows()[0]).getByRole("link", { name: /地図で見る/ }).getAttribute("href")).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("城東2号公園 長野県飯田市鼎1")}`,
    );
    // 「受診する」には、市の施設だけで民間の診療所は入っていないと書く
    expect(screen.queryByText("市の施設だけです。民間の診療所は入っていません。")).toBeNull();
    await choose(/受診する/);
    expect(figure()).toHaveTextContent("鼎の病院・診療所1か所");
    expect(screen.getByText("市の施設だけです。民間の診療所は入っていません。")).toBeInTheDocument();
    // すべて見るは地区の全部を種類ごとに
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "掲載施設をすべて見る（5か所）" }));
    });
    expect(screen.getByRole("heading", { name: "公園（2か所）" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "公民館（1か所）" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /閉じる/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("開館日・利用時間は、各施設の案内で確認してください。")).toBeInTheDocument();
    // 「この数字から分かること」・大きい数字・地図へのボタンは出さず、見本の確かめたいことと「出典・更新日を見る」
    expect(screen.queryByText("この数字から分かること")).toBeNull();
    expect(screen.getByRole("heading", { name: "下見で確かめたいこと" })).toBeInTheDocument();
    expect(screen.getByText("候補の家から、よく使いそうな施設まで歩いてみる")).toBeInTheDocument();
    expect(screen.queryByText("地図で周辺を確かめる")).toBeNull();
    expect(screen.getByRole("link", { name: /カルテ一覧へ/ })).toBeInTheDocument();
    expect((screen.getByText("出典・更新日を見る").closest("details") as HTMLDetailsElement).open).toBe(false);
  });

  it("公共施設の出典が未公開なら、箱の中に「データ未取得」", async () => {
    await open("public_facilities", "d=igara&k=1");
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
    expect(screen.getByRole("region", { name: "使い道から施設を探す" })).toHaveTextContent("データ未取得");
  });

  it("人口はタブなしで、人数・調査時点・年齢の割合の帯と札（040 見本）", async () => {
    await open("population", "d=kanae&k=1");
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
    expect(screen.getByRole("heading", { name: "鼎の人口" })).toBeInTheDocument();
    expect(figure()).toHaveTextContent("12,000人");
    expect(figure()).toHaveTextContent("2020年10月1日時点・国勢調査");
    expect(screen.getByRole("heading", { name: "年齢の割合" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "年齢の割合：14歳以下 12.5%、15〜64歳 57.5%、65歳以上 30.0%" })).toBeInTheDocument();
    expect(card("人口")).toHaveTextContent("14歳以下1,500人12.5%");
    // 3区分の合計が総数と同じなら、斜線の説明は出さない
    expect(screen.queryByText(/斜線は/)).toBeNull();
    expect(screen.getByText("公園や児童施設での、子ども連れの利用の様子")).toBeInTheDocument();
    expect((screen.getByText("出典・調査時点を見る").closest("details") as HTMLDetailsElement).open).toBe(false);
    // 人口には地図に出す場所がないので、下のボタンは「カルテ一覧へ」だけ（2026-11-13 まさゆきさん）
    expect(screen.queryByRole("link", { name: /地図で周辺を確かめる|地図で確かめる/ })).toBeNull();
    expect(screen.getByRole("link", { name: /カルテ一覧へ/ })).toBeInTheDocument();
  });

  it("人口：総数と3区分の合計の差は、年齢不詳の斜線として説明する", async () => {
    const kanae = screenData.districts.kanae;
    const population = { asOf: "2020-10-01", total: 13534, age0to14: 1769, age15to64: 7445, age65plus: 4116 };
    screenData = { ...screenData, districts: { ...screenData.districts, kanae: { ...kanae, population: availableFixture(population, sourceFixture("estat_census_small_area")) } } };
    await open("population", "d=kanae&k=1");
    expect(screen.getByText("斜線は、国勢調査で年齢が分からなかった人です（204人・1.5%）。")).toBeInTheDocument();
  });

  const ZONE_RULE = sourceFixture("iida_school_zone_rule", { name: "飯田市立小学校及び中学校の通学区域に関する規則 別表", publisher: "飯田市教育委員会" });
  const zone = (townName: string, elementarySchools: string[], juniorHighSchools: string[], isPartial = false) => ({
    townName,
    elementarySchools,
    juniorHighSchools,
    isPartial,
  });

  it("子育て・学校は通う学校（学区）から開く。どの町も同じ地区は小学校・中学校の札と対象の町名、地図へのボタン（039）", async () => {
    const education = sourceFixture("iida_education", { name: "教育機関一覧", publisher: "飯田市" });
    screenData = screenDataFixture({
      kanae: {
        ...KANAE,
        schoolZones: availableFixture([zone("鼎中平", ["鼎小学校"], ["鼎中学校"]), zone("鼎名古熊", ["鼎小学校"], ["鼎中学校"])], ZONE_RULE),
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
    expect(tabNames()).toEqual(["通う学校（学区）", "地区の学校", "保育園など", "放課後クラブ"]);
    expect(screen.getByRole("heading", { name: "鼎で通う学校" })).toBeInTheDocument();
    expect(figure()).toHaveTextContent("鼎では、どの町に住んでも同じ学校に通います。");
    expect(figure()).toHaveTextContent("小学校鼎小学校中学校鼎中学校");
    expect(screen.getByText("対象の町名を見る").closest("details")).toHaveTextContent("鼎中平、鼎名古熊");
    expect(figure()).toHaveTextContent(NOTICES.schoolDistrict);
    expect(within(figure()).getByRole("link", { name: /学区の範囲を地図で見る/ })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/chizu\?.*d=kanae.*&layer=school_districts$/),
    );
    // 「この数字から分かること」は出さない。下のボタンは「カルテ一覧へ」だけ（2026-11-12 まさゆきさん）
    expect(screen.queryByText("この数字から分かること")).toBeNull();
    expect(screen.getByRole("link", { name: /カルテ一覧へ/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /地図で周辺を確かめる|地図で確かめる/ })).toBeNull();
    // 出典は「〇〇の出典を見る」の閉じた欄
    const sources = screen.getByText("通う学校（学区）の出典を見る").closest("details") as HTMLDetailsElement;
    expect(sources.open).toBe(false);
    expect(within(sources).getByRole("row", { name: /出典/ })).toHaveTextContent("飯田市教育委員会");

    await choose(/地区の学校/);
    // 学区と同じ形：見出し・件数と内訳の一文・1か所ずつの札（039 プラン 8）
    expect(screen.getByRole("heading", { name: "鼎にある学校" })).toBeInTheDocument();
    expect(figure()).toHaveTextContent("小学校1・中学校1の、2校があります。");
    expect(within(figure()).getAllByRole("listitem").map((item) => item.textContent)).toEqual(["小学校鼎小学校", "中学校鼎中学校"]);
    expect(figure()).toHaveTextContent(NOTICES.schoolDistrict);
    expect(within(card("子育て・学校")).getByRole("link", { name: /地図で場所を見る/ })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/chizu\?.*d=kanae.*&layer=schools$/),
    );
    expect(screen.getByText("地区の学校の出典を見る")).toBeInTheDocument();
    expect(within(screen.getByText("地区の学校の出典を見る").closest("details") as HTMLElement).getByRole("row", { name: /出典/ })).toHaveTextContent(
      "飯田市「教育機関一覧」",
    );
  });

  it("町によって学校が分かれる地区は、町名を選ぶと通う学校が出る。選べる町・場所で分かれる町・地区の端の町には一言を添える（039）", async () => {
    const education = sourceFixture("iida_education", { name: "教育機関一覧", publisher: "飯田市" });
    screenData = screenDataFixture({
      chushin: {
        ...screenDataFixture().districts.chushin,
        schoolZones: availableFixture(
          [
            zone("江戸町1丁目", ["浜井場小学校"], ["飯田東中学校"]),
            zone("江戸町2丁目", ["浜井場小学校"], ["飯田東中学校"]),
            zone("江戸町3丁目", ["浜井場小学校"], ["飯田東中学校"]),
            zone("吾妻町", ["浜井場小学校", "丸山小学校"], ["飯田東中学校"]),
            zone("上飯田", ["丸山小学校", "追手町小学校"], ["飯田東中学校"], true),
            zone("八幡町", ["松尾小学校"], ["緑ケ丘中学校"]),
          ],
          ZONE_RULE,
        ),
        schools: availableFixture(
          ["浜井場小学校", "丸山小学校", "追手町小学校", "飯田東中学校"].map((name) => ({ name, subkind: null, address: null })),
          education,
        ),
      },
    });
    await open("childcare", "d=chushin&k=1");
    expect(screen.getByRole("heading", { name: "町名から学区を調べる" })).toBeInTheDocument();
    const picker = screen.getByRole("combobox", { name: "町名" }) as HTMLSelectElement;
    // はじめは何も選ばない。町は丁目ごとに別の行で、別表の順
    expect(picker.value).toBe("");
    expect([...picker.options].map((option) => option.textContent)).toEqual([
      "町名を選んでください",
      "江戸町1丁目",
      "江戸町2丁目",
      "江戸町3丁目",
      "吾妻町",
      "上飯田",
      "八幡町",
    ]);
    expect(figure()).toHaveTextContent("町名を選ぶと、ここに学校が出ます");

    const pick = (town: string) => fireEvent.change(picker, { target: { value: town } });
    pick("江戸町2丁目");
    expect(screen.getByRole("heading", { name: "江戸町2丁目の学区" })).toBeInTheDocument();
    expect(figure()).toHaveTextContent("小学校浜井場小学校中学校飯田東中学校");
    pick("吾妻町");
    expect(figure()).toHaveTextContent("小学校浜井場小学校または丸山小学校");
    expect(figure()).toHaveTextContent("※どちらかを選べます");
    pick("上飯田");
    expect(figure()).toHaveTextContent("※場所によって分かれます。番地を市で確かめてください");
    pick("八幡町");
    expect(figure()).toHaveTextContent("小学校松尾小学校中学校緑ケ丘中学校※となりの地区にある学校です");

    // すべての町名と学区（閉じた欄）：同じ組み合わせの町をまとめた表と、地区の端の町
    const all = screen.getByText("すべての町名と学区を見る").closest("details") as HTMLDetailsElement;
    expect(all.open).toBe(false);
    const table = within(all).getByRole("table", { name: "町ごとの通う小学校・中学校" });
    expect(within(table).getAllByRole("row").map((row) => row.textContent)).toEqual([
      "小学校中学校町",
      "浜井場小学校飯田東中学校江戸町1〜3丁目",
      "浜井場小学校 または 丸山小学校飯田東中学校吾妻町※どちらかを選べます",
      "丸山小学校 または 追手町小学校飯田東中学校上飯田※場所によって分かれます。番地を市で確かめてください",
    ]);
    expect(within(all).getByRole("table", { name: "地区の端の町の通う小学校・中学校" })).toHaveTextContent("松尾小学校緑ケ丘中学校八幡町");
  });

  it("学区のデータがなければ「データ未取得」", async () => {
    await open("childcare", "d=kanae&k=1");
    expect(screen.getByRole("heading", { name: "鼎で通う学校" })).toBeInTheDocument();
    expect(figure()).toHaveTextContent("データ未取得");
  });

  it("出典が未公開なら「データ未取得」、駅のない地区は「地区内に駅はありません。」", async () => {
    // 防災・公共施設・支援制度はタブの代わりに箱の中に出す（それぞれのテスト）
    for (const item of ["childcare", "transport", "population"] as const) {
      await open(item, "d=igara&k=1");
      expect(figure()).toHaveTextContent("データ未取得");
      if (item === "transport") {
        await choose(/電車/);
        expect(figure()).toHaveTextContent("地区内に駅はありません。");
      }
      document.body.innerHTML = "";
    }
  });

  it("支援制度：目的のタブで絞り、札・題・正式な名前・公式ページへのボタンを出す（040 見本）", async () => {
    const program = (name: string, category: "移住" | "住まい" | "子育て", title: string | null, tag: string | null, url: string, checkedOn = "2026-10-26") => ({
      name,
      title,
      tag,
      summary: `${name}の概要`,
      category,
      officialUrl: url,
      checkedOn,
    });
    screenData = {
      ...screenData,
      supportPrograms: [
        program("移住相談（結いターン移住定住推進課）", "移住", "移住のことを、市の窓口に相談する", "相談", "https://www.city.iida.lg.jp/a"),
        program("移住支援金", "移住", "都市部から移住して働く人への支援金を調べる", "お金", "https://www.city.iida.lg.jp/b", "2026-11-02"),
        // 題を入れていない制度は、正式な名前を太字にして札なしで出す
        program("新しい子育ての制度", "子育て", null, null, "https://www.city.iida.lg.jp/c"),
      ],
    };
    await open("support", "d=kanae&k=1");
    // 地区ではなく「飯田市全体」の札
    expect(screen.getByText("飯田市全体")).toBeInTheDocument();
    expect(tabNames()).toEqual(["移住相談・体験・お金", "子育て妊娠・出産・子育て"]);
    const panel = figure();
    expect(panel).toHaveTextContent("移住の支援掲載2件");
    expect(panel).toHaveTextContent("相談移住のことを、市の窓口に相談する移住相談（結いターン移住定住推進課）");
    const links = within(panel).getAllByRole("link", { name: /公式ページを見る/ });
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["https://www.city.iida.lg.jp/a", "https://www.city.iida.lg.jp/b"]);
    expect(links[0]).toHaveAttribute("target", "_blank");
    expect(panel).not.toHaveTextContent("対象になります");

    await choose(/子育て/);
    expect(figure()).toHaveTextContent("子育ての支援掲載1件新しい子育ての制度公式ページを見る");

    // すべて見る：目的ごとに全部
    fireEvent.click(screen.getByRole("button", { name: "掲載制度をすべて見る（3件）" }));
    expect(screen.getByRole("list", { name: "移住の支援" })).toBeInTheDocument();
    expect(screen.getAllByRole("list", { name: "子育ての支援" })).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "閉じる" }));
    expect(screen.queryByRole("list", { name: "移住の支援" })).toBeNull();

    // 注意書きと確かめたいことは「申し込む前に確かめたいこと」の箱1つ。この数字から分かること・地図のボタンはない
    expect(screen.getByRole("heading", { name: "申し込む前に確かめたいこと" })).toBeInTheDocument();
    expect(screen.queryByText(NOTICES.support)).toBeNull();
    expect(screen.queryByRole("link", { name: /地図で周辺を確かめる/ })).toBeNull();
    // 確認日は出典の欄に、古い日〜新しい日で出す
    expect(screen.getByText("出典・確認日を見る")).toBeInTheDocument();
    expect(document.body).toHaveTextContent("2026年10月26日〜2026年11月2日（制度ごとに異なる）");
  });

  it("支援制度が1件もなければ「データ未取得」", async () => {
    await open("support", "d=kanae&k=1");
    expect(card("目的から支援制度を探す")).toHaveTextContent("データ未取得");
  });
});

describe("KarteDetailView：移動", () => {
  it("防災・交通は下の地図のボタンの代わりに、カードの中から種類だけにチェックを入れて地図を開く（040。2026-11-13 まさゆきさん）", async () => {
    const mapLink = () => screen.getByRole("link", { name: /地図で場所を見る/ }).getAttribute("href");
    await open("disaster", "s=winter&d=kanae&a=2&k=1&h=new");
    expect(screen.queryByRole("link", { name: /地図で周辺を確かめる/ })).toBeNull();
    expect(mapLink()).toMatch(/^\/chizu\?s=winter&d=kanae.*&layer=evacuation_sites$/);
    cleanupRender();
    await open("transport", "d=kanae&a=2&k=1&h=new&c=0");
    expect(screen.queryByRole("link", { name: /地図で周辺を確かめる/ })).toBeNull();
    // 車0台は行ける場所のタブから開く：バス停と駅の両方
    expect(mapLink()).toMatch(/&layer=transit$/);
    for (const [tab, layer] of [[/バス停/, "bus_stops"], [/電車/, "train_stations"], [/冬のおでかけ/, "transit"]] as const) {
      await act(async () => {
        fireEvent.click(screen.getByRole("tab", { name: tab }));
      });
      expect(mapLink()).toMatch(new RegExp(`&layer=${layer}$`));
    }
  });

  it("「カルテ一覧」と地図へのボタンは、条件と季節を持ったまま", async () => {
    await open("housing", "s=winter&d=kanae&a=2&k=1&h=new");
    expect(screen.getByRole("link", { name: "カルテ一覧" })).toHaveAttribute("href", "/karte?s=winter&d=kanae&a=2&k=1&h=new");
    expect(screen.getByRole("link", { name: /カルテ一覧へ/ })).toHaveAttribute("href", "/karte?s=winter&d=kanae&a=2&k=1&h=new");
    expect(screen.getByRole("link", { name: /地図で周辺を確かめる/ }).getAttribute("href")).toMatch(/^\/chizu\?s=winter&d=kanae/);
  });

  it("地区を選んでいなければ、えらぶへ案内する", async () => {
    await open("housing", "a=2&k=1");
    expect(screen.getByRole("link", { name: /地区をえらぶ/ })).toHaveAttribute("href", "/erabu?a=2&k=1&h=new");
  });
});

describe("KarteDetailView：印刷（023）", () => {
  beforeEach(() => {
    window.print = vi.fn();
  });

  async function printFromSheet() {
    fireEvent.click(screen.getByRole("button", { name: "印刷する" }));
    const sheet = within(screen.getByRole("dialog"));
    await act(async () => {
      fireEvent.click(sheet.getByRole("button", { name: "印刷する" }));
    });
    return sheet;
  }

  const printed = () => within(document.querySelector("[data-print-document]") as HTMLElement);

  it("窓には、まとめと7項目が並び、開いている項目だけにチェックが入っている", async () => {
    await open("housing", "d=kanae&a=2&k=1&h=new");
    fireEvent.click(screen.getByRole("button", { name: "印刷する" }));
    const boxes = within(screen.getByRole("dialog")).getAllByRole("checkbox") as HTMLInputElement[];
    expect(boxes).toHaveLength(8);
    expect(boxes.filter((box) => box.checked).map((box) => box.labels?.[0].textContent)).toEqual(["住まい"]);
  });

  it("住まいは画面と同じカード・空き家バンクの URL・空の箱の「下見で確かめたいこと」・数字の根拠・印刷日を出す（「この数字から分かること」は出さない）", async () => {
    await open("housing", "d=kanae&a=2&k=1&h=new");
    await printFromSheet();
    expect(window.print).toHaveBeenCalledTimes(1);
    const paper = printed();
    expect(paper.getByRole("heading", { level: 2, name: "家を買うとしたら、いくらくらい？" })).toBeInTheDocument();
    for (const title of ["中古戸建ての取引価格を見比べる", "土地（宅地）の取引価格"]) expect(paper.getByRole("heading", { level: 2, name: title })).toBeInTheDocument();
    expect(paper.getAllByText(/https:\/\/www\.city\.iida\.lg\.jp\/site\/yuiturn\/akiya\.html/).length).toBeGreaterThan(0);
    expect(paper.queryByText("この数字から分かること")).toBeNull();
    // 紙ではペンでチェックするので、押せるチェックではなく空の箱にする
    expect(paper.getByRole("heading", { name: "下見で確かめたいこと" })).toBeInTheDocument();
    expect(paper.queryAllByRole("checkbox")).toHaveLength(0);
    expect(paper.getByText("建物の傷みや修繕の必要性")).toBeInTheDocument();
    expect(paper.getAllByRole("row", { name: /集計対象/ }).map((row) => row.textContent)).toEqual(["集計対象鼎・築20年以内の中古戸建て、築21年以上の中古戸建て、土地（宅地）"]);
    expect(paper.getByText(/^印刷日：\d{4}年\d{1,2}月\d{1,2}日$/)).toBeInTheDocument();
    expect(paper.getByText(/地区：鼎/)).toBeInTheDocument();
  });

  it("子育て・学校は4つのタブを出し、「この数字から分かること」は出さない。町名を選ぶ欄の代わりに、すべての町名と学区を開いて出す（039）", async () => {
    screenData = screenDataFixture({
      kanae: {
        ...KANAE,
        schoolZones: availableFixture(
          [{ townName: "鼎中平", elementarySchools: ["鼎小学校"], juniorHighSchools: ["鼎中学校"], isPartial: false }],
          sourceFixture("iida_school_zone_rule"),
        ),
      },
      chushin: {
        ...screenDataFixture().districts.chushin,
        schoolZones: availableFixture(
          [
            { townName: "江戸町1丁目", elementarySchools: ["浜井場小学校"], juniorHighSchools: ["飯田東中学校"], isPartial: false },
            { townName: "吾妻町", elementarySchools: ["浜井場小学校", "丸山小学校"], juniorHighSchools: ["飯田東中学校"], isPartial: false },
          ],
          sourceFixture("iida_school_zone_rule"),
        ),
      },
    });
    await open("childcare", "d=kanae&a=2&k=1&h=new");
    await printFromSheet();
    let paper = printed();
    for (const tab of ["通う学校（学区）", "地区の学校", "保育園など", "放課後クラブ"]) expect(paper.getAllByText(tab).length).toBeGreaterThan(0);
    expect(paper.getByRole("heading", { name: "鼎で通う学校" })).toBeInTheDocument();
    expect((paper.getByText("対象の町名").closest("details") as HTMLDetailsElement).open).toBe(true);
    expect(paper.queryByText("この数字から分かること")).toBeNull();

    cleanupRender();
    document.body.innerHTML = "";
    await open("childcare", "d=chushin&a=2&k=1&h=new");
    await printFromSheet();
    paper = printed();
    expect(paper.queryByRole("combobox")).toBeNull();
    expect((paper.getByText("すべての町名と学区").closest("details") as HTMLDetailsElement).open).toBe(true);
    expect(paper.getByRole("table", { name: "町ごとの通う小学校・中学校" })).toHaveTextContent("吾妻町");
  });

  it("交通は「この数字から分かること」を紙にも出さない（2026-11-13 まさゆきさん）", async () => {
    await open("transport", "d=kanae&a=2&k=0&h=new&c=0");
    await printFromSheet();
    expect(printed().queryByText("この数字から分かること")).toBeNull();
    expect(printed().getByRole("heading", { name: "現地で確かめたいこと" })).toBeInTheDocument();
  });

  it("施設の一覧は、画面で閉じている長さでも紙では開いて出す", async () => {
    // 画面では13か所以上で閉じる（交通のバス停）
    const stops = Array.from({ length: 13 }, (_, index) => ({ name: `バス停${index}`, subkind: null, address: null }));
    const kanae = screenData.districts.kanae;
    screenData = {
      ...screenData,
      districts: { ...screenData.districts, kanae: { ...kanae, busStops: availableFixture(stops, sourceFixture("gtfs_bus")) } },
    };
    await open("transport", "d=kanae&a=2&k=0&h=new&c=1");
    await printFromSheet();
    const list = printed().getByText("バス停の一覧（13か所）").closest("details") as HTMLDetailsElement;
    expect(list.open).toBe(true);
  });

  it("公共施設は種類ごとに全部の施設を出し、市の施設だけの注意と開館日の注意書きを付ける（040）", async () => {
    screenData = withPublicFacilities(PUBLIC_FACILITIES);
    await open("public_facilities", "d=kanae&a=2&k=0&h=new");
    await printFromSheet();
    const paper = printed();
    expect(paper.getByText("鼎の公共施設（5か所）")).toBeInTheDocument();
    for (const group of ["公園（2か所）", "図書館（1か所）", "公民館（1か所）", "病院・診療所（1か所）"]) {
      expect(paper.getByText(group)).toBeInTheDocument();
    }
    expect(paper.getByText("市の施設だけです。民間の診療所は入っていません。")).toBeInTheDocument();
    expect(paper.getByText("開館日・利用時間は、各施設の案内で確認してください。")).toBeInTheDocument();
    expect(paper.getByRole("heading", { name: "下見で確かめたいこと" })).toBeInTheDocument();
    expect(paper.queryByText("この数字から分かること")).toBeNull();
    expect(paper.queryByRole("link", { name: /地図で見る/ })).toBeNull();
  });

  it("防災は地区の避難場所を全部1つの一覧にして使える災害を書き、ハザードマップの URL・注意書きを出す（040）", async () => {
    await open("disaster", "d=kanae&a=2&k=0&h=new");
    await printFromSheet();
    const paper = printed();
    expect(paper.getByText("地区の指定緊急避難場所（1か所）")).toBeInTheDocument();
    expect(paper.getByText("使える災害：洪水・土砂災害")).toBeInTheDocument();
    expect(paper.getByText(/https:\/\/www\.city\.iida\.lg\.jp\/soshiki\/35\/hazardmap\.html/)).toBeInTheDocument();
    expect(paper.getByText("災害時は、飯田市の最新の避難情報を確認してください。")).toBeInTheDocument();
    expect(paper.queryByText("この数字から分かること")).toBeNull();
  });
});
