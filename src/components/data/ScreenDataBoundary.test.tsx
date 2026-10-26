import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearScreenDataCache, loadScreenData } from "@/lib/data/load-screen-data";
import { ScreenDataBoundary, useScreenData } from "./ScreenDataBoundary";

const emptySection = (source_id: string) => ({ source_id, items: [] });
const body = {
  generated_at: "2026-10-26T13:00:00+00:00",
  sources: [],
  districts: ["kamisato", "kanae", "igara", "chushin"].map((id) => ({
    id,
    name: { kamisato: "上郷", kanae: "鼎", igara: "伊賀良", chushin: "中心市街地" }[id],
    area_description: "範囲",
    market: emptySection("reinfolib_xit001"),
    elementary_school_districts: emptySection("reinfolib_xkt004"),
    junior_high_school_districts: emptySection("reinfolib_xkt005"),
    facilities: Object.fromEntries(
      ["schools", "childcare", "after_school_clubs", "evacuation_sites", "public_facilities", "bus_stops", "train_stations"].map((key) => [
        key,
        emptySection("x"),
      ]),
    ),
    train_departures: emptySection("iida_jr_timetable"),
    population: emptySection("estat_census_small_area"),
    bus_outing: emptySection("gtfs_minamishinshu_bus"),
    train_outing: emptySection("iida_jr_timetable"),
    events: [],
  })),
  support_programs: [],
  scene_templates: [],
};

function DistrictNames() {
  const data = useScreenData();
  return <p>{data.districtOrder.map((id) => data.districts[id].name).join("・")}</p>;
}

// 同じ回の描画の中で何度呼ばれても、通信は1回だけ
function TwoReaders() {
  return (
    <>
      <DistrictNames />
      <DistrictNames />
    </>
  );
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  clearScreenDataCache();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("ScreenDataBoundary", () => {
  it("読み込み中は骨組みを出し、届いたら中身を出す。データは1回だけ読む", async () => {
    let respond: (response: Response) => void = () => {};
    fetchMock.mockReturnValue(new Promise((resolve) => (respond = resolve)));
    await act(async () => {
      render(
        <ScreenDataBoundary>
          <TwoReaders />
        </ScreenDataBoundary>,
      );
    });
    expect(screen.getByRole("status")).toHaveTextContent("データを読み込んでいます");

    // 応答を返し、キャッシュされた読み込み（同じ Promise）が終わるまで act の中で待つ
    await act(async () => {
      respond(new Response(JSON.stringify(body)));
      await loadScreenData();
    });
    expect(await screen.findAllByText("上郷・鼎・伊賀良・中心市街地")).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("読み込めなかったら再試行のボタンを出し、押すと読み直す", async () => {
    fetchMock.mockResolvedValueOnce(new Response("", { status: 404 })).mockResolvedValueOnce(new Response(JSON.stringify(body)));
    vi.spyOn(console, "error").mockImplementation(() => {});
    // use() で待っている Promise が解決したことを React に伝えるため、act の中で描画する
    await act(async () => {
      render(
        <ScreenDataBoundary>
          <DistrictNames />
        </ScreenDataBoundary>,
      );
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("データを読み込めませんでした");

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "もう一度読み込む" })));
    expect(await screen.findByText("上郷・鼎・伊賀良・中心市街地")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("データの読み込み以外のエラーは受け止めずに上へ渡す", () => {
    function Broken(): never {
      throw new Error("画面の不具合");
    }
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        <ScreenDataBoundary>
          <Broken />
        </ScreenDataBoundary>,
      ),
    ).toThrow("画面の不具合");
  });
});
