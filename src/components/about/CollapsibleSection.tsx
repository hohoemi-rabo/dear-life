"use client";

import { useEffect, useRef, type ReactNode } from "react";

// データについての、押すと開く欄（2026-11-19 まさゆきさん：相場の計算のしかた・出典・手でまとめた情報は、押したら出す）。最初は閉じる。
// ほかの画面から #id 付きで来たとき（地区くらべの「くわしい計算のしかた」→ #about-market など）は、その欄を開いてそこまで動かす
export function CollapsibleSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const details = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const openIfTargeted = () => {
      if (window.location.hash.slice(1) !== id || !details.current) return;
      details.current.open = true;
      details.current.scrollIntoView?.({ block: "start" });
    };
    openIfTargeted();
    window.addEventListener("hashchange", openIfTargeted);
    return () => window.removeEventListener("hashchange", openIfTargeted);
  }, [id]);

  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-4 rounded-card border border-line bg-surface shadow-card">
      <details ref={details} className="group">
        <summary className="flex min-h-tap cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <h2 id={`${id}-title`} className="text-lg font-bold">
            {title}
          </h2>
          <span aria-hidden="true" className="text-ink-muted transition-transform group-open:rotate-90">
            ›
          </span>
        </summary>
        <div className="flex flex-col gap-3 border-t border-line px-4 py-3">{children}</div>
      </details>
    </section>
  );
}
