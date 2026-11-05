// 1つの季節の場面に出すもの（絵・文章・行事）をまとめて作る。絵と行事は、文章のひな形がまだ公開されていない季節でも出す
import type { Conditions } from "../conditions/model.ts";
import { planScene, type ScenePlan, type Season } from "../conditions/scene.ts";
import type { DistrictData, DistrictEvent, ScreenData } from "../data/screen-data.ts";
import { renderScene, selectSceneEvents, type Scene } from "../scenes/render.ts";
import type { DistrictId } from "../town-district/resolve.ts";

export type SeasonView = {
  plan: ScenePlan;
  district: DistrictData;
  events: readonly DistrictEvent[];
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
  // ピンとシートには、その季節の公開中の行事を全部出す（2026-11-05 伊賀良の夏3件・秋4件にそれぞれ絵と場所があるため）。場面の文に差し込むのは renderScene の中で最大2つのまま
  const events = selectSceneEvents(district, plan, Number.POSITIVE_INFINITY);
  return {
    plan,
    district,
    events,
    scene: renderScene(season, conditions, data),
  };
}
