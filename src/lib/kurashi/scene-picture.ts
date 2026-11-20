// くらしの風景の絵の出し方（<picture>）と先読みで共通に使う値。どれか1つでも違うと、同じ絵の別の版を2回読む。
// 画面の部品（IllustratedScene）と、HTML に埋めこむ先読み（ScenePicturePreloadScript）の両方から読むので、
// "use client" の部品の中ではなく、ここに置く（025）
import { ILLUST_PICTURES, illustPictureSrc, kurashiPicturesFor, type KurashiPictureId, type KurashiPictures } from "../illust/assets.ts";
import { DISTRICTS } from "../conditions/labels.ts";
import { SEASONS } from "../conditions/scene.ts";
import { CONDITION_PARAMS } from "../conditions/url.ts";
import { SEASON_PARAM, SEASON_SLUGS } from "./season.ts";

// 横長（PC）に切りかえる幅と、絵の表示幅
export const WIDE_MEDIA = "(min-width: 1024px)";
export const TALL_MEDIA = "(max-width: 1023.98px)";
export const WIDE_SIZES = "(min-width: 1400px) 1150px, 80vw";
export const TALL_SIZES = "100vw";

export function scenePictureSrcSet(id: KurashiPictureId): string {
  return ILLUST_PICTURES[id].widths.map((w) => `${illustPictureSrc(id, w)} ${w}w`).join(", ");
}

export function largestSrc(id: KurashiPictureId): string {
  return illustPictureSrc(id, ILLUST_PICTURES[id].widths.at(-1)!);
}

type PreloadSpec = { href: string; srcSet: string; sizes: string; media: string };

// 縦長（スマホ）と横長（PC）の先読みの指定。media で、その端末で出す片方だけが読まれる
export function scenePicturePreloads(pictures: KurashiPictures): readonly PreloadSpec[] {
  return [
    { href: largestSrc(pictures.tall), srcSet: scenePictureSrcSet(pictures.tall), sizes: TALL_SIZES, media: TALL_MEDIA },
    { href: largestSrc(pictures.wide), srcSet: scenePictureSrcSet(pictures.wide), sizes: WIDE_SIZES, media: WIDE_MEDIA },
  ];
}

// HTML が届いてすぐ（画面のプログラムが動く前）に、URL の地区と季節から風景の絵を読み始めるスクリプト。
// 遅い回線では、プログラムを待つと絵の読み込みが約3秒遅れ、フォントと回線を取り合っていた（2026-11-20 に 1.6Mbps で測った。025）。
// 地区がない・知らない値なら何もしない（画面は「地区を選んでください」になる）。季節の値がない・知らない値なら春（parseSeason と同じ）。
// 先読みは速くするためだけのものなので、古いブラウザで失敗しても止めない（画面のプログラムが同じ絵を preload で読み直す）
export function scenePicturePreloadScript(): string {
  const table: Record<string, readonly PreloadSpec[]> = {};
  for (const { id } of DISTRICTS) {
    for (const season of SEASONS) table[`${id}:${SEASON_SLUGS[season]}`] = scenePicturePreloads(kurashiPicturesFor(id, season));
  }
  const params = { district: CONDITION_PARAMS.district, season: SEASON_PARAM, fallbackSeason: SEASON_SLUGS["春"] };
  return `(function(t,p){try{var q=new URLSearchParams(location.search),d=q.get(p.district),s=q.get(p.season),e=t[d+":"+s]||t[d+":"+p.fallbackSeason];if(!e)return;e.forEach(function(x){var l=document.createElement("link");l.rel="preload";l.setAttribute("as","image");l.href=x.href;l.setAttribute("imagesrcset",x.srcSet);l.setAttribute("imagesizes",x.sizes);l.media=x.media;l.setAttribute("fetchpriority","high");document.head.appendChild(l)})}catch(_){}})(${JSON.stringify(table)},${JSON.stringify(params)})`;
}
