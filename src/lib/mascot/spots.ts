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
  // 鼎：公園で縄跳び（2026-11-15 まさゆきさん。はじめの案のぶらんこ・すべり台から変えた）
  kanae: { 春: "kanae-jumprope-spring", 夏: "kanae-jumprope-summer", 秋: "kanae-jumprope-autumn", 冬: "kanae-jumprope-winter" },
  // 伊賀良：コップのジュースをストローで飲む（2026-11-17 まさゆきさん。はじめの案の画架から変えた）
  igara: { 春: "igara-drink-spring", 夏: "igara-drink-summer", 秋: "igara-drink-autumn", 冬: "igara-drink-winter" },
  // 中心市街地：くるっと回って踊る（2026-11-17 まさゆきさん。はじめの案のりんごを見上げる・拾うから変わった）
  chushin: { 春: "chushin-spin-spring", 夏: "chushin-spin-summer", 秋: "chushin-spin-autumn", 冬: "chushin-spin-winter" },
};

// 地区と季節の動き。動きがまだない地区・地区を選んでいないときは null（出さない）
export function mascotMotion(district: DistrictId | null, season: Season): MascotMotionId | null {
  return district === null ? null : (MASCOT_MOTIONS[district]?.[season] ?? null);
}

// くらしの絵の上の位置。4季節とも同じ構図なので場所も同じ
const SCENE_SPOTS: Partial<Record<DistrictId, { wide: MascotSpot; tall: MascotSpot }>> = {
  // 上郷は左の校庭の、左のゴールの右（2026-11-17 まさゆきさんが s1.png（PC・秋）に赤い丸で指定。
  // はじめは右上の長い石段の中ほどに置いていた）
  kamisato: { wide: { x: 20.6, y: 63, height: 6.5 }, tall: { x: 18, y: 60.5, height: 6 } },
  // 鼎は左の公園の、あずまや（テーブル）の手前の地面（2026-11-15 まさゆきさんが s1.png に丸を描いて指定。はじめのぶらんこの手前から移した）。
  // 縄跳びの絵は頭の上の縄まで入るので、体が上郷と同じくらいに見えるよう少し高くする。
  // 4季節とも同じ構図なので場所も同じ。近くのピン（学校・夏のペタンク・秋の駅伝）はもっと上を指す
  kanae: { wide: { x: 11.6, y: 64, height: 7.5 }, tall: { x: 10.5, y: 60.5, height: 7 } },
  // 伊賀良は高速バスと路線バスのあいだの乗り場の床（2026-11-17 まさゆきさんが s1.png に丸を描いて指定）。
  // 同日「もう少し手前に」で、床の手前のふち（道路の手前まで）に下げた。
  // 2026-11-20 まさゆきさん：スマホで男性一人のとき、頭にぽてりがあたっていたので、スマホだけ少し上げた
  igara: { wide: { x: 50.5, y: 75.5, height: 6.5 }, tall: { x: 49, y: 78.5, height: 6 } },
  // 中心市街地は、店の並びから公園へ向かう並木の道（2026-11-17 まさゆきさんが s1.png に丸を描いて指定）。
  // スマホははじめ { x: 67, y: 65 } で道の左のビルの店先に立っていた。同じ高さで道の上（x 72）にすると冬の「もちつき」のピンの名前に隠れるので、
  // 同日まさゆきさんの OK で、同じ道を手前に下りた横断歩道の近くにした（4季節・車あり／なし・子ども5人でもピンや家族と重ならない）
  chushin: { wide: { x: 70.4, y: 64.5, height: 6.5 }, tall: { x: 62.5, y: 71.5, height: 6 } },
};

// くらしの絵（地区・季節）のマスコットの置き方
export function mascotPlacement(district: DistrictId, season: Season): MascotPlacement | null {
  const motion = mascotMotion(district, season);
  const spots = SCENE_SPOTS[district];
  return motion === null || spots === undefined ? null : { motion, ...spots };
}

