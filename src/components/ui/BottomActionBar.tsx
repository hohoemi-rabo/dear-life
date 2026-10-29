import type { ReactNode } from "react";
import { PixelImage } from "@/components/pixel/PixelImage";

// スマホで画面の下に固定する操作の帯（くらしの「カルテで確かめる」、えらぶの「戻る・次へ」。027 デザインイメージ）。
// 後ろの文が透けて読みにくくならないよう背景は塗りつぶし、両端に草花の飾りを置く。中身は飾りより手前に出す。
// 画面が広いと帯が画面の下に付かない（中身が短い）ので、飾りはスマホだけにする
// decorated={false} は飾りと上の線を外す（えらぶ。028 の見本はボタンだけ）
export function BottomActionBar({
  label,
  decorated = true,
  className = "",
  children,
}: {
  label: string;
  decorated?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <nav
      aria-label={label}
      className={`sticky bottom-0 -mx-4 flex items-center gap-3 bg-kinari px-4 py-3 [&>*:not(img)]:relative ${decorated ? "border-t border-line" : ""} ${className}`}
    >
      {decorated && (
        <>
          <PixelImage asset="deco-grass" scale={1} decorative className="pointer-events-none absolute bottom-0 left-0 sm:hidden" />
          <PixelImage asset="deco-grass" scale={1} decorative className="pointer-events-none absolute bottom-0 right-0 sm:hidden" />
        </>
      )}
      {children}
    </nav>
  );
}
