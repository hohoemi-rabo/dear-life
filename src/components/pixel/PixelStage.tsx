import type { ReactNode } from "react";

// ドット絵を空の色の上に置き、下に地面を敷く台（027 デザインイメージ。えらぶの選択肢・カルテのカード）。
// 絵の下の端が台の端に付くと切れて見えるので、地面の帯の上に立たせる。大きさは className で決める
export function PixelStage({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`flex flex-col items-center justify-end bg-pixel-sky pt-2 ${className}`}>
      {children}
      <span aria-hidden="true" className="h-2 w-full shrink-0 bg-pixel-grass" />
    </span>
  );
}
