// マスコット（042）の動きの選び方と、くらしの絵のどこに置くか。
// 動きは地区ごとのしぐさ×季節ごとの服装（動きは同じで服装だけ替える。2026-11-15 まさゆきさん）。動きが届いた地区だけを入れ、ない地区には出さない。
// くらしの絵の上の位置は絵に対する割合（％）で、x は足元の真ん中、y は足元。height は絵の高さに対するマスコットの高さ（％）。
// 「気づくか気づかないか」くらいの小ささにする
import type { Season } from "../conditions/scene.ts";
import type { DistrictId } from "../town-district/resolve.ts";
import type { MascotMotionId } from "./assets.ts";

export type MascotSpot = { x: number; y: number; height: number };
export type MascotPlacement = { motion: MascotMotionId; wide: MascotSpot; tall: MascotSpot };

const MASCOT_MOTIONS: Partial<Record<DistrictId, Readonly<Record<Season, MascotMotionId>>>> = {
  // 上郷：石段をほうきで掃く。春は着物風、夏はエプロン、秋はニット、冬は帽子とマフラー
  kamisato: { 春: "kamisato-sweep-spring", 夏: "kamisato-sweep-summer", 秋: "kamisato-sweep-autumn", 冬: "kamisato-sweep-winter" },
};

// 地区と季節の動き。動きがまだない地区・地区を選んでいないときは null（出さない）
export function mascotMotion(district: DistrictId | null, season: Season): MascotMotionId | null {
  return district === null ? null : (MASCOT_MOTIONS[district]?.[season] ?? null);
}

// くらしの絵の上の位置。上郷は右上の長い石段の中ほど（2026-11-15 まさゆきさん OK）。
// 石段の上の神社には行事（黒田人形）のピン、下の公民館には歩こう会のピンが立つので、そのあいだに置く。4季節とも同じ構図なので場所も同じ
const SCENE_SPOTS: Partial<Record<DistrictId, { wide: MascotSpot; tall: MascotSpot }>> = {
  kamisato: { wide: { x: 84.5, y: 50, height: 6.5 }, tall: { x: 78.5, y: 48, height: 6 } },
};

// くらしの絵（地区・季節）のマスコットの置き方
export function mascotPlacement(district: DistrictId, season: Season): MascotPlacement | null {
  const motion = mascotMotion(district, season);
  const spots = SCENE_SPOTS[district];
  return motion === null || spots === undefined ? null : { motion, ...spots };
}

