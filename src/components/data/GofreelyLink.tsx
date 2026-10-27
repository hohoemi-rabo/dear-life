import { buttonClassName } from "@/components/ui/Button";
import type { BusOuting } from "@/lib/data/screen-data";
import { gofreelyHref } from "@/lib/kurashi/gofreely";

// この便を gofreely で調べる（要件 1.1・6.3）。くらしの冬・車0台の場面とカルテの交通カードで使う。別のサイトなので新しいタブで開く
export function GofreelyLink({ outing, className }: { outing: BusOuting; className?: string }) {
  return (
    <a href={gofreelyHref(outing)} target="_blank" rel="noopener noreferrer" className={buttonClassName("secondary", className)}>
      この便を gofreely で調べる
      <span className="sr-only">（別のサイトが新しいタブで開きます）</span>
      <span aria-hidden="true">↗</span>
    </a>
  );
}
