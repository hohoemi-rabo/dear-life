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
  it("最初は地区の質問で、対象地区を明記し、選ぶまでは次へ進めない", async () => {
    await open();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("どの地区で暮らす？");
    expect(screen.getByText("対象地区：上郷・鼎・伊賀良・中心市街地")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /次へ/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "家族" })).toBeDisabled();
    expect(screen.queryByRole("region", { name: "選んだ条件のデータ" })).not.toBeInTheDocument();
  });

  it("地区を選ぶと URL に入り、次へで家族の質問に進む。戻るで地区に戻っても選んだ地区は残る", async () => {
    await open();
    await tap("上郷");
    expect(params().get("d")).toBe("kamisato");
    expect(screen.getByRole("button", { name: "上郷" })).toHaveAttribute("aria-pressed", "true");

    await tap(/次へ/);
    expect(params().get("q")).toBe("family");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("何人で暮らす？");
    expect(within(screen.getByRole("list", { name: "選んだ条件" })).getByText("上郷")).toBeInTheDocument();

    await tap(/戻る/);
    expect(params().get("q")).toBe("district");
    expect(screen.getByRole("button", { name: "上郷" })).toHaveAttribute("aria-pressed", "true");
  });

  it("地区がないまま後ろの質問の URL を開いたら、地区の質問を出す", async () => {
    await open("q=car");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("どの地区で暮らす？");
  });

  it("家族は人数をタップで増減し、範囲の端ではボタンを押せない", async () => {
    await open("d=kamisato&q=family");
    await tap("子どもを1人減らす");
    expect(params().get("k")).toBe("0");
    expect(screen.getByRole("button", { name: "子どもを1人減らす" })).toBeDisabled();
    await tap("大人を1人増やす");
    expect(params().get("a")).toBe("3");
  });

  it("車は飛ばすと未選択にして次の質問へ進む", async () => {
    await open("d=kamisato&c=0&q=car");
    await tap("飛ばす");
    expect(params().has("c")).toBe(false);
    expect(params().get("q")).toBe("priorities");
  });

  it("大切にしたいことは複数選べ、最後に条件つきで くらしを見る へ進む", async () => {
    await open("d=kamisato&a=2&k=1&h=old&c=0&q=priorities");
    await tap("防災");
    await tap("住まい");
    const link = screen.getByRole("link", { name: /くらしを見る/ });
    expect(link).toHaveAttribute("href", "/kurashi?d=kamisato&a=2&k=1&h=old&c=0&p=housing%2Cdisaster");
    expect(link.getAttribute("href")).not.toContain("q=");
    expect(screen.getByRole("link", { name: "飛ばす" })).toHaveAttribute("href", "/kurashi?d=kamisato&a=2&k=1&h=old&c=0");
  });
});

describe("ErabuFlow：選ぶたびの返事（要件 4章）", () => {
  it("住む地区：範囲と土地の真ん中の値・件数・注意書き・出典", async () => {
    await open("d=kamisato");
    const card = reply();
    expect(within(card).getByText("上郷飯沼・上郷黒田・上郷別府")).toBeInTheDocument();
    expect(within(card).getByText("2.8万円")).toBeInTheDocument();
    expect(within(card).getByText("1坪あたり 約9.26万円")).toBeInTheDocument();
    expect(within(card).getByText("202件")).toBeInTheDocument();
    expect(within(card).getByText("件数じゅうぶん")).toBeInTheDocument();
    expect(within(card).getByText("現在の売り出し価格ではなく、過去の取引の参考値です。")).toBeInTheDocument();
    expect(within(card).getByText("国土交通省 不動産情報ライブラリ「不動産価格（取引価格・成約価格）情報」")).toBeInTheDocument();
    expect(within(card).getByText("2021年第1四半期〜2026年第1四半期")).toBeInTheDocument();
    expect(within(card).getByText("取得日")).toBeInTheDocument();
  });

  it("子ども1人以上：保育園・幼稚園等と小学校の数。子ども0人にすると返事を消す", async () => {
    await open("d=kamisato&k=1&q=family");
    expect(within(reply()).getByText("保育園・幼稚園等").nextSibling).toHaveTextContent("2か所");
    expect(within(reply()).getByText("小学校").nextSibling).toHaveTextContent("1校");
    expect(within(reply()).getAllByText("確認日")).toHaveLength(2);
    await tap("子どもを1人減らす");
    expect(screen.queryByRole("region", { name: "選んだ条件のデータ" })).not.toBeInTheDocument();
  });

  it("家：買う・新しめは件数が12件でも「件数少なめ・参考程度」を付ける", async () => {
    await open("d=kamisato&h=new&q=housing");
    expect(within(reply()).getByText("上郷で「買う・新しめ」なら")).toBeInTheDocument();
    expect(within(reply()).getByText("3,900万円")).toBeInTheDocument();
    expect(within(reply()).getByText("件数少なめ・参考程度")).toBeInTheDocument();
  });

  it("家：買う・古め・借りる に選び直すと返事も変わる", async () => {
    await open("d=kamisato&h=new&q=housing");
    await tap(/買う・古め/);
    expect(within(reply()).getByText("860万円")).toBeInTheDocument();
    expect(within(reply()).getByText("件数じゅうぶん")).toBeInTheDocument();
    await tap(/借りる/);
    expect(within(reply()).getByText("家賃の情報はまだありません。")).toBeInTheDocument();
  });

  it("車：0台でバス停の数。もう一度押すと未選択に戻して返事を消す", async () => {
    await open("d=kamisato&q=car");
    await tap(/0台/);
    expect(within(reply()).getByText("バス停").nextSibling).toHaveTextContent("3か所");
    await tap(/0台/);
    expect(params().has("c")).toBe(false);
    expect(screen.queryByRole("region", { name: "選んだ条件のデータ" })).not.toBeInTheDocument();
  });

  it("出典が未公開ならデータ未取得と出し、作った数字で埋めない", async () => {
    screenData = screenDataFixture();
    await open("d=kanae");
    expect(within(reply()).getByText("データ未取得")).toBeInTheDocument();
    expect(within(reply()).queryByText(/万円/)).not.toBeInTheDocument();
  });
});
