import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ScreenData } from "@/lib/data/screen-data";
import { availableFixture, marketFixture, screenDataFixture, sourceFixture } from "@/test/screen-data-fixture";
import { ErabuFlow } from "./ErabuFlow";

// URL を持つだけの小さなルーター。push・replace で URL を書きかえ、useSearchParams を読み直させる
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
    push: vi.fn<(href: string) => void>(),
  };
});

vi.mock("next/navigation", async () => {
  const { useMemo, useSyncExternalStore } = await import("react");
  return {
    usePathname: () => "/erabu",
    useRouter: () => ({
      push: (href: string) => {
        url.push(href);
        url.set(href);
      },
      replace: (href: string) => url.set(href),
    }),
    useSearchParams: () => {
      const query = useSyncExternalStore(url.subscribe, () => url.query);
      return useMemo(() => new URLSearchParams(query), [query]);
    },
  };
});

let screenData: ScreenData;
vi.mock("@/lib/data/load-screen-data", () => ({ loadScreenData: () => Promise.resolve(screenData) }));

const EDUCATION = sourceFixture("iida_education", { checkedOn: "2026-10-24", fetchedOn: null });
const CHILDCARE = sourceFixture("iida_childcare", { checkedOn: "2026-10-24", fetchedOn: null });
const BUS = sourceFixture("gtfs_minamishinshu_bus");

const PUBLISHED = screenDataFixture({
  kamisato: {
    areaDescription: "上郷飯沼・上郷黒田・上郷別府",
    market: {
      land: marketFixture(28000, 202),
      house_built_within_20y: marketFixture(39_000_000, 12),
      house_built_over_20y: marketFixture(8_600_000, 39),
    },
    schools: availableFixture([{ name: "上郷小学校", subkind: "小学校", address: null }], EDUCATION),
    childcare: availableFixture(
      [
        { name: "A園", subkind: "認定こども園（保育所型）", address: null },
        { name: "B園", subkind: "認可私立保育所", address: null },
      ],
      CHILDCARE,
    ),
    busStops: availableFixture(
      [
        { name: "上郷公民館前", subkind: null, address: null },
        { name: "別府", subkind: null, address: null },
        { name: "黒田", subkind: null, address: null },
      ],
      BUS,
    ),
  },
});

async function open(query = "") {
  url.set(`/erabu?${query}`);
  await act(async () => {
    render(<ErabuFlow />);
  });
}

async function tap(name: string | RegExp) {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });
}

const params = () => new URLSearchParams(url.query);
const reply = () => screen.getByRole("region", { name: "選んだ条件のデータ" });

beforeEach(() => {
  screenData = PUBLISHED;
  url.push.mockReset();
});

