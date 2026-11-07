"use client";

// 平面の Google マップ（032）。施設の点と小学校区の面は、Google の Data レイヤーで重ねる。
// 地図を作るのは1回だけで、表示の切り替え（種類・選んだもの・地区）は props の変化を地図に反映する
import { useEffect, useRef, useState, type RefObject } from "react";
import { boundsCenter, nearestWithin, type LatLng } from "@/lib/map/camera";
import { isSamePoint, visiblePointPositions, type PointProperties, type SchoolDistrictProperties } from "@/lib/map/features";
import { districtBounds, MAX_BOUNDS, MAX_ZOOM, MIN_ZOOM, POINT_STYLES } from "@/lib/map/style";
import type { MapCanvasProps } from "./MapCanvas";

// 平面と立体で引き継ぐ、見ている場所（中心とズーム）
export type SharedCamera = { center: LatLng; zoom: number };

// 指で押しやすいように、タップした所から 22px（44px 四方）以内の点を選ぶ
const TAP_RADIUS = 22;
const FIT_PADDING = 32;
const SELECTED_COLOR = "#2B2A26";

type Props = MapCanvasProps & { mapId: string; visible: boolean; camera: RefObject<SharedCamera | null> };

export function FlatGoogleMap(props: Props) {
  const { mapId, visible, camera, points, schoolDistricts, visibleKinds, showSchoolDistricts, focus, selected, onSelect } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const [layers, setLayers] = useState<{ map: google.maps.Map; points: google.maps.Data; districts: google.maps.Data } | null>(null);
  // クリックの処理は地図を作るときに1回だけ登録するので、最新の値は ref から読む
  const latest = useRef({ onSelect, positions: visiblePointPositions(points, visibleKinds) });
  useEffect(() => {
    latest.current = { onSelect, positions: visiblePointPositions(points, visibleKinds) };
  });
  const initialFocus = useRef(focus);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let active = true;
    const listeners: google.maps.MapsEventListener[] = [];
    let created: google.maps.Map | null = null;
    void (async () => {
      const { Map, Data } = (await google.maps.importLibrary("maps")) as google.maps.MapsLibrary;
      if (!active) return;
      created = new Map(container, {
        mapId,
        center: boundsCenter(districtBounds(initialFocus.current)),
        zoom: 13,
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        restriction: { latLngBounds: MAX_BOUNDS, strictBounds: false },
        // Google の店などの印を押しても、Google の説明の窓を出さない（こちらの点の詳細と混ざらないように）
        clickableIcons: false,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: false,
      });
      created.fitBounds(districtBounds(initialFocus.current), FIT_PADDING);
      const map = created;
      const districtLayer = new Data({ map });
      const pointLayer = new Data({ map });

      // タップした所の近くに点があればその点、なければ押した学区（あれば）を選ぶ
      const selectAt = (latLng: google.maps.LatLng | null, district: SchoolDistrictProperties | null) => {
        if (!latLng) return;
        const near = nearestWithin(latest.current.positions, { lat: latLng.lat(), lng: latLng.lng() }, map.getZoom() ?? MIN_ZOOM, TAP_RADIUS);
        if (near) latest.current.onSelect({ type: "point", point: near.properties });
        else if (district) latest.current.onSelect({ type: "schoolDistrict", schoolName: district.schoolName, district: district.district });
        else latest.current.onSelect(null);
      };
      listeners.push(
        map.addListener("click", (event: google.maps.MapMouseEvent) => selectAt(event.latLng, null)),
        pointLayer.addListener("click", (event: google.maps.Data.MouseEvent) => selectAt(event.latLng, null)),
        districtLayer.addListener("click", (event: google.maps.Data.MouseEvent) =>
          selectAt(event.latLng, schoolDistrictPropertiesOf(event.feature)),
        ),
        map.addListener("idle", () => {
          const center = map.getCenter();
          const zoom = map.getZoom();
          if (center && zoom !== undefined) camera.current = { center: { lat: center.lat(), lng: center.lng() }, zoom };
        }),
      );
      setLayers({ map, points: pointLayer, districts: districtLayer });
    })();
    return () => {
      active = false;
      for (const listener of listeners) listener.remove();
      setLayers(null);
      // Google マップには地図を消す関数がないので、入れ物ごと片付ける（React が要素を外す）
      created?.unbindAll();
    };
    // 地図は1回だけ作る。camera は ref なので変わらない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapId]);

  useEffect(() => {
    if (!layers) return;
    replaceFeatures(layers.points, points);
  }, [layers, points]);

  useEffect(() => {
    if (!layers) return;
    replaceFeatures(layers.districts, schoolDistricts);
  }, [layers, schoolDistricts]);

  useEffect(() => {
    if (!layers) return;
    const selectedPoint = selected?.type === "point" ? selected.point : null;
    layers.points.setStyle((feature) => {
      const properties = pointPropertiesOf(feature);
      const isSelected = selectedPoint !== null && isSamePoint(properties, selectedPoint);
      return {
        visible: visibleKinds.has(properties.kind),
        zIndex: isSelected ? 3 : 2,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: isSelected ? 9 : 6,
          fillColor: POINT_STYLES[properties.kind].color,
          fillOpacity: 1,
          strokeColor: isSelected ? SELECTED_COLOR : "#FFFFFF",
          strokeWeight: isSelected ? 3 : 1.5,
        },
      };
    });
  }, [layers, visibleKinds, selected]);

  useEffect(() => {
    if (!layers) return;
    const selectedSchool = selected?.type === "schoolDistrict" ? selected.schoolName : null;
    layers.districts.setStyle((feature) => {
      const properties = schoolDistrictPropertiesOf(feature);
      if (!properties) return { visible: false };
      return {
        visible: showSchoolDistricts,
        zIndex: 1,
        fillColor: properties.color,
        fillOpacity: 0.18,
        strokeColor: properties.color,
        // 切れ端をつなげられなかった学区は、タイルの境目に線が出ないように輪郭を引かない（features.ts）
        strokeWeight: properties.merged ? (properties.schoolName === selectedSchool ? 4 : 2) : 0,
      };
    });
  }, [layers, showSchoolDistricts, selected]);

  // 地区を切り替えたら、その地区が入る範囲へ動かす（最初の範囲は地図を作るときに決めている）
  useEffect(() => {
    if (!layers || focus === initialFocus.current) return;
    initialFocus.current = focus;
    layers.map.fitBounds(districtBounds(focus), FIT_PADDING);
  }, [layers, focus]);

  // 立体から戻ったら、立体で見ていた場所を平面でも見せる
  useEffect(() => {
    if (!layers || !visible || !camera.current) return;
    layers.map.moveCamera({ center: camera.current.center, zoom: camera.current.zoom });
  }, [layers, visible, camera]);

  // 立体のあいだは隠すだけにする（平面の地図を作り直すと、Google の数え方で読み込みが1回増えるため）
  return <div ref={containerRef} className={`absolute inset-0 ${visible ? "" : "invisible"}`} />;
}

function replaceFeatures(layer: google.maps.Data, collection: object) {
  layer.forEach((feature) => layer.remove(feature));
  layer.addGeoJson(collection);
}

function pointPropertiesOf(feature: google.maps.Data.Feature): PointProperties {
  return {
    kind: feature.getProperty("kind") as PointProperties["kind"],
    district: feature.getProperty("district") as PointProperties["district"],
    index: feature.getProperty("index") as number,
  };
}

function schoolDistrictPropertiesOf(feature: google.maps.Data.Feature): SchoolDistrictProperties | null {
  const schoolName = feature.getProperty("schoolName");
  if (typeof schoolName !== "string") return null;
  return {
    schoolName,
    district: feature.getProperty("district") as SchoolDistrictProperties["district"],
    color: feature.getProperty("color") as string,
    merged: feature.getProperty("merged") === true,
  };
}
