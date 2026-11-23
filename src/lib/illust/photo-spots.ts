// えらぶ 01 の飯田市全体の絵（erabu-iida-overview）で押せる場所と、そこで流す「絵が本物の写真に変わる動画」（050）。
// 動画はまさゆきさんが Google Flow（Omni）で、最初の1枚＝その場所のドット絵・最後の1枚＝まさゆきさんが撮った写真を渡して作った。
// 場所の名前は画面に出さない（2026-11-23 まさゆきさん）。位置は絵の幅・高さに対する割合（％）
import type { DistrictId } from "../town-district/resolve.ts";

export type PhotoSpot = {
  id: string;
  district: DistrictId;
  x: number;
  y: number;
  // 動画（1280×720・8秒）と、最初の1枚（Flow に渡したドット絵。動画が始まるまで出す）
  video: string;
  poster: string;
};

export const PHOTO_SPOTS: readonly PhotoSpot[] = [
  // 上郷の神社の石段のふもとの鳥居（まさゆきさんが s1.png に赤い〇を付けた場所。試しの1か所目）
  { id: "kamisato-ishidan", district: "kamisato", x: 68.7, y: 72.3, video: "/video/kamisato-ishidan.mp4", poster: "/video/kamisato-ishidan-poster.webp" },
];

// 窓の動きの長さ。ふわっと出てから動画を流し、終わったらひと呼吸おいて閉じる（2026-11-23 まさゆきさん）
export const PHOTO_SPOT_TIMING = {
  // ドット絵がふわっと出る長さ（tailwind の animate-photo-spot-in とそろえる）と、出てから動画を始めるまで
  introMs: 900,
  // 動画が終わってから閉じ始めるまで（写真をひと目見られるように）
  holdMs: 1800,
  // 閉じる動き（tailwind の animate-photo-spot-out とそろえる）
  closeMs: 300,
} as const;
