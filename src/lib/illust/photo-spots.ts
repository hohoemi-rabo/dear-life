// えらぶ 01 の飯田市全体の絵（erabu-iida-overview）で押せる場所と、そこで流す「絵が本物の写真に変わる動画」（050）。
// 動画はまさゆきさんが Google Flow（Omni）で、最初の1枚＝その場所のドット絵・最後の1枚＝まさゆきさんが撮った写真を渡して作った。
// 動画のない場所は、押すと「準備中です」の吹き出しを出す（2026-11-23 まさゆきさん）。
// 場所はまさゆきさんが s1.png に付けた〇（赤＝動画、紫＝準備中）の真ん中を測った。名前は画面に出さない。位置は絵の幅・高さに対する割合（％）
import type { DistrictId } from "../town-district/resolve.ts";

export type PhotoSpot = {
  id: string;
  district: DistrictId;
  // 読み上げで場所を区別するための短い言い方（画面には出さない。固有の名前は使わない）
  place: string;
  x: number;
  y: number;
  // 動画（1280×720・8秒）と、最初の1枚（Flow に渡したドット絵。動画が始まるまで出す）。null は準備中
  media: PhotoSpotMedia | null;
};

export type PhotoSpotMedia = { video: string; poster: string };

export type PlayablePhotoSpot = PhotoSpot & { media: PhotoSpotMedia };

export function isPlayable(spot: PhotoSpot): spot is PlayablePhotoSpot {
  return spot.media !== null;
}

const media = (id: string): PhotoSpotMedia => ({ video: `/video/${id}.mp4`, poster: `/video/${id}-poster.webp` });

export const PHOTO_SPOTS: readonly PhotoSpot[] = [
  // 上郷の神社の石段のふもとの鳥居（試しの1か所目）。絵はまさゆきさんの石段のドット絵、写真はまさゆきさんが撮った石段
  { id: "kamisato-ishidan", district: "kamisato", place: "神社の石段", x: 68.7, y: 72.3, media: media("kamisato-ishidan") },
  // 上郷のリニアの高架。絵は free-materials.com のフリー素材の写真をもとにしたリニアのドット絵、写真はまさゆきさんが撮った駅の工事現場
  { id: "kamisato-linear", district: "kamisato", place: "リニアの高架", x: 71.8, y: 85.0, media: media("kamisato-linear") },
  // 中心市街地の駅・右の神社・ロータリー（絵はまさゆきさんのドット絵、写真はまさゆきさんが撮った駅舎・神社の門・ロータリー）
  { id: "chushin-station", district: "chushin", place: "駅", x: 57.8, y: 32.2, media: media("chushin-station") },
  { id: "chushin-shrine", district: "chushin", place: "神社", x: 70.1, y: 33.2, media: media("chushin-shrine") },
  { id: "chushin-roundabout", district: "chushin", place: "ロータリー", x: 63.9, y: 42.7, media: media("chushin-roundabout") },
  // 鼎の通り沿いの店のあたり（準備中）
  { id: "kanae-street", district: "kanae", place: "通り沿いの店", x: 26.8, y: 61.3, media: null },
  // 伊賀良の飯田IC の料金所とバス乗り場のあたり（準備中）
  { id: "igara-ic", district: "igara", place: "インターとバス乗り場", x: 13.2, y: 57.7, media: null },
];

// 窓の動きの長さ。ふわっと出てから動画を流し、終わったらひと呼吸おいて閉じる（2026-11-23 まさゆきさん）
export const PHOTO_SPOT_TIMING = {
  // ドット絵がふわっと出る長さ（tailwind の animate-photo-spot-in とそろえる）と、出てから動画を始めるまで
  introMs: 900,
  // 動画が終わってから閉じ始めるまで（写真をひと目見られるように）
  holdMs: 1800,
  // 閉じる動き（tailwind の animate-photo-spot-out とそろえる）
  closeMs: 300,
  // 準備中の吹き出しを出しておく長さ（消える動きを含む）
  preparingMs: 2000,
} as const;
