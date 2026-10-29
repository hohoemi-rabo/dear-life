"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

// 閉じる動き（tailwind の animate-sheet-out）の長さ。終わってから dialog を閉じる
const CLOSE_MS = 200;

// 下から出るシート（028。えらぶの相場、くらしのピンで使う）。ネイティブの <dialog> の showModal で開くので、
// 後ろの画面は押せず、キーボードの移動もシートの中だけになり、閉じるとフォーカスは開いたボタンに戻る。
// 閉じ方は「閉じる」ボタン・後ろの暗いところを押す・Esc の3つ。「動きを減らす」では動かさずに開け閉めする
export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      setClosing(false);
      element.showModal();
    } else if (!open && element.open) {
      element.close();
    }
  }, [open]);

  // 開いているあいだは後ろの画面をスクロールさせない（シートの中だけ動かす）
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [open]);

  const requestClose = () => {
    if (closing) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      onClose();
      return;
    }
    setClosing(true);
    setTimeout(onClose, CLOSE_MS);
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      // Esc はブラウザがすぐ閉じてしまうので止め、閉じる動きを通す
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      // ブラウザが Esc を止めずに閉じたとき（Esc を続けて押したときなど）も、開いている状態をそろえる
      onClose={() => {
        if (open) onClose();
      }}
      // 後ろの暗いところ（::backdrop）を押すと、押した先が dialog そのものになる
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
      className="fixed inset-x-0 bottom-0 top-auto m-0 mx-auto max-h-[85dvh] w-full max-w-xl overflow-visible bg-transparent p-0 text-ink backdrop:bg-black/50 motion-safe:backdrop:animate-fade-in"
    >
      <div
        className={[
          "flex max-h-[85dvh] flex-col gap-4 overflow-y-auto rounded-t-[1.25rem] bg-surface px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 shadow-card",
          closing ? "motion-safe:animate-sheet-out" : "motion-safe:animate-sheet-in",
        ].join(" ")}
      >
        {/* つまみ（シートだと分かる目印）。飾り */}
        <span aria-hidden="true" className="mx-auto h-1.5 w-10 shrink-0 rounded-full bg-line" />
        <h2 id={titleId} className="text-lg font-bold">
          {title}
        </h2>
        {/* 閉じているあいだは中身を作らない（読み上げや検索に、見えない数字を出さない） */}
        {open && children}
        <button
          type="button"
          onClick={requestClose}
          className="mx-auto inline-flex min-h-tap min-w-[10rem] items-center justify-center rounded-full border-2 border-primary px-6 font-bold text-primary transition duration-150 hover:bg-primary-soft active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          閉じる
        </button>
      </div>
    </dialog>
  );
}
