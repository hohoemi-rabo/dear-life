import type { ReactNode } from "react";
import { PixelIcon, type IconId } from "@/components/pixel/PixelIcon";
import { propSrc, propSrcSet, transportTabIconSrc, transportTabIconSrcSet, type PropId, type TransportTabIconId } from "@/lib/illust/assets";

// カルテの詳細のいちばん上のカード（028 見本 karte-detail-housing.png）の部品。住まいもほかの6つも同じ形にする：
// 絵・見出し・大きい数字 → 注意書き → タブ → タブの中の一覧

export type DetailTabItem = {
  id: string;
  label: string;
  icon: IconId;
  // ドット絵の印の代わりに出す生成AIの印（交通のタブ。2026-11-12 受け取り）
  illust?: TransportTabIconId;
  // 1枚ずつの生成AIの印（子育て・学校のタブ。2026-11-12 受け取り）
  prop?: PropId;
  // 「洪水 25」のように、ラベルの横に出す数
  count?: number;
};

// 見本のタブ。選んだタブは塗りつぶし、下に小さな三角を出す。4つ以上並ぶときは、スマホでは印を省いて名前を入れる
export function DetailTabs({
  label,
  tabs,
  selectedId,
  panelId,
  onSelect,
  large = false,
}: {
  label: string;
  tabs: readonly DetailTabItem[];
  selectedId: string;
  panelId: string;
  onSelect: (id: string) => void;
  // 大きいタブ（防災の災害の種類。040 見本）。PC は高く・印と文字を大きくし、スマホで4つ並ぶときは印を名前の上に置く（印を消さない）
  large?: boolean;
}) {
  const crowded = tabs.length >= 4;
  const hideIcon = crowded && !large ? "hidden sm:inline-block" : "";
  return (
    <div role="tablist" aria-label={label} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
      {tabs.map((item) => {
        const selected = item.id === selectedId;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId}
            onClick={() => onSelect(item.id)}
            className={[
              "relative flex min-h-tap items-center justify-center gap-1 whitespace-nowrap rounded-button border px-0.5 text-[11px] font-bold sm:gap-1.5 sm:text-sm",
              large ? `md:min-h-14 md:gap-2 md:text-lg ${crowded ? "flex-col py-1 sm:flex-row sm:py-0" : ""}` : "",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              selected ? "border-primary bg-primary text-white" : "border-line bg-surface text-ink hover:border-primary",
            ].join(" ")}
          >
            {item.prop ? (
              <PropIcon prop={item.prop} className={`size-6 ${large ? "md:size-9" : ""} ${hideIcon}`} />
            ) : item.illust ? (
              // eslint-disable-next-line @next/next/no-img-element -- 静的書き出しなので WebP をそのまま出す
              <img
                src={transportTabIconSrc(item.illust, 48)}
                srcSet={transportTabIconSrcSet(item.illust)}
                sizes="24px"
                alt=""
                draggable={false}
                className={`size-6 shrink-0 select-none object-contain ${hideIcon}`}
              />
            ) : (
              <PixelIcon icon={item.icon} size="sm" className={hideIcon} />
            )}
            <TabLabel label={item.label} />
            {item.count !== undefined && <span className="tabular-nums">{item.count.toLocaleString("ja-JP")}</span>}
            {selected && <span aria-hidden="true" className="absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 bg-primary" />}
          </button>
        );
      })}
    </div>
  );
}

// 1枚ずつの生成AIの印（タブ・ボタン・札の左）。そばの文字で意味がわかるので読み上げない
export function PropIcon({ prop, className }: { prop: PropId; className: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 静的書き出しなので WebP をそのまま出す
    <img src={propSrc(prop, 48)} srcSet={propSrcSet(prop)} sizes="56px" alt="" draggable={false} className={`shrink-0 select-none object-contain ${className}`} />
  );
}

// 子育て・学校のタブのカードの頭：印・見出し・一行の説明（039 見本）
export function PanelTitle({ prop, title, description }: { prop: PropId; title: string; description?: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <PropIcon prop={prop} className="size-12 md:size-14" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="text-lg font-extrabold md:text-xl">{title}</h2>
        {description && <p className="text-sm">{description}</p>}
      </div>
    </div>
  );
}

// 「通う学校（学区）」のような括弧の付いた名前は、スマホの狭いタブでは括弧の前で2行にする（4つ横並びに収めるため。039）
function TabLabel({ label }: { label: string }) {
  const at = label.indexOf("（");
  if (at <= 0) return <>{label}</>;
  return (
    <span className="flex flex-col items-center leading-tight sm:flex-row">
      <span>{label.slice(0, at)}</span>
      <span>{label.slice(at)}</span>
    </span>
  );
}

// 「!」の付いた注意書き（見本の「現在の売り出し価格ではなく…」の箱）
export function NoticeBox({ title, body, className = "" }: { title: string; body?: string; className?: string }) {
  return (
    <div className={`flex gap-2 rounded-button bg-warm-soft p-3 ${className}`}>
      <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gold font-bold text-white">
        !
      </span>
      <p className="flex flex-col text-sm">
        <span className="font-bold text-kind-local">{title}</span>
        {body && <span>{body}</span>}
      </p>
    </div>
  );
}

// 見出しの左の絵（見本の家の絵の場所）。生成AIの絵（2026-11-01 受け取りの detail-*）を水色の箱に入れる
export function DetailPicture({ asset }: { asset: PropId }) {
  return (
    <div className="flex h-20 w-24 shrink-0 items-center justify-center rounded-button bg-pixel-sky md:h-24 md:w-32">
      {/* eslint-disable-next-line @next/next/no-img-element -- 静的書き出しなので WebP をそのまま出す */}
      <img
        src={propSrc(asset, 240)}
        srcSet={propSrcSet(asset)}
        sizes="128px"
        alt=""
        draggable={false}
        className="size-full select-none object-contain p-1.5"
      />
    </div>
  );
}

// 絵と、見出し・大きい数字（または「該当なし／データ未取得」）を横に並べる
export function DetailFigure({ picture, title, children }: { picture: ReactNode; title: ReactNode; children: ReactNode }) {
  return (
    <div className="flex gap-3 md:gap-5">
      {picture}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 className="text-sm font-bold md:text-base">{title}</h2>
        {children}
      </div>
    </div>
  );
}

// 大きい数字（「41か所」「13,534人」）。値段ではないので、値段だけに使うフォント（Mochiy Pop One）にはしない
export function BigCount({ count, unit, after }: { count: number; unit: string; after?: ReactNode }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="text-4xl font-extrabold tabular-nums md:text-5xl">
        {count.toLocaleString("ja-JP")}
        <span className="ml-1 text-xl md:text-2xl">{unit}</span>
      </span>
      {after}
    </p>
  );
}

// 検索・選択の欄の左の虫眼鏡（学区の町名・防災の絞り込み）。欄を relative にして置く
export function SearchMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-ink-muted"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="m13 13 4.5 4.5" strokeLinecap="round" />
    </svg>
  );
}
