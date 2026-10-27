import Link from "next/link";
import { InstallGuide } from "@/components/pwa/InstallGuide";
import { PERSONAL_SERVICE_NOTE, REINFOLIB_API_CREDIT } from "@/lib/credits";
import { ABOUT_DATA_PATH, TARGET_DISTRICTS_LABEL } from "@/lib/site";

// 全画面の下に対象期間・除外した取引・出典を書き、「データについて」へつなぐ（F-08・要件 7.3）
export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-line bg-kinari-deep">
      <div className="mx-auto max-w-6xl space-y-3 px-4 py-6 text-sm text-ink-muted">
        <p className="font-bold text-ink">対象地区：{TARGET_DISTRICTS_LABEL}</p>
        <p>
          相場は、国土交通省 不動産情報ライブラリの取引価格情報（飯田市・直近5年分）を地区ごとに集計した、過去の取引の参考値です。調停・競売等、関係者間取引、隣地の購入は除いています。
        </p>
        <div>
          <p>出典・対象時点・集計方法は「データについて」にまとめています。</p>
          <Link
            href={ABOUT_DATA_PATH}
            className="inline-flex min-h-tap items-center gap-1 font-bold text-primary underline underline-offset-4"
          >
            データについて
            <span aria-hidden="true">→</span>
          </Link>
        </div>
        <InstallGuide />
        <p>{REINFOLIB_API_CREDIT}</p>
        <p>{PERSONAL_SERVICE_NOTE}</p>
      </div>
    </footer>
  );
}
