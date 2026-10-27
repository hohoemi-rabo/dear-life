"use client";

// MapLibre の地図（021）。MapLibre は大きい（gzip で約430KB）ので、このファイルは LazyMapCanvas から地図の画面だけで読み込む。
// 地図を作るのは1回だけで、表示の切り替え（種類・立体・下地・地区）は props の変化を地図に反映して行う
import "maplibre-gl/dist/maplibre-gl.css";
import { Map as MapLibreMap, NavigationControl, setWorkerUrl, type GeoJSONSource, type PointLike } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import type { FeatureCollection, MapSelection, MultiPolygonGeometry, PointGeometry, PointProperties, SchoolDistrictProperties } from "@/lib/map/features";
import { MAP_POINT_KINDS, type MapPointKind } from "@/lib/map/map-data";
import {
  BASE_LAYER_IDS,
  baseMapStyle,
  districtBounds,
  HILLSHADE_LAYER_ID,
  MAX_BOUNDS,
  MAX_ZOOM,
  MIN_ZOOM,
  POINT_STYLES,
  SOURCE_IDS,
  TERRAIN_EXAGGERATION,
  TILTED_PITCH,
  type BaseMap,
} from "@/lib/map/style";
import type { DistrictId } from "@/lib/town-district/resolve";

// Turbopack は MapLibre の worker を正しく書き出せないので、scripts/copy-maplibre-worker.mjs で public/maplibre/ に写したものを使う
// （MapLibre の説明書の Next.js・Turbopack の手順どおり）
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

export type MapCanvasProps = {
  points: FeatureCollection<PointGeometry, PointProperties>;
  schoolDistricts: FeatureCollection<MultiPolygonGeometry, SchoolDistrictProperties>;
  visibleKinds: ReadonlySet<MapPointKind>;
  showSchoolDistricts: boolean;
  tilted: boolean;
  baseMap: BaseMap;
  focus: DistrictId | null;
  selected: MapSelection | null;
  onSelect: (selection: MapSelection | null) => void;
};

const POINTS_SOURCE = "points";
const SCHOOL_DISTRICTS_SOURCE = "school-districts";
const SELECTED_SOURCE = "selected";
const SCHOOL_DISTRICT_FILL = "school-district-fill";
const SCHOOL_DISTRICT_LINE = "school-district-line";
const pointLayerId = (kind: MapPointKind) => `points-${kind}`;
const POINT_LAYER_IDS = MAP_POINT_KINDS.map(pointLayerId);

// 指で押しやすいように、タップした所のまわり（44px 四方）にある点を探す
const TAP_RADIUS = 22;
const FIT_PADDING = 32;

const EMPTY: FeatureCollection<PointGeometry, PointProperties> = { type: "FeatureCollection", features: [] };

function selectedFeature(selected: MapSelection | null, points: MapCanvasProps["points"]) {
  if (selected?.type !== "point") return EMPTY;
  const { kind, district, index } = selected.point;
  const found = points.features.find(
    (feature) => feature.properties.kind === kind && feature.properties.district === district && feature.properties.index === index,
  );
  return found ? { type: "FeatureCollection" as const, features: [found] } : EMPTY;
}

function addDataLayers(map: MapLibreMap) {
  map.addSource(SCHOOL_DISTRICTS_SOURCE, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  map.addSource(POINTS_SOURCE, { type: "geojson", data: EMPTY });
  map.addSource(SELECTED_SOURCE, { type: "geojson", data: EMPTY });
  map.addLayer({
    id: SCHOOL_DISTRICT_FILL,
    type: "fill",
    source: SCHOOL_DISTRICTS_SOURCE,
    // 切れ端のまま塗っても境目が見えないように、縁のなめらか処理を切る
    paint: { "fill-color": ["get", "color"], "fill-opacity": 0.18, "fill-antialias": false },
  });
  map.addLayer({
    id: SCHOOL_DISTRICT_LINE,
    type: "line",
    source: SCHOOL_DISTRICTS_SOURCE,
    filter: ["==", ["get", "merged"], true],
    paint: { "line-color": ["get", "color"], "line-width": 2, "line-opacity": 0.9 },
  });
  for (const kind of MAP_POINT_KINDS) {
    map.addLayer({
      id: pointLayerId(kind),
      type: "circle",
      source: POINTS_SOURCE,
      filter: ["==", ["get", "kind"], kind],
      paint: {
        "circle-color": POINT_STYLES[kind].color,
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 4, 16, 8],
        "circle-stroke-color": "#FFFFFF",
        "circle-stroke-width": 1.5,
      },
    });
  }
  map.addLayer({
    id: "selected",
    type: "circle",
    source: SELECTED_SOURCE,
    paint: {
      "circle-color": "rgba(0, 0, 0, 0)",
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 9, 16, 14],
      "circle-stroke-color": "#2B2A26",
      "circle-stroke-width": 3,
    },
  });
}

