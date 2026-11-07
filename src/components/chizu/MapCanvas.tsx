"use client";

// 地図（021・032）。Google マップを、地図の画面を開いたときだけ読み込む（LazyMapCanvas から）。
// 平面の地図はいつも置いておき、「立体で見る」のあいだだけ立体の地図を上に重ねる。
// 立体は重いので、平面に戻したら立体の地図は消す（もう一度開くと、Google の数え方では立体の読み込みが1回増える）
import { useEffect, useRef, useState } from "react";
import type { FeatureCollection, MapSelection, MultiPolygonGeometry, PointGeometry, PointProperties, SchoolDistrictProperties } from "@/lib/map/features";
import { googleMapsConfig, loadGoogleMaps, onGoogleMapsAuthFailure } from "@/lib/map/google-maps-loader";
import type { MapPointKind } from "@/lib/map/map-data";
import type { DistrictId } from "@/lib/town-district/resolve";
import { Skeleton } from "@/components/ui/Skeleton";
import { FlatGoogleMap, type SharedCamera } from "./FlatGoogleMap";
import { TiltedGoogleMap } from "./TiltedGoogleMap";

export type MapCanvasProps = {
  points: FeatureCollection<PointGeometry, PointProperties>;
  schoolDistricts: FeatureCollection<MultiPolygonGeometry, SchoolDistrictProperties>;
  visibleKinds: ReadonlySet<MapPointKind>;
  showSchoolDistricts: boolean;
  tilted: boolean;
  focus: DistrictId | null;
  selected: MapSelection | null;
  onSelect: (selection: MapSelection | null) => void;
};

type Status = "loading" | "ready" | "failed";

export default function MapCanvas(props: MapCanvasProps) {
  const config = googleMapsConfig();
  const apiKey = config?.apiKey ?? null;
  const [status, setStatus] = useState<Status>(apiKey ? "loading" : "failed");
  // 平面と立体で、見ている場所と広さを引き継ぐ
  const camera = useRef<SharedCamera | null>(null);

  useEffect(() => {
    if (!apiKey) {
      console.error("Google マップのキーか Map ID が設定されていません（.env.example）");
      return;
    }
    let active = true;
    loadGoogleMaps(apiKey).then(
      () => active && setStatus("ready"),
      (error: unknown) => {
        console.error(error);
        if (active) setStatus("failed");
      },
    );
    const stopListening = onGoogleMapsAuthFailure(() => active && setStatus("failed"));
    return () => {
      active = false;
      stopListening();
    };
  }, [apiKey]);

  if (status === "failed" || !config) {
    return (
      <div role="alert" className="flex h-full items-center justify-center bg-kinari-deep p-4 text-center text-sm">
        地図を表示できませんでした。「一覧で見る」で施設の名前と住所を確かめられます。
      </div>
    );
  }
  if (status === "loading") {
    return (
      <div role="status" className="h-full w-full">
        <span className="sr-only">地図を読み込んでいます</span>
        <Skeleton className="h-full w-full rounded-none" />
      </div>
    );
  }
  return (
    <div className="relative h-full w-full" aria-label="施設と小学校区の地図" role="region">
      <FlatGoogleMap {...props} mapId={config.mapId} visible={!props.tilted} camera={camera} />
      {props.tilted && <TiltedGoogleMap {...props} camera={camera} />}
    </div>
  );
}
