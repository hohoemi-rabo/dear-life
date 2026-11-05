import { FamilyRow } from "@/components/illust/FamilyRow";
import { DISTRICT_NAMES, DISTRICT_READINGS } from "@/lib/conditions/labels";
import type { Conditions } from "@/lib/conditions/model";
import { SETTINGS_ICON_WIDTHS, settingsIconSrc, settingsIconSrcSet } from "@/lib/illust/assets";
import type { DistrictId } from "@/lib/town-district/resolve";

// 地区を切りかえたときに画面の中央に出るパネル（見本 docs/design/karte-district-switch.png）。
// 押せない作りにして、出ているあいだも下の画面をスクロール・操作できるようにする。閉じるボタンは置かない。
// 読み上げの枠（role="status"）は常に置き、中身が入ったときに1文だけ読ませる
export function DistrictSwitchNotice({
  district,
  conditions,
}: {
  district: DistrictId | null;
  conditions: Pick<Conditions, "adults" | "children" | "parent">;
}) {
  return (
    <div role="status" aria-label="地区の切りかえの知らせ" className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-4">
      {district && (
        <>
          <span className="sr-only">{DISTRICT_NAMES[district]}のカルテに切り替わりました</span>
          <Panel key={district} district={district} conditions={conditions} />
        </>
      )}
    </div>
  );
}

function Panel({ district, conditions }: { district: DistrictId; conditions: Pick<Conditions, "adults" | "children" | "parent"> }) {
  const name = DISTRICT_NAMES[district];
  return (
    <div
      aria-hidden="true"
      className="flex w-full max-w-2xl flex-col items-center gap-1 rounded-3xl border-2 border-primary bg-surface px-4 py-4 text-center shadow-[0_8px_32px_rgb(43_42_38/0.25)] motion-safe:animate-district-notice sm:px-8 sm:py-6"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- 静的書き出しなので WebP をそのまま出す */}
      <img
        src={settingsIconSrc("district", SETTINGS_ICON_WIDTHS[0])}
        srcSet={settingsIconSrcSet("district")}
        sizes="32px"
        alt=""
        draggable={false}
        className="size-8 select-none object-contain"
      />
      {/* 中心市街地は5文字あるので、スマホの幅に収まる大きさにする */}
      <p className={`font-extrabold leading-tight text-primary ${name.length > 3 ? "text-[40px] sm:text-6xl" : "text-6xl md:text-7xl"}`}>{name}</p>
      <p className="text-sm font-bold text-primary">{DISTRICT_READINGS[district]}</p>
      {/* 1行に収めるため、画面の幅に合わせて文字の大きさを変える */}
      <p className="mt-1 whitespace-nowrap text-[clamp(16px,5.4vw,36px)] font-extrabold leading-snug">のカルテに切り替わりました！</p>
      <p className="text-sm text-ink-muted sm:text-lg">住まい・学校・交通など、{name}の情報をご覧ください。</p>
      {/* スマホを横にしたときなど高さが足りない画面では、文字だけにしてパネルが切れないようにする */}
      <div className="mt-2 flex items-center justify-center gap-3 sm:gap-5 [@media(max-height:420px)]:hidden">
        <Sparks className="text-primary" />
        <div className="motion-safe:animate-hop motion-safe:[animation-delay:200ms] motion-safe:[animation-iteration-count:2]">
          <FamilyRow conditions={conditions} fatherHeight={72} className="md:hidden" />
          <FamilyRow conditions={conditions} fatherHeight={96} className="hidden md:flex" />
        </div>
        <Sparks className="-scale-x-100 text-warm" />
      </div>
    </div>
  );
}

// 家族の左右の小さな線（見本）
function Sparks({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`size-6 shrink-0 sm:size-8 ${className}`} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <path d="M6 16 L2 13" />
      <path d="M11 11 L8 5" />
      <path d="M17 10 L18 3" />
    </svg>
  );
}
