"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { Button } from "@/components/ui/Button";
import { serviceWorkerUpdate } from "@/lib/pwa/update";

const noop = () => () => undefined;

// 新しい版の画面が届いたときのお知らせ（030）。ドット風の窓（2026-11-06 まさゆきさん決定）。
// 「更新する」は緑の画面の中で目立つようオレンジにする（2026-11-06 まさゆきさん）。説明の文は置かない（同日）。
// 2026-11-18 まさゆきさん：「あとで」はなくし、更新しないと使えないようにした。画面全体を暗くして真ん中に出し、
// 後ろの画面は押せず、キーボードでも移れないようにする（inert）。「更新する」で入れ替えて読み直す（URL の条件はそのまま）。
// お問い合わせのページは、送り終えるまで出さない（ContactForm が hold する）
export function UpdatePrompt() {
  const updates = serviceWorkerUpdate();
  const pending = useSyncExternalStore(
    updates?.subscribe ?? noop,
    () => updates?.pending() ?? false,
    () => false,
  );
  if (!updates || !pending) return null;
  return <UpdateDialog onApply={() => updates.apply()} />;
}

function UpdateDialog({ onApply }: { onApply: () => void }) {
  const overlay = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  // 後ろの画面（このお知らせ以外の body の子）を押せず・読み上げず・キーボードで移れないようにする。消えたら元に戻す
  useEffect(() => {
    const blocked = Array.from(document.body.children).filter(
      (element): element is HTMLElement => element instanceof HTMLElement && !element.contains(overlay.current) && !element.inert,
    );
    for (const element of blocked) element.inert = true;
    button.current?.focus();
    return () => {
      for (const element of blocked) element.inert = false;
    };
  }, []);

  return (
    <div
      ref={overlay}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-5 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] motion-safe:animate-fade-in"
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="update-prompt-title"
        className="pixel-window w-full max-w-md px-4 py-4 motion-safe:animate-pop-in"
      >
        <div className="flex items-center gap-3">
          <PixelIcon icon="icon-refresh" />
          <h2 id="update-prompt-title" className="text-base font-extrabold">
            新しい版があります
          </h2>
        </div>
        <div className="mt-3 flex justify-end">
          <Button ref={button} variant="accent" onClick={onApply}>
            更新する
          </Button>
        </div>
      </section>
    </div>
  );
}
