import type { ReactNode } from "react";
import { PixelIcon, type IconId } from "@/components/pixel/PixelIcon";
import { propSrc, propSrcSet, type PropId } from "@/lib/illust/assets";

// カルテの詳細のいちばん上のカード（028 見本 karte-detail-housing.png）の部品。住まいもほかの6つも同じ形にする：
// 絵・見出し・大きい数字 → 注意書き → タブ → タブの中の一覧

export type DetailTabItem = {
  id: string;
  label: string;
  icon: IconId;
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
}: {
  label: string;
  tabs: readonly DetailTabItem[];
  selectedId: string;
  panelId: string;
  onSelect: (id: string) => void;
}) {
  const crowded = tabs.length >= 4;
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
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              selected ? "border-primary bg-primary text-white" : "border-line bg-surface text-ink hover:border-primary",
            ].join(" ")}
          >
            <PixelIcon icon={item.icon} size="sm" className={crowded ? "hidden sm:inline-block" : ""} />
            {item.label}
            {item.count !== undefined && <span className="tabular-nums">{item.count.toLocaleString("ja-JP")}</span>}
            {selected && <span aria-hidden="true" className="absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 bg-primary" />}
          </button>
        );
      })}
    </div>
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
    <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-button bg-pixel-sky md:h-24 md:w-32">
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
export function DetailFigure({ picture, title, children }: { picture: ReactNode; title: string; children: ReactNode }) {
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
