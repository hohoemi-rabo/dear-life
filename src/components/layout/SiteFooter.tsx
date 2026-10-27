import Link from "next/link";
import { InstallGuide } from "@/components/pwa/InstallGuide";
import { PERSONAL_SERVICE_NOTE, REINFOLIB_API_CREDIT } from "@/lib/credits";
import { ABOUT_DATA_PATH, TARGET_DISTRICTS_LABEL } from "@/lib/site";

// 全画面の下に対象期間・除外した取引・出典を書き、「データについて」へつなぐ（F-08・要件 7.3）。
// 文言は減らさずに小さく詰め、上に山並みの飾りを置く（027）
export function SiteFooter() {
  return (
    <footer className="mt-8">
      <div
        aria-hidden="true"
        className="pixelated h-6 bg-[url('/pixel/deco-mountains.png')] bg-[length:192px_24px] bg-bottom bg-repeat-x"
      />
      <div className="border-t border-line bg-kinari-deep">
        <div className="mx-auto max-w-page space-y-2 px-4 py-5 text-xs leading-relaxed text-ink-muted">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <p className="font-bold text-ink">対象地区：{TARGET_DISTRICTS_LABEL}</p>
            <p>{PERSONAL_SERVICE_NOTE}</p>
          </div>
          <p>
            相場は、国土交通省 不動産情報ライブラリの取引価格情報（飯田市・直近5年分）を地区ごとに集計した、過去の取引の参考値です。調停・競売等、関係者間取引、隣地の購入は除いています。出典・対象時点・集計方法は「データについて」にまとめています。
          </p>
          <Link
            href={ABOUT_DATA_PATH}
            className="inline-flex min-h-tap items-center gap-1 text-sm font-bold text-primary underline-offset-4 hover:underline"
          >
            データについて
            <span aria-hidden="true">→</span>
          </Link>
          <InstallGuide />
          <p>{REINFOLIB_API_CREDIT}</p>
        </div>
      </div>
    </footer>
  );
}
