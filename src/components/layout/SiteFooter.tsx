import Link from "next/link";
import { PERSONAL_SERVICE_NOTE } from "@/lib/credits";
import { ABOUT_DATA_PATH, TARGET_DISTRICTS_LABEL } from "@/lib/site";

// 全画面の下に対象地区と、国や市のサービスではないことをひと言だけ書き、「データについて」へつなぐ（F-08・要件 7.3）。
// 相場の対象期間・除いた取引・出典・API の指定の文言・ホーム画面への追加は「データについて」で見せる（028：フッターを小さく）
export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-kinari-deep">
      <div className="mx-auto max-w-page px-4 py-2 text-xs leading-relaxed text-ink-muted">
        <div className="flex flex-wrap items-center justify-between gap-x-2">
          <p className="font-bold text-ink">対象地区：{TARGET_DISTRICTS_LABEL}</p>
          <Link
            href={ABOUT_DATA_PATH}
            className="inline-flex min-h-tap items-center gap-1 font-bold text-primary underline-offset-4 hover:underline"
          >
            データについて
            <span aria-hidden="true">→</span>
          </Link>
        </div>
        <p>{PERSONAL_SERVICE_NOTE}</p>
      </div>
    </footer>
  );
}
