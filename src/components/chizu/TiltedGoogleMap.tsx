"use client";

// 立体の Google マップ（032。3D Maps の Map3DElement）。写真から作った建物の立体の上に、施設の印と小学校区の面を重ねる。
// Google の店などの印と名前は出さない（写真だけの SATELLITE。2026-11-07 まさゆきさん「一旦消したのをみたい」）
import { useEffect, useRef, useState, type RefObject } from "react";
import { boundsCenter, rangeForBounds, rangeToZoom, zoomToRange } from "@/lib/map/camera";
import { pointKey, type PointProperties } from "@/lib/map/features";
import { districtBounds, MAX_BOUNDS, MAX_ZOOM, MIN_ZOOM, POINT_STYLES, SCHOOL_DISTRICT_FILL_ALPHA, TILTED_PITCH } from "@/lib/map/style";
import type { SharedCamera } from "./FlatGoogleMap";
import type { MapCanvasProps } from "./MapCanvas";

const SELECTED_COLOR = "#2B2A26";
const FLY_MILLIS = 1200;
// 印を押したときに、地図そのものにも「押された」が届くことがある。そのときは選んだ印を消さない
const CHILD_CLICK_GRACE_MS = 300;

type Props = MapCanvasProps & { camera: RefObject<SharedCamera | null> };

type Libraries = { maps3d: google.maps.Maps3DLibrary; marker: google.maps.MarkerLibrary };
type PlacedMarker = { marker: google.maps.maps3d.Marker3DInteractiveElement; pin: google.maps.marker.PinElement; properties: PointProperties };