describe("ErabuFlow：質問の進行", () => {
  it("最初は地区の質問で、選ぶまでは次へ進めない", async () => {
    await open();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("どの地区で暮らす？");
    expect(screen.getByRole("button", { name: /ここで暮らしてみる/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "家族" })).toBeDisabled();
    expect(screen.queryByText(/を舞台に、暮らしをつくります。/)).not.toBeInTheDocument();
  });

  it("地区を選ぶと URL に入り、次へで家族の質問に進む。もどるで地区に戻っても選んだ地区は残る", async () => {
    await open();
    await tap("上郷");
    expect(params().get("d")).toBe("kamisato");
    expect(screen.getByRole("button", { name: "上郷" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("上郷を舞台に、暮らしをつくります。")).toBeInTheDocument();

    await tap(/ここで暮らしてみる/);
    expect(params().get("q")).toBe("family");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("何人で暮らす？");
    expect(screen.getByRole("listitem", { current: "step" })).toHaveTextContent("家族");
    expect(screen.getByRole("button", { name: "地区（答えた）" })).toBeEnabled();

    await tap(/もどる/);
    expect(params().get("q")).toBe("district");
    expect(screen.getByRole("button", { name: "上郷" })).toHaveAttribute("aria-pressed", "true");
  });

  it("飯田市全体の絵の地区の札を押しても、その地区を選べる", async () => {
    await open();
    const map = screen.getByRole("group", { name: "わが家のプレビュー：飯田市の4地区" });
    await act(async () => {
      fireEvent.click(within(map).getByText("鼎"));
    });
    expect(params().get("d")).toBe("kanae");
    expect(screen.getByRole("button", { name: "鼎" })).toHaveAttribute("aria-pressed", "true");
  });

  it("地区がないまま後ろの質問の URL を開いたら、地区の質問を出す", async () => {
    await open("q=car");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("どの地区で暮らす？");
  });

  it("家族は大人1〜2人・子ども0〜2人をタップで増減し、プレビューの家族も変わる", async () => {
    await open("d=kamisato&q=family");
    expect(screen.getByRole("group", { name: "わが家のプレビュー：上郷で暮らす、大人2人・子ども1人の家族" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "大人を1人増やす" })).toBeDisabled();
    await tap("子どもを1人増やす");
    expect(params().get("k")).toBe("2");
    expect(screen.getByRole("button", { name: "子どもを1人増やす" })).toBeDisabled();
    await tap("大人を1人減らす");
    expect(params().get("a")).toBe("1");
    expect(screen.getByRole("button", { name: "大人を1人減らす" })).toBeDisabled();
    expect(screen.getByRole("group", { name: "わが家のプレビュー：上郷で暮らす、大人1人・子ども2人の家族" })).toBeInTheDocument();
  });

  it("車は「まだ決めない」で未選択にして次の質問へ進む", async () => {
    await open("d=kamisato&c=0&q=car");
    await tap("まだ決めない");
    expect(params().has("c")).toBe(false);
    expect(params().get("q")).toBe("priorities");
  });

  it("大切にしたいことは複数選べ、最後に条件つきで くらしを見る へ進む", async () => {
    await open("d=kamisato&a=2&k=1&h=old&c=0&q=priorities");
    await tap("防災");
    await tap("住まい");
    const link = screen.getByRole("link", { name: /わが家の一年を見にいく/ });
    expect(link).toHaveAttribute("href", "/kurashi?d=kamisato&a=2&k=1&h=old&c=0&p=housing%2Cdisaster");
    expect(link.getAttribute("href")).not.toContain("q=");
    expect(screen.getByRole("link", { name: "選ばずに進む" })).toHaveAttribute("href", "/kurashi?d=kamisato&a=2&k=1&h=old&c=0");
  });
});

describe("ErabuFlow：選ぶたびの返事（要件 4章）", () => {
  it("住む地区：返事のカードは出さない（028 の見本どおり。相場は家の質問で出す）", async () => {
    await open("d=kamisato");
    expect(screen.queryByRole("region", { name: "選んだ条件のデータ" })).not.toBeInTheDocument();
  });

  it("子ども1人以上：保育園・幼稚園等と小学校の数と出典。子ども0人にすると返事を消す", async () => {
    await open("d=kamisato&k=1&q=family");
    expect(reply()).toHaveTextContent("上郷の子育て・学校");
    expect(reply()).toHaveTextContent("保育園・幼稚園等 2か所");
    expect(reply()).toHaveTextContent("小学校 1校");
    expect(reply()).toHaveTextContent("出典：提供元「iida_childcare の名前」「iida_education の名前」");
    expect(within(reply()).getAllByText("確認日")).toHaveLength(2);
    await tap("子どもを1人減らす");
    expect(screen.queryByRole("region", { name: "選んだ条件のデータ" })).not.toBeInTheDocument();
  });

  it("家：返事は「住まいの参考相場を確認」のカードだけで、押すと下のシートに相場を出す（028）", async () => {
    await open("d=kamisato&h=new&q=housing");
    expect(screen.queryByText("3,900万円")).not.toBeInTheDocument();
    await tap(/住まいの参考相場を確認/);
    const sheet = screen.getByRole("dialog", { name: "上郷の中古戸建て（築20年以内）" });
    expect(within(sheet).getByText("3,900万円")).toBeInTheDocument();
    // 買う・新しめは件数が12件でも「件数少なめ・参考程度」を付ける
    expect(within(sheet).getByText("件数少なめ・参考程度")).toBeInTheDocument();
    expect(within(sheet).getByText(/過去の取引の参考値です/)).toBeInTheDocument();
    // 出典はシートに出さない（カルテとデータについてで見る。2026-10-29 まさゆきさん）
    expect(within(sheet).queryByText(/^出典：/)).not.toBeInTheDocument();

    vi.useFakeTimers();
    try {
      await act(async () => {
        fireEvent.click(within(sheet).getByRole("button", { name: "閉じる" }));
        vi.advanceTimersByTime(200);
      });
    } finally {
      vi.useRealTimers();
    }
    expect(sheet).not.toHaveAttribute("open");
  });

  it("家：買う・古め・借りる に選び直すとシートの中身も変わる。借りるはデータ未取得", async () => {
    await open("d=kamisato&h=new&q=housing");
    await tap(/買う・古め/);
    await tap(/住まいの参考相場を確認/);
    const sheet = screen.getByRole("dialog", { name: "上郷の中古戸建て（築21年以上）" });
    expect(within(sheet).getByText("860万円")).toBeInTheDocument();
    expect(within(sheet).getByText("件数じゅうぶん")).toBeInTheDocument();
  });

  it("家：借りるときもカードは出し、シートでデータ未取得と出す", async () => {
    await open("d=kamisato&h=rent&q=housing");
    await tap(/住まいの参考相場を確認/);
    const sheet = screen.getByRole("dialog", { name: "借りるときの家賃" });
    expect(within(sheet).getByText("データ未取得")).toBeInTheDocument();
    expect(sheet).not.toHaveTextContent(/万円/);
  });

  it("家の質問から、プレビューに選んだ家が建つ", async () => {
    await open("d=kamisato&a=2&k=1&h=old&q=housing");
    expect(screen.getByRole("group", { name: "わが家のプレビュー：上郷の「買う・古め」の家で暮らす、大人2人・子ども1人の家族" })).toBeInTheDocument();
    await tap(/借りる/);
    expect(screen.getByRole("group", { name: "わが家のプレビュー：上郷の「借りる」の家で暮らす、大人2人・子ども1人の家族" })).toBeInTheDocument();
  });

  it("車：選んだ台数の帯と、プレビューの車。もう一度押すと未選択に戻して帯を消す。返事のカードは出さない（028 見本）", async () => {
    await open("d=kamisato&a=2&k=1&h=new&q=car");
    expect(screen.queryByText(/の暮らしを想像します/)).not.toBeInTheDocument();
    await tap(/^1台/);
    expect(params().get("c")).toBe("1");
    expect(screen.getByText("家族で1台の暮らしを想像します")).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "わが家のプレビュー：上郷の「買う・新しめ」の家で暮らす、大人2人・子ども1人の家族（車1台）" }),
    ).toBeInTheDocument();
    await tap(/^0台/);
    expect(screen.getByText("車なしの暮らしを想像します")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "選んだ条件のデータ" })).not.toBeInTheDocument();
    await tap(/^0台/);
    expect(params().has("c")).toBe(false);
    expect(screen.queryByText(/の暮らしを想像します/)).not.toBeInTheDocument();
  });

  it("車：台数によらず、地図でバス停を見るカードを条件つきで出す", async () => {
    await open("d=kamisato&a=2&k=1&h=new&c=2&q=car");
    expect(screen.getByText("家族で2台以上の暮らしを想像します")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /バス停の場所は、地図で確認/ })).toHaveAttribute("href", "/chizu?d=kamisato&a=2&k=1&h=new&c=2");
  });

  it("出典が未公開ならデータ未取得と出し、作った数字で埋めない", async () => {
    screenData = screenDataFixture();
    await open("d=kanae&k=1&q=family");
    expect(within(reply()).getAllByText("データ未取得")).toHaveLength(2);
    expect(reply()).not.toHaveTextContent(/\d+(か所|校)/);
  });
});
