"use client";

import { useSyncExternalStore } from "react";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { Button } from "@/components/ui/Button";
import { serviceWorkerUpdate } from "@/lib/pwa/update";

const noop = () => () => undefined;

// 新しい版の画面が届いたときのお知らせ（030）。ドット風の窓で画面の上に出す（2026-11-06 まさゆきさん決定）。
// 下には、くらし・えらぶの固定の帯とスマホのメニューがあるので、重ならないよう上に置く。
// 「更新する」は緑の画面の中で目立つようオレンジにする（2026-11-06 まさゆきさん）。説明の文は置かない（同日）。
// 「更新する」で入れ替えて読み直す（URL の条件はそのまま）。「あとで」なら今までどおり、次に開いたときに入れ替わる
export function UpdatePrompt() {
  const updates = serviceWorkerUpdate();
  const pending = useSyncExternalStore(
    updates?.subscribe ?? noop,
    () => updates?.pending() ?? false,
    () => false,
  );
  if (!updates || !pending) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(1rem+env(safe-area-inset-top))] z-50 flex justify-center px-5">
      <section
        aria-labelledby="update-prompt-title"
        className="pixel-window pointer-events-auto w-full max-w-md px-4 py-4 motion-safe:animate-pop-in"
      >
        <div className="flex items-center gap-3">
          <PixelIcon icon="icon-refresh" />
          <div role="status">
            <h2 id="update-prompt-title" className="text-base font-extrabold">
              新しい版があります
            </h2>
          </div>
        </div>
        <div className="mt-3 flex justify-end gap-3">
          <Button variant="quiet" onClick={() => updates.dismiss()}>
            あとで
          </Button>
          <Button variant="accent" onClick={() => updates.apply()}>更新する</Button>
        </div>
      </section>
    </div>
  );
}
