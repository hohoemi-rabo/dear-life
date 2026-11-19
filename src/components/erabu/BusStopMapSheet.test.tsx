import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MapCanvasProps } from "@/components/chizu/MapCanvas";
import { GOOGLE_FLAT_MAP_CREDIT } from "@/lib/credits";
import type { MapData, MapDistrictData } from "@/lib/map/map-data";
import { MAP_POINT_KINDS } from "@/lib/map/map-data";
import type { DistrictId } from "@/lib/town-district/resolve";
import { sourceFixture } from "@/test/screen-data-fixture";
import { BusStopMapSheet } from "./BusStopMapSheet";

let mapData: Promise<MapData>;
vi.mock("@/lib/map/load-map-data", () => ({ loadMapData: () => mapData, clearMapDataCache: () => {} }));

// Google マップは jsdom で動かないので、受け取った props を記録し、タップの代わりのボタンを出す偽物にする
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
      </div>
    );
  },
}));

const BUS = sourceFixture("gtfs_bus", { name: "南信州のバス", publisher: "GTFSデータリポジトリ" });
const STATIONS = sourceFixture("sena_iida_line_stations", { name: "JR飯田線の駅", publisher: "SENA" });
const SCHOOL_DISTRICTS = sourceFixture("reinfolib_xkt004", { name: "小学校区", publisher: "国土交通省" });

function districtFixture(id: DistrictId, busStops: number): MapDistrictData {
  const unavailable = Object.fromEntries(MAP_POINT_KINDS.map((kind) => [kind, { status: "unavailable" }])) as MapDistrictData["points"];
  const points: MapDistrictData["points"] = {
    ...unavailable,
    bus_stops: {
      status: "available",
      value: Array.from({ length: busStops }, (_, index) => ({ name: `${id}のバス停${index + 1}`, subkind: null, address: null, latitude: 35.5, longitude: 137.8 })),
      source: BUS,
    },
    train_stations: { status: "none", source: STATIONS },
  };
  return { id, points, elementarySchoolDistricts: { status: "none", source: SCHOOL_DISTRICTS } };
}

function fixture(): MapData {
  const ids: DistrictId[] = ["kamisato", "kanae", "igara", "chushin"];
  const districts = Object.fromEntries(ids.map((id, index) => [id, districtFixture(id, index + 2)])) as Record<DistrictId, MapDistrictData>;
  return { generatedAt: "2026-11-19T03:00:00Z", sources: [BUS, STATIONS, SCHOOL_DISTRICTS], districtOrder: ids, districts };
}

afterEach(cleanup);

describe("BusStopMapSheet（えらぶの車0台）", () => {
  it("選んだ地区のバス停と駅だけを平面で出し、点を押すと名前を出す。閉じると onClose", async () => {
    mapData = Promise.resolve(fixture());
    const onClose = vi.fn();
    await act(async () => {
      render(<BusStopMapSheet open onClose={onClose} district="kamisato" />);
    });
    const sheet = screen.getByRole("dialog", { name: "上郷のバス停と駅" });
    expect(within(sheet).getByText("2か所")).toBeInTheDocument();
    expect(within(sheet).getByText("該当なし")).toBeInTheDocument();
    expect(canvas.props?.tilted).toBe(false);
    expect(canvas.props?.showSchoolDistricts).toBe(false);
    expect(canvas.props?.focus).toBe("kamisato");
    expect(canvas.props?.points.features.every((feature) => feature.properties.district === "kamisato")).toBe(true);
    expect([...(canvas.props?.visibleKinds ?? [])]).toEqual(["bus_stops", "train_stations"]);
    expect(within(sheet).queryByRole("button", { name: "立体で見る" })).toBeNull();
    expect(within(sheet).getByText(GOOGLE_FLAT_MAP_CREDIT)).toBeInTheDocument();

    fireEvent.click(within(sheet).getAllByRole("button", { name: "点：bus_stops" })[0]);
    expect(within(sheet).getByText("kamisatoのバス停1")).toBeInTheDocument();

    fireEvent.click(within(sheet).getByRole("button", { name: "車の質問にもどる" }));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 250));
    });
    expect(onClose).toHaveBeenCalled();
  });
});
