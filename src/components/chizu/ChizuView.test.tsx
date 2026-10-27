import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { MapCanvasProps } from "@/components/chizu/MapCanvas";
import type { MapData, MapDistrictData } from "@/lib/map/map-data";
import { MAP_POINT_KINDS } from "@/lib/map/map-data";
import { NOTICES } from "@/lib/notices";
import type { DistrictId } from "@/lib/town-district/resolve";
import { sourceFixture } from "@/test/screen-data-fixture";
import { ChizuView } from "./ChizuView";

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
    usePathname: () => "/chizu",
    useRouter: () => ({ push: (href: string) => url.set(href), replace: (href: string) => url.set(href) }),
    useSearchParams: () => {
      const query = useSyncExternalStore(url.subscribe, () => url.query);
      return useMemo(() => new URLSearchParams(query), [query]);
    },
  };
});

// use() に渡すので、本物と同じく毎回同じ Promise を返す
let mapData: Promise<MapData>;
vi.mock("@/lib/map/load-map-data", () => ({ loadMapData: () => mapData, clearMapDataCache: () => {} }));

// MapLibre は jsdom で動かないので、受け取った props を記録し、タップの代わりのボタンを出す偽物にする
const canvas = vi.hoisted(() => ({ props: null as MapCanvasProps | null }));
vi.mock("@/components/chizu/LazyMapCanvas", () => ({
  LazyMapCanvas: (props: MapCanvasProps) => {
    canvas.props = props;
    return (
      <div data-testid="map">
        {props.points.features.map((feature) => (
          <button
            key={`${feature.properties.district}-${feature.properties.kind}-${feature.properties.index}`}
            type="button"
            onClick={() => props.onSelect({ type: "point", point: feature.properties })}
          >
            点：{feature.properties.kind}
          </button>
        ))}
        {props.schoolDistricts.features.map((feature) => (
          <button
            key={feature.properties.schoolName}
            type="button"
            onClick={() => props.onSelect({ type: "schoolDistrict", schoolName: feature.properties.schoolName, district: feature.properties.district })}
          >
            学区：{feature.properties.schoolName}
          </button>
        ))}
      </div>
    );
  },
}));

const EDUCATION = sourceFixture("iida_education", { name: "教育機関一覧", publisher: "飯田市", periodLabel: "2025年4月1日更新" });
const STATIONS = sourceFixture("sena_iida_line_stations", { name: "JR飯田線の駅", publisher: "SENA" });
const SCHOOL_DISTRICTS = sourceFixture("reinfolib_xkt004", { name: "小学校区（国土数値情報）", publisher: "国土交通省 不動産情報ライブラリ" });

function districtFixture(id: DistrictId, overrides: Partial<MapDistrictData> = {}): MapDistrictData {
  return {
    id,
    points: Object.fromEntries(MAP_POINT_KINDS.map((kind) => [kind, { status: "unavailable" }])) as MapDistrictData["points"],
    elementarySchoolDistricts: { status: "none", source: SCHOOL_DISTRICTS },
    ...overrides,
  };
}

function fixture(): MapData {
  const ids: DistrictId[] = ["kamisato", "kanae", "igara", "chushin"];
  const districts = Object.fromEntries(ids.map((id) => [id, districtFixture(id)])) as Record<DistrictId, MapDistrictData>;
  for (const id of ids) {
    districts[id] = districtFixture(id, {
      points: { ...districts[id].points, schools: { status: "none", source: EDUCATION }, train_stations: { status: "none", source: STATIONS } },
    });
  }
  districts.kanae = districtFixture("kanae", {
    points: {
      ...districts.kanae.points,
      schools: {
        status: "available",
        value: [{ name: "飯田市立鼎小学校", subkind: "小学校", address: "飯田市鼎中平1934", latitude: 35.5, longitude: 137.82 }],
        source: EDUCATION,
      },
      train_stations: { status: "available", value: [{ name: "鼎", subkind: null, address: null, latitude: 35.51, longitude: 137.83 }], source: STATIONS },
    },
    elementarySchoolDistricts: {
      status: "available",
      value: [{ schoolName: "鼎小学校", coordinates: [[[[137.82, 35.5], [137.83, 35.5], [137.83, 35.51], [137.82, 35.5]]]] }],
      source: SCHOOL_DISTRICTS,
    },
  });
  return { generatedAt: "2026-10-27T03:00:00Z", sources: [EDUCATION, STATIONS, SCHOOL_DISTRICTS], districtOrder: ids, districts };
}

async function open(query: string) {
  mapData = Promise.resolve(fixture());
  url.set(`/chizu?${query}`);
  await act(async () => {
    render(<ChizuView />);
  });
}

const districtButtons = () => screen.getByRole("group", { name: "地図で見る地区" });
const layers = () => screen.getByRole("region", { name: "地図に出すもの" });
const detail = () => screen.getByRole("region", { name: "選んだ場所" });