export default function MapCanvas(props: MapCanvasProps) {
  const { points, schoolDistricts, visibleKinds, showSchoolDistricts, tilted, baseMap, focus, selected, onSelect } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [failed, setFailed] = useState(false);
  // クリックの処理は地図を作るときに1回だけ登録するので、最新の値は ref から読む
  const latest = useRef({ onSelect, showSchoolDistricts });
  useEffect(() => {
    latest.current = { onSelect, showSchoolDistricts };
  });
  const initialFocus = useRef(focus);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let created: MapLibreMap;
    try {
      created = new MapLibreMap({
        container,
        style: baseMapStyle(),
        bounds: districtBounds(initialFocus.current),
        fitBoundsOptions: { padding: FIT_PADDING },
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        maxBounds: MAX_BOUNDS,
        maxPitch: 70,
        // 地理院タイルの出典は、たたまずにいつも見せる
        attributionControl: { compact: false },
      });
    } catch (error) {
      // WebGL が使えない端末など
      console.error("地図を作れませんでした", error);
      setFailed(true);
      return;
    }
    created.addControl(new NavigationControl({ visualizePitch: true }), "top-right");
    created.on("load", () => {
      addDataLayers(created);
      setMap(created);
    });
    created.on("click", (event) => {
      const { x, y } = event.point;
      const box: [PointLike, PointLike] = [
        [x - TAP_RADIUS, y - TAP_RADIUS],
        [x + TAP_RADIUS, y + TAP_RADIUS],
      ];
      const nearest = created
        .queryRenderedFeatures(box, { layers: POINT_LAYER_IDS })
        .map((feature) => {
          const [lng, lat] = (feature.geometry as PointGeometry).coordinates;
          const at = created.project([lng, lat]);
          return { properties: feature.properties as PointProperties, distance: Math.hypot(at.x - x, at.y - y) };
        })
        .sort((a, b) => a.distance - b.distance)[0];
      if (nearest) {
        latest.current.onSelect({ type: "point", point: nearest.properties });
        return;
      }
      const [area] = latest.current.showSchoolDistricts ? created.queryRenderedFeatures(event.point, { layers: [SCHOOL_DISTRICT_FILL] }) : [];
      if (area) {
        const properties = area.properties as SchoolDistrictProperties;
        latest.current.onSelect({ type: "schoolDistrict", schoolName: properties.schoolName, district: properties.district });
        return;
      }
      latest.current.onSelect(null);
    });
    for (const layer of [...POINT_LAYER_IDS, SCHOOL_DISTRICT_FILL]) {
      created.on("mouseenter", layer, () => (created.getCanvas().style.cursor = "pointer"));
      created.on("mouseleave", layer, () => (created.getCanvas().style.cursor = ""));
    }
    return () => {
      setMap(null);
      created.remove();
    };
  }, []);

  useEffect(() => {
    (map?.getSource(POINTS_SOURCE) as GeoJSONSource | undefined)?.setData(points);
  }, [map, points]);

  useEffect(() => {
    (map?.getSource(SCHOOL_DISTRICTS_SOURCE) as GeoJSONSource | undefined)?.setData(schoolDistricts);
  }, [map, schoolDistricts]);

  useEffect(() => {
    (map?.getSource(SELECTED_SOURCE) as GeoJSONSource | undefined)?.setData(selectedFeature(selected, points));
  }, [map, selected, points]);

  useEffect(() => {
    if (!map) return;
    for (const kind of MAP_POINT_KINDS) {
      map.setLayoutProperty(pointLayerId(kind), "visibility", visibleKinds.has(kind) ? "visible" : "none");
    }
    for (const layer of [SCHOOL_DISTRICT_FILL, SCHOOL_DISTRICT_LINE]) {
      map.setLayoutProperty(layer, "visibility", showSchoolDistricts ? "visible" : "none");
    }
  }, [map, visibleKinds, showSchoolDistricts]);

  useEffect(() => {
    if (!map) return;
    map.setLayoutProperty(BASE_LAYER_IDS.standard, "visibility", baseMap === "standard" ? "visible" : "none");
    map.setLayoutProperty(BASE_LAYER_IDS.photo, "visibility", baseMap === "photo" ? "visible" : "none");
  }, [map, baseMap]);

  // 立体：地図を倒し、標高タイルで起伏をつける。平面に戻すと標高の計算もやめる（重い機種のため）
  useEffect(() => {
    if (!map) return;
    map.setTerrain(tilted ? { source: SOURCE_IDS.dem, exaggeration: TERRAIN_EXAGGERATION } : null);
    map.setLayoutProperty(HILLSHADE_LAYER_ID, "visibility", tilted ? "visible" : "none");
    map.easeTo(tilted ? { pitch: TILTED_PITCH } : { pitch: 0, bearing: 0 });
  }, [map, tilted]);

  // 地区を切り替えたら、その地区が入る範囲へ動かす（最初の範囲は地図を作るときに決めている）
  useEffect(() => {
    if (!map || focus === initialFocus.current) return;
    initialFocus.current = focus;
    map.fitBounds(districtBounds(focus), { padding: FIT_PADDING, pitch: map.getPitch(), bearing: map.getBearing() });
  }, [map, focus]);

  if (failed) {
    return (
      <div role="alert" className="flex h-full items-center justify-center bg-kinari-deep p-4 text-center text-sm">
        この端末・ブラウザでは地図を表示できませんでした。「一覧で見る」で施設の名前と住所を確かめられます。
      </div>
    );
  }
  return <div ref={containerRef} className="h-full w-full" aria-label="施設と小学校区の地図" role="region" />;
}
