import type { ReactNode } from "react";

// 注意書き。文言は @/lib/notices の NOTICES を使い、画面ごとに書き分けない
export function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="flex gap-2 text-sm text-ink-muted">
      <svg aria-hidden="true" viewBox="0 0 16 16" className="mt-0.5 size-4 shrink-0 fill-current">
        <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 3a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm1 8H7V7h2v5Z" />
      </svg>
      <span>{children}</span>
    </p>
  );
}