describe("ChizuView（021）", () => {
  it("平面で開き、選んだ地区に合わせる。注意書きと地理院タイルの出典を出す", async () => {
    await open("d=kanae&a=2&k=1&h=new");
    expect(canvas.props).toMatchObject({ focus: "kanae", tilted: false, baseMap: "standard", showSchoolDistricts: true });
    expect(within(districtButtons()).getByRole("button", { name: "鼎" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(NOTICES.mapPosition)).toBeInTheDocument();
    expect(screen.getByText(NOTICES.mapOffline)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "地理院タイル（国土地理院）" })).toHaveAttribute("href", "https://maps.gsi.go.jp/development/ichiran.html");
  });

  it("種類ごとに、4地区の件数・該当なし・データ未取得を出し、表示を切り替えられる", async () => {
    await open("d=kanae");
    const row = (label: string) => within(layers()).getByRole("checkbox", { name: new RegExp(`^${label}`) }).closest("label") as HTMLElement;
    expect(row("学校")).toHaveTextContent("4地区で1か所");
    expect(row("駅")).toHaveTextContent("4地区で1か所");
    expect(row("バス停")).toHaveTextContent("データ未取得");
    expect(row("小学校区")).toHaveTextContent("4地区で1か所");
    expect(canvas.props?.visibleKinds.has("evacuation_sites")).toBe(false);

    fireEvent.click(within(row("学校")).getByRole("checkbox"));
    expect(canvas.props?.visibleKinds.has("schools")).toBe(false);
    fireEvent.click(within(row("避難場所")).getByRole("checkbox"));
    expect(canvas.props?.visibleKinds.has("evacuation_sites")).toBe(true);
    fireEvent.click(within(row("小学校区")).getByRole("checkbox"));
    expect(canvas.props?.showSchoolDistricts).toBe(false);
  });

  it("点をタップすると名称・住所・出典を出す。住所のない駅は「出典に記載なし」", async () => {
    await open("d=kanae");
    fireEvent.click(screen.getByRole("button", { name: "点：schools" }));
    expect(detail()).toHaveTextContent("飯田市立鼎小学校");
    expect(detail()).toHaveTextContent("飯田市鼎中平1934");
    expect(detail()).toHaveTextContent("飯田市「教育機関一覧」");
    fireEvent.click(screen.getByRole("button", { name: "点：train_stations" }));
    expect(detail()).toHaveTextContent("出典に記載なし");
    expect(detail()).toHaveTextContent("SENA「JR飯田線の駅」");
  });

  it("小学校区をタップすると学校名と、学区は年度で変わる注意書きを出す", async () => {
    await open("d=kanae");
    fireEvent.click(screen.getByRole("button", { name: "学区：鼎小学校" }));
    expect(detail()).toHaveTextContent("鼎小学校の学区");
    expect(detail()).toHaveTextContent(NOTICES.schoolDistrict);
    expect(within(layers()).getByRole("list", { name: "小学校区の色" })).toHaveTextContent("鼎小学校");
  });

  it("「立体で見る」で傾け、立体のときだけ航空写真を選べる。平面に戻すと地図の下地に戻る", async () => {
    await open("d=kanae");
    expect(screen.queryByRole("button", { name: "航空写真" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "立体で見る" }));
    expect(canvas.props?.tilted).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "航空写真" }));
    expect(canvas.props?.baseMap).toBe("photo");
    fireEvent.click(screen.getByRole("button", { name: "平面に戻す" }));
    expect(canvas.props).toMatchObject({ tilted: false, baseMap: "standard" });
  });

  it("地区を切り替えると URL の地区が変わり、地図をその地区に動かす", async () => {
    await open("d=kanae");
    await act(async () => {
      fireEvent.click(within(districtButtons()).getByRole("button", { name: "伊賀良" }));
    });
    expect(new URLSearchParams(url.query).get("d")).toBe("igara");
    expect(canvas.props?.focus).toBe("igara");
  });

  it("一覧から選んでも詳しい内容を出す（地図を使えない人・端末のため）", async () => {
    await open("d=kanae");
    fireEvent.click(screen.getByRole("button", { name: "飯田市立鼎小学校" }));
    expect(detail()).toHaveTextContent("飯田市鼎中平1934");
  });

  it("地区を選んでいなければ4地区を見せ、えらぶへ案内する。選んでいればカルテに戻れる", async () => {
    await open("");
    expect(canvas.props?.focus).toBeNull();
    expect(screen.getByRole("link", { name: /地区をえらんで/ })).toHaveAttribute("href", expect.stringMatching(/^\/erabu/));
  });

  it("地区を選んでいれば、条件と季節を持ってカルテに戻れる", async () => {
    await open("s=winter&d=kanae&a=2&k=1&h=new&c=0");
    expect(screen.getByRole("link", { name: /カルテに戻る/ })).toHaveAttribute("href", "/karte?s=winter&d=kanae&a=2&k=1&h=new&c=0");
  });
});
