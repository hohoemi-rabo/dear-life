// 場面のドット絵の組み方（要件 6.2）。季節の背景＋地区の目印＋行事・施設・乗り物＋家族を、決まった置き場所に重ねる。
// 同じ条件・同じデータなら必ず同じ絵になる（ランダムにしない）。絵は「想定の風景」なので、
// 行事の絵はその季節の行事があるときだけ重ね、ない行事を絵で作らない（F-13）
import type { ScenePlan } from "../conditions/scene.ts";
import type { Conditions } from "../conditions/model.ts";
import type { DistrictData, DistrictEvent } from "../data/screen-data.ts";
import { EVENT_ART_ASSET, familyArtFor, landmarkAssetId, type PixelAssetId } from "../pixel/assets.ts";
import { placeInSlot, type SceneLayer, type SceneSlot } from "../pixel/scenes.ts";
import { SEASON_SLUGS } from "./season.ts";

function eventArt(event: DistrictEvent): PixelAssetId {
  return EVENT_ART_ASSET[event.art];
}

export function scenePictureLayers({
  plan,
  conditions,
  district,
  events,
}: {
  plan: ScenePlan;
  conditions: Pick<Conditions, "adults" | "children" | "parent">;
  district: DistrictData;
  // 場面に出す行事（selectSceneEvents の結果）
  events: readonly DistrictEvent[];
}): SceneLayer[] {
  const season = SEASON_SLUGS[plan.season];
  const [firstEvent, secondEvent] = events;
  // 田畑の左は行事、右は場面の軸の施設・乗り物。秋は行事を2つまで並べる
  let fieldRight: PixelAssetId | null = null;
  let roadRight: PixelAssetId | null = null;
  let overlay: PixelAssetId | null = null;
  switch (plan.axis) {
    case "spring-school":
      fieldRight = "facility-school";
      break;
    case "spring-public-facility":
      fieldRight = "facility-public";
      break;
    case "summer-evacuation":
      fieldRight = "facility-shelter";
      overlay = "overlay-rain";
      break;
    case "autumn-events":
      fieldRight = secondEvent ? eventArt(secondEvent) : null;
      break;
    case "winter-transit":
      // 電車は地区に駅があるとわかっているときだけ（駅のない伊賀良・駅のデータが未取得のときは出さない）
      fieldRight = district.trainStations.status === "available" ? "vehicle-train" : null;
      roadRight = "vehicle-bus";
      break;
    case "winter-car":
      roadRight = "vehicle-car";
      break;
  }

  const parts: [PixelAssetId | null, SceneSlot][] = [
    [`bg-${season}`, "full"],
    [landmarkAssetId(district.id, season), "landmark"],
    [firstEvent ? eventArt(firstEvent) : null, "fieldLeft"],
    [fieldRight, "fieldRight"],
    [familyArtFor(conditions), "family"],
    [roadRight, "roadRight"],
    [overlay, "full"],
  ];
  return parts.flatMap(([asset, slot]) => (asset === null ? [] : [placeInSlot(asset, slot)]));
}
