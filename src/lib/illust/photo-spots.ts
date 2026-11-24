// えらぶ 01 の飯田市全体の絵（erabu-iida-overview）で押せる場所と、そこで流す「絵が本物の写真に変わる動画」（050）。
// 動画はまさゆきさんが Google Flow（Omni）で、最初の1枚＝その場所のドット絵・最後の1枚＝まさゆきさんが撮った写真を渡して作った。
// 動画のない場所は、押すと「準備中です」の吹き出しを出す（2026-11-23 まさゆきさん）。
// 場所はまさゆきさんが s1.png に付けた〇（赤＝動画、紫＝準備中）の真ん中を測った。位置は絵の幅・高さに対する割合（％）。
// 動画のある場所は、ギャラリー（052）でドット絵と写真を見比べられる。場所の名前はギャラリーと「〈場所〉をじっくり見る」に出す（2026-11-24 まさゆきさん）
import type { DistrictId } from "../town-district/resolve.ts";

export type PhotoSpot = {
  id: string;
  district: DistrictId;
  // 場所の名前。目印の読み上げと、ギャラリーのカード・見出しに使う（052）。準備中の場所は画面に出さないので、ふつうの言い方のまま
  place: string;
  x: number;
  y: number;
  // 動画（1280×720・8秒）と、最初の1枚（Flow に渡したドット絵。動画が始まるまで出す）。null は準備中
  media: PhotoSpotMedia | null;
  // ギャラリーで見比べるドット絵と写真の元の画像（assets/illust/gallery/ のファイル名。052）。null はギャラリーに出さない
  gallery: GallerySources | null;
};

export type PhotoSpotMedia = { video: string; poster: string };

// Flow に渡した 16:9 の2枚。npm run illust が同じ大きさ（GALLERY_SIZE）にそろえて WebP にする
export type GallerySources = { pixel: string; photo: string };

export type PlayablePhotoSpot = PhotoSpot & { media: PhotoSpotMedia };
export type GallerySpot = PhotoSpot & { gallery: GallerySources };

export function isPlayable(spot: PhotoSpot): spot is PlayablePhotoSpot {
  return spot.media !== null;
}

export function hasGallery(spot: PhotoSpot): spot is GallerySpot {
  return spot.gallery !== null;
}

const media = (id: string): PhotoSpotMedia => ({ video: `/video/${id}.mp4`, poster: `/video/${id}-poster.webp` });
const gallery = (id: string, photoExtension: "jpg" | "png"): GallerySources => ({
  pixel: `${id}-pixel.png`,
  photo: `${id}-photo.${photoExtension}`,
});

export const PHOTO_SPOTS: readonly PhotoSpot[] = [
  // 上郷の飯沼神社の石段のふもとの鳥居（試しの1か所目）。絵はまさゆきさんの石段のドット絵、写真はまさゆきさんが撮った石段
  { id: "kamisato-ishidan", district: "kamisato", place: "飯沼神社", x: 68.7, y: 72.3, media: media("kamisato-ishidan"), gallery: gallery("kamisato-ishidan", "jpg") },
  // 上郷のリニアの高架。絵は free-materials.com のフリー素材の写真をもとにしたリニアのドット絵、写真はまさゆきさんが撮った駅の工事現場。
  // 絵と写真は別の景色で重ならないが、ほかの場所と同じく見比べる（2026-11-24 まさゆきさん）
  { id: "kamisato-linear", district: "kamisato", place: "リニアの高架", x: 71.8, y: 85.0, media: media("kamisato-linear"), gallery: gallery("kamisato-linear", "jpg") },
  // 中心市街地の飯田駅・大宮神社・ロータリー（絵はまさゆきさんのドット絵、写真はまさゆきさんが撮った駅舎・神社の門・ロータリー）
  { id: "chushin-station", district: "chushin", place: "飯田駅", x: 57.8, y: 32.2, media: media("chushin-station"), gallery: gallery("chushin-station", "png") },
  { id: "chushin-shrine", district: "chushin", place: "大宮神社", x: 70.1, y: 33.2, media: media("chushin-shrine"), gallery: gallery("chushin-shrine", "png") },
  { id: "chushin-roundabout", district: "chushin", place: "ロータリー", x: 63.9, y: 42.7, media: media("chushin-roundabout"), gallery: gallery("chushin-roundabout", "jpg") },
  // 鼎の通り沿いの店のあたり（準備中）
  { id: "kanae-street", district: "kanae", place: "通り沿いの店", x: 26.8, y: 61.3, media: null, gallery: null },
  // 伊賀良の飯田IC の料金所とバス乗り場のあたり（準備中）
  { id: "igara-ic", district: "igara", place: "インターとバス乗り場", x: 13.2, y: 57.7, media: null, gallery: null },
];

// ギャラリーの画像（052）。public/illust/gallery/ に、ドット絵と写真を同じ大きさ（16:9）の WebP で置く。
// 画像はデータベースに入れず、サイトのファイルとして出す（2026-11-24 まさゆきさん）
export const GALLERY_DIR = "illust/gallery";
export const GALLERY_SIZE = { width: 1440, height: 810 } as const;
// 書き出す横幅。480 は一覧のカード、960・1440 は見比べる窓（スマホは真ん中を縦長に切り出すので、画面幅より広い版を使う）
export const GALLERY_WIDTHS = [480, 960, 1440] as const;
// 写真を撮った人と月（5枚とも。2026-11-24 まさゆきさん）。生成AIで描いたことは書かない
export const GALLERY_PHOTO_CREDIT = "写真：開発者が撮影（2026年11月）";

export type GalleryImageKind = keyof GallerySources;

export function galleryImageSrc(spotId: string, kind: GalleryImageKind, width: number): string {
  return `/${GALLERY_DIR}/${spotId}-${kind}-${width}.webp`;
}

export function galleryImageSrcSet(spotId: string, kind: GalleryImageKind): string {
  return GALLERY_WIDTHS.map((width) => `${galleryImageSrc(spotId, kind, width)} ${width}w`).join(", ");
}

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
