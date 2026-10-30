import { act, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ScreenData } from "@/lib/data/screen-data";
import { ILLUSTRATION_NOTE, REINFOLIB_API_CREDIT } from "@/lib/credits";
import { NOTICES } from "@/lib/notices";
import { MARKET_SOURCE, screenDataFixture, sourceFixture } from "@/test/screen-data-fixture";
import AboutDataPage from "./page";

let screenData: ScreenData;
vi.mock("@/lib/data/load-screen-data", () => ({ loadScreenData: () => Promise.resolve(screenData) }));

const CHILDCARE = sourceFixture("iida_childcare", {
  name: "子育て施設",
  publisher: "飯田市",
  url: "https://www.city.iida.lg.jp/soshiki/168/opendata.html",
  license: "PDL1.0",
  credit: "出典：飯田市（https://www.city.iida.lg.jp/soshiki/168/opendata.html）、PDL1.0 …「子育て施設」（飯田市）を加工して作成",
  periodLabel: "2024年11月5日更新",
  checkedOn: "2026-10-24",
  fetchedOn: null,
});
const UNKNOWN = sourceFixture("zz_new_source", { name: "あとで足した出典" });

async function open() {
  await act(async () => {
    render(<AboutDataPage />);
  });
}

const section = (name: string) => screen.getByRole("region", { name });

beforeEach(() => {
  screenData = {
    ...screenDataFixture({
      kanae: {
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
      },
    }),
    sources: [UNKNOWN, CHILDCARE, { ...MARKET_SOURCE, credit: "出典：国土交通省 不動産情報ライブラリ（https://www.reinfolib.mlit.go.jp/）。…" }],
    marketSummary: {
      status: "available",
      source: MARKET_SOURCE,
      value: {
        periodFrom: "2021Q1",
        periodTo: "2026Q1",
        citywideCount: 1313,
        districtCount: 792,
        excludedCount: 7,
        mediationCount: 6,
        relatedPartyCount: 1,
        adjacentLandCount: 0,
      },
    },
    supportPrograms: [
      { name: "A", summary: "a", category: "住まい", officialUrl: "https://example.jp/a", checkedOn: "2026-10-26" },
      { name: "B", summary: "b", category: "住まい", officialUrl: "https://example.jp/b", checkedOn: "2026-10-20" },
    ],
  } as ScreenData;
});

describe("データについて（022・F-08・7.3）", () => {
  it("個人が作ったサービスであること、絵は生成AIのイメージであること、利用上の注意、API 利用約款 第7条のクレジットを出す", async () => {
    await open();
    expect(within(section("このサービスについて")).getByText(/個人が公開データをもとに作成したもの/)).toBeInTheDocument();
    expect(within(section("このサービスについて")).getByText(ILLUSTRATION_NOTE)).toBeInTheDocument();
    for (const notice of [NOTICES.market, NOTICES.mapPosition, NOTICES.support, NOTICES.events]) {
      expect(within(section("利用上の注意")).getByText(notice)).toBeInTheDocument();
    }
    expect(within(section("出典")).getByText(REINFOLIB_API_CREDIT)).toBeInTheDocument();
  });

  it("相場の対象期間と、除いた取引の件数を理由ごとに出す", async () => {
    await open();
    const market = section("住まいの相場の計算のしかた");
    expect(within(market).getByText("2021年第1四半期〜2026年第1四半期")).toBeInTheDocument();
    expect(market).toHaveTextContent("この期間の飯田市の取引 1,313件のうち、4地区の取引は 792件です。そこから次の 7件を除いて計算しています。");
    const rows = within(within(market).getByRole("table")).getAllByRole("row").map((row) => row.textContent);
    expect(rows).toEqual(["調停・競売等6件", "関係者間取引1件", "隣地の購入0件"]);
    expect(market).toHaveTextContent("30件以上：「件数じゅうぶん」");
  });

  it("相場の出典が未公開なら、件数はデータ未取得と出す", async () => {
    screenData = { ...screenData, marketSummary: { status: "unavailable" } };
    await open();
    expect(section("住まいの相場の計算のしかた")).toHaveTextContent("データ未取得");
  });

  it("出典は使い道の順に、対象・確認日・利用条件・クレジットをそのまま出す。知らない出典も落とさず最後に出す", async () => {
    await open();
    const items = within(section("出典")).getAllByRole("listitem");
    expect(items.map((item) => within(item).getByRole("heading").textContent)).toEqual([
      "国土交通省 不動産情報ライブラリ「不動産価格（取引価格・成約価格）情報」",
      "飯田市「子育て施設」",
      "提供元「あとで足した出典」",
    ]);
    const childcare = items[1];
    expect(childcare).toHaveTextContent("使い道保育園・幼稚園など、放課後児童クラブ");
    expect(childcare).toHaveTextContent("対象2024年11月5日更新");
    expect(childcare).toHaveTextContent("確認日2026年10月24日");
    expect(childcare).toHaveTextContent("利用条件PDL1.0");
    expect(within(childcare).getByText(CHILDCARE.credit as string)).toBeInTheDocument();
    expect(within(childcare).getByRole("link", { name: /配布元のページ/ })).toHaveAttribute("href", CHILDCARE.url);
    expect(items[2]).not.toHaveTextContent("使い道");
  });

  it("行事は独自にまとめた旨と資料名・確認日、支援制度は件数と確認日の幅を出す", async () => {
    await open();
    const manual = section("手でまとめた情報");
    expect(manual).toHaveTextContent(
      "地区の行事は、飯田市の公民館資料や地区公民館の情報をもとに独自にまとめたものです。年によって変わることがあります。",
    );
    expect(manual).toHaveTextContent("資料：飯田市の公民館活動（令和7年度）・確認日 2026年10月26日");
    expect(manual).toHaveTextContent("2件・確認日 2026年10月20日〜2026年10月26日");
  });

  it("地図の背景は地理院タイルの出典とリンクを出す", async () => {
    await open();
    expect(within(section("地図")).getByRole("link", { name: "地理院タイル（国土地理院）" })).toHaveAttribute(
      "href",
      "https://maps.gsi.go.jp/development/ichiran.html",
    );
  });
});
