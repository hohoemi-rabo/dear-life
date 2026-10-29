import type { ReactNode } from "react";
import type { IllustPictureId } from "@/lib/illust/assets";
import { IllustPicture } from "./IllustPicture";

// えらぶの「わが家のプレビュー」の枠（028 見本）。背景の絵（3:2）の上に、家族や地区の札を重ねる。
// 絵の縦横の比で先に場所を取っておき、読み込みで下の部品がずれないようにする
export function PreviewFrame({ background, label, children }: { background: IllustPictureId; label: string; children?: ReactNode }) {
  return (
    <figure role="group" aria-label={label} className="relative isolate aspect-[3/2] overflow-hidden rounded-card bg-pixel-sky shadow-card">
      <IllustPicture picture={background} sizes="(min-width: 640px) 576px, 100vw" decorative priority className="absolute inset-0 size-full object-cover" />
      <span
        aria-hidden="true"
        className="absolute left-2 top-2 z-20 rounded-full border border-line bg-surface/90 px-3 py-1 text-xs font-bold text-ink"
      >
        わが家のプレビュー
      </span>
      {children}
    </figure>
  );
}
