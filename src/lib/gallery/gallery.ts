// 飯田の風景を見る（052）：えらぶ 01 から開く、ドット絵と写真を見比べるギャラリーの決めごと。
// 窓を開いた状態は URL に持つ（スマホの「戻る」で見比べる窓 → 写真一覧 → えらぶへ戻れるように）。画面の部品は src/components/gallery/
import { DISTRICTS } from "../conditions/labels.ts";
import { hasGallery, PHOTO_SPOTS, type GallerySpot } from "../illust/photo-spots.ts";
import type { DistrictId } from "../town-district/resolve.ts";

// パラメータ名。条件（d・a・k・o・h・c・p）と今の質問（q）とぶつけない。変えると共有された URL が読めなくなる
export const GALLERY_PARAMS = {
  // 写真一覧のタブ（all か地区）。あれば窓を開いている
  tab: "g",
  // 見比べている場所の id。あれば見比べる窓
  spot: "gs",
} as const;

export type GalleryTab = "all" | DistrictId;

export const GALLERY_TABS: readonly { id: GalleryTab; label: string }[] = [
  { id: "all", label: "すべて" },
  ...DISTRICTS.map(({ id, name }) => ({ id, label: name })),
];

export type GalleryState = { tab: GalleryTab; spot: GallerySpot | null };

export const GALLERY_SPOTS: readonly GallerySpot[] = PHOTO_SPOTS.filter(hasGallery);

type ReadableParams = { get(name: string): string | null };

// URL から窓の状態を読む。タブがなければ閉じている。知らないタブは「すべて」、知らない場所は一覧にする
export function readGallery(params: ReadableParams): GalleryState | null {
  const tabValue = params.get(GALLERY_PARAMS.tab);
  if (tabValue === null) return null;
  const tab = GALLERY_TABS.find(({ id }) => id === tabValue)?.id ?? "all";
  const spotId = params.get(GALLERY_PARAMS.spot);
  const spot = GALLERY_SPOTS.find(({ id }) => id === spotId) ?? null;
  return { tab, spot };
}

// 今の URL のパラメータ（条件・質問）を残したまま、窓の状態だけを書きかえる。null は閉じる
export function writeGallery(params: URLSearchParams, state: { tab: GalleryTab; spotId?: string | null } | null): URLSearchParams {
  const next = new URLSearchParams(params);
  next.delete(GALLERY_PARAMS.tab);
  next.delete(GALLERY_PARAMS.spot);
  if (state) {
    next.set(GALLERY_PARAMS.tab, state.tab);
    if (state.spotId) next.set(GALLERY_PARAMS.spot, state.spotId);
  }
  return next;
}

// 窓の深さ（0：閉じている、1：写真一覧、2：見比べる）。「戻る」で閉じるときに、何回戻ればよいかを数えるのに使う
export function galleryDepth(state: GalleryState | null): 0 | 1 | 2 {
  if (!state) return 0;
  return state.spot ? 2 : 1;
}

// 写真一覧に出す地区のまとまり。「すべて」は4地区、地区のタブはその地区だけ。写真のない地区は spots が空（画面は「準備中です」）
export function gallerySections(tab: GalleryTab): { district: DistrictId; spots: GallerySpot[] }[] {
  return DISTRICTS.filter(({ id }) => tab === "all" || tab === id).map(({ id }) => ({
    district: id,
    spots: GALLERY_SPOTS.filter((spot) => spot.district === id),
  }));
}

// 「前の場所／次の場所」は、選んでいるタブの中で順に回る（「すべて」なら全地区を通す。端まで行ったら反対の端へ）。
// 場所がそのタブにないとき（URL を手で書いたときなど）は「すべて」で回る
export function neighbourSpots(tab: GalleryTab, spot: GallerySpot): { previous: GallerySpot; next: GallerySpot } {
  const inTab = gallerySections(tab).flatMap(({ spots }) => spots);
  const ring = inTab.some(({ id }) => id === spot.id) ? inTab : gallerySections("all").flatMap(({ spots }) => spots);
  const index = ring.findIndex(({ id }) => id === spot.id);
  return {
    previous: ring[(index - 1 + ring.length) % ring.length],
    next: ring[(index + 1) % ring.length],
  };
}