export function TiltedGoogleMap(props: Props) {
  const { camera, points, schoolDistricts, visibleKinds, showSchoolDistricts, focus, selected, onSelect } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState<{ map: google.maps.maps3d.Map3DElement; libraries: Libraries } | null>(null);
  const latest = useRef({ onSelect });
  useEffect(() => {
    latest.current = { onSelect };
  });
  const lastChildClick = useRef(0);
  const markers = useRef(new Map<string, PlacedMarker>());
  const initialFocus = useRef(focus);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let active = true;
    let map: google.maps.maps3d.Map3DElement | null = null;
    void (async () => {
      const [maps3d, marker] = await Promise.all([
        google.maps.importLibrary("maps3d") as Promise<google.maps.Maps3DLibrary>,
        google.maps.importLibrary("marker") as Promise<google.maps.MarkerLibrary>,
      ]);
      if (!active) return;
      // 平面で見ていた場所から始める。まだなければ地区の範囲
      const start = camera.current;
      const center = start?.center ?? boundsCenter(districtBounds(initialFocus.current));
      const range = start ? zoomToRange(start.zoom, start.center.lat, container.clientHeight) : rangeForBounds(districtBounds(initialFocus.current));
      map = new maps3d.Map3DElement({
        center: { ...center, altitude: 0 },
        range,
        tilt: TILTED_PITCH,
        heading: 0,
        mode: "SATELLITE",
        bounds: MAX_BOUNDS,
      });
      map.style.width = "100%";
      map.style.height = "100%";
      map.addEventListener("gmp-click", (event) => {
        // 印・学区の面の押下は、それぞれの要素で受け取る（下の setUpMarkers・setUpDistricts）
        if (event.target !== map) return;
        if (performance.now() - lastChildClick.current < CHILD_CLICK_GRACE_MS) return;
        latest.current.onSelect(null);
      });
      container.append(map);
      setReady({ map, libraries: { maps3d, marker } });
    })();
    return () => {
      active = false;
      setReady(null);
      if (map) {
        // 立体で見ていた場所を平面に引き継ぐ
        const center = map.center;
        const height = container.clientHeight || 1;
        if (center && typeof map.range === "number") {
          const lat = center.lat;
          camera.current = { center: { lat, lng: center.lng }, zoom: rangeToZoom(map.range, lat, height, MIN_ZOOM, MAX_ZOOM) };
        }
        map.remove();
      }
      markers.current.clear();
    };
    // 地図は1回だけ作る。camera は ref なので変わらない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 施設の印。表示中の種類だけを置く
  useEffect(() => {
    if (!ready) return;
    const { map, libraries } = ready;
    const placed = new Map<string, PlacedMarker>();
    for (const feature of points.features) {
      const { properties } = feature;
      if (!visibleKinds.has(properties.kind)) continue;
      const [lng, lat] = feature.geometry.coordinates;
      const marker = new libraries.maps3d.Marker3DInteractiveElement({
        position: { lat, lng },
        altitudeMode: "CLAMP_TO_GROUND",
        // 建物の陰になっても印を見せる
        drawsWhenOccluded: true,
        sizePreserved: true,
      });
      const pin = new libraries.marker.PinElement({ ...pinStyle(properties, false) });
      marker.append(pin);
      marker.addEventListener("gmp-click", () => {
        lastChildClick.current = performance.now();
        latest.current.onSelect({ type: "point", point: properties });
      });
      map.append(marker);
      placed.set(pointKey(properties), { marker, pin, properties });
    }
    markers.current = placed;
    return () => {
      for (const { marker } of placed.values()) marker.remove();
    };
  }, [ready, points, visibleKinds]);

  // 選んだ印だけを大きく、縁を濃くする（印を作り直さない）
  useEffect(() => {
    if (!ready) return;
    const selectedKey = selected?.type === "point" ? pointKey(selected.point) : null;
    for (const [key, { pin, properties }] of markers.current) {
      Object.assign(pin, pinStyle(properties, key === selectedKey));
    }
  }, [ready, selected, points, visibleKinds]);

  // 小学校区の面。地面に沿わせて塗る
  useEffect(() => {
    if (!ready || !showSchoolDistricts) return;
    const { map, libraries } = ready;
    const selectedSchool = selected?.type === "schoolDistrict" ? selected.schoolName : null;
    const placed: HTMLElement[] = [];
    for (const feature of schoolDistricts.features) {
      const { properties } = feature;
      for (const [outer, ...holes] of feature.geometry.coordinates) {
        const polygon = new libraries.maps3d.Polygon3DInteractiveElement({
          path: outer.map(([lng, lat]) => ({ lat, lng })),
          // 穴のない面に空の配列を渡すと Google がエラーにするので、穴があるときだけ渡す
          ...(holes.length > 0 ? { innerPaths: holes.map((ring) => ring.map(([lng, lat]) => ({ lat, lng }))) } : {}),
          altitudeMode: "CLAMP_TO_GROUND",
          fillColor: `${properties.color}${SCHOOL_DISTRICT_FILL_ALPHA}`,
          strokeColor: properties.color,
          // 切れ端をつなげられなかった学区は、タイルの境目に線が出ないように輪郭を引かない（features.ts）
          strokeWidth: properties.merged ? (properties.schoolName === selectedSchool ? 4 : 2) : 0,
          drawsOccludedSegments: true,
        });
        polygon.addEventListener("gmp-click", () => {
          // 印の押下が先に届いていたら、印を選んだままにする
          if (performance.now() - lastChildClick.current < CHILD_CLICK_GRACE_MS) return;
          lastChildClick.current = performance.now();
          latest.current.onSelect({ type: "schoolDistrict", schoolName: properties.schoolName, district: properties.district });
        });
        map.append(polygon);
        placed.push(polygon);
      }
    }
    return () => {
      for (const polygon of placed) polygon.remove();
    };
  }, [ready, schoolDistricts, showSchoolDistricts, selected]);

  // 地区を切り替えたら、その地区が見える所へ飛ぶ
  useEffect(() => {
    if (!ready || focus === initialFocus.current) return;
    initialFocus.current = focus;
    const bounds = districtBounds(focus);
    ready.map.flyCameraTo({
      endCamera: { center: { ...boundsCenter(bounds), altitude: 0 }, range: rangeForBounds(bounds), tilt: TILTED_PITCH, heading: ready.map.heading ?? 0 },
      durationMillis: FLY_MILLIS,
    });
  }, [ready, focus]);

  return <div ref={containerRef} className="absolute inset-0" />;
}

function pinStyle(properties: PointProperties, isSelected: boolean): google.maps.marker.PinElementOptions {
  const color = POINT_STYLES[properties.kind].color;
  return {
    background: color,
    borderColor: isSelected ? SELECTED_COLOR : "#FFFFFF",
    glyphColor: "#FFFFFF",
    scale: isSelected ? 1.1 : 0.75,
  };
}
