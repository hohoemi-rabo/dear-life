// 1つの季節の場面に出すもの（絵・文章・行事）をまとめて作る。絵と行事は、文章のひな形がまだ公開されていない季節でも出す
import type { Conditions } from "../conditions/model.ts";
import { planScene, type ScenePlan, type Season } from "../conditions/scene.ts";
import type { DistrictData, DistrictEvent, ScreenData } from "../data/screen-data.ts";
import type { SceneLayer } from "../pixel/scenes.ts";
import { renderScene, selectSceneEvents, type Scene } from "../scenes/render.ts";
import type { DistrictId } from "../town-district/resolve.ts";
import { scenePictureLayers } from "./picture.ts";

export type SeasonView = {
  plan: ScenePlan;
  district: DistrictData;
  events: readonly DistrictEvent[];
  layers: readonly SceneLayer[];
  // 公開済みのひな形がない季節は null（「この季節の場面の文章は準備中です」）
  scene: Scene | null;
};

export function seasonView(
  season: Season,
  conditions: Conditions & { district: DistrictId },
  data: ScreenData,
): SeasonView {
  const plan = planScene(season, conditions);
  const district = data.districts[conditions.district];
  const events = selectSceneEvents(district, plan);
  return {
    plan,
    district,
    events,
    layers: scenePictureLayers({ plan, conditions, district, events }),
    scene: renderScene(season, conditions, data),
  };
}
