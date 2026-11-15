// マスコット（042）を、くらしの絵のどこに置くか。位置は絵に対する割合（％）で、x は足元の真ん中、y は足元。
// height は絵の高さに対するマスコットの高さ（％）。「気づくか気づかないか」くらいの小ささにする（2026-11-15 まさゆきさん）。
// 地区ごとのしぐさは、その地区の目印の場所に置く。動きが届いた地区だけを入れる（ない地区には出さない）
import type { KurashiPictureId } from "../illust/assets.ts";
import type { MascotMotionId } from "./assets.ts";

export type MascotSpot = { x: number; y: number; height: number };
export type MascotPlacement = { motion: MascotMotionId; wide: MascotSpot; tall: MascotSpot };

// 上郷：右上の長い石段の中ほど（2026-11-15 まさゆきさん OK）。
// 石段の上の神社には行事（黒田人形）のピン、下の公民館には歩こう会のピンが立つので、そのあいだに置く。
// 4季節とも同じ構図なので場所は同じで、服装（動きの絵）だけを季節で替える
const KAMISATO_WIDE: MascotSpot = { x: 84.5, y: 50, height: 6.5 };
const KAMISATO_TALL: MascotSpot = { x: 78.5, y: 48, height: 6 };

export const MASCOT_PLACEMENTS: Partial<Record<KurashiPictureId, MascotPlacement>> = {
  "kurashi-kamisato-spring-wide": { motion: "kamisato-sweep-spring", wide: KAMISATO_WIDE, tall: KAMISATO_TALL },
  "kurashi-kamisato-summer-wide": { motion: "kamisato-sweep-summer", wide: KAMISATO_WIDE, tall: KAMISATO_TALL },
  "kurashi-kamisato-autumn-wide": { motion: "kamisato-sweep-autumn", wide: KAMISATO_WIDE, tall: KAMISATO_TALL },
  "kurashi-kamisato-winter-wide": { motion: "kamisato-sweep-winter", wide: KAMISATO_WIDE, tall: KAMISATO_TALL },
};

// くらしの絵の組（PC の横長・スマホの縦長）からマスコットの置き方を選ぶ。どちらの絵も同じ地区・季節なので、横長の絵で引く
export function mascotPlacement(wide: KurashiPictureId): MascotPlacement | null {
  return MASCOT_PLACEMENTS[wide] ?? null;
}
