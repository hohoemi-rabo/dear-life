import type { ReactNode } from "react";
import { PixelIcon } from "@/components/pixel/PixelIcon";

// 注意書き。文言は @/lib/notices の NOTICES を使い、画面ごとに書き分けない
export function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="flex gap-2 text-sm text-ink-muted">
      <PixelIcon icon="icon-info" size="sm" className="mt-0.5 self-start" />
      <span>{children}</span>
    </p>
  );
}
