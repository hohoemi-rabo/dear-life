"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { DataSourceNote } from "@/components/data/DataSourceNote";
import { DataStateMessage } from "@/components/data/DataStateMessage";
import { useScreenData } from "@/components/data/ScreenDataBoundary";
import { PixelIcon, type IconId } from "@/components/pixel/PixelIcon";
import { buttonClassName } from "@/components/ui/Button";
import { CountLabel } from "@/components/ui/CountBadge";
import { SourceNote } from "@/components/ui/SourceNote";
import { KARTE_CARD_LABELS, karteCardAnchor, type KarteCard } from "@/lib/conditions/labels";
import { hasNoCar, type Conditions } from "@/lib/conditions/model";
import type { DataState, DistrictData, SourceInfo } from "@/lib/data/screen-data";
import { SQUARE_METER, formatManYen, formatQuarterRange } from "@/lib/format";
import { houseSrc, propSrc, propSrcSet, type PropId } from "@/lib/illust/assets";
import {
  KARTE_ENTRY_ACTIONS,
  KARTE_ENTRY_HINTS,
  KARTE_ENTRY_QUESTIONS,
  KARTE_ENTRY_SUMMARIES,
  MARKET_CATEGORY_PHRASES,
  housingQuestion,
  splitKarteCards,
  transportQuestion,
  type MainKarteCard,
  type MinorKarteCard,
} from "@/lib/karte/entries";
import { NO_RENT_DATA, marketCategoryOrder } from "@/lib/karte/housing";
import { karteDetailHref } from "@/lib/karte/links";
import { NOTICES } from "@/lib/notices";
import { ABOUT_DATA_PATH } from "@/lib/site";
import type { DistrictId } from "@/lib/town-district/resolve";

type Chosen = Conditions & { district: DistrictId };

// 項目ごとの印（タブ・カードの見出し）
export const KARTE_CARD_ICONS: Readonly<Record<KarteCard, IconId>> = {
  housing: "icon-house",
  childcare: "icon-school",
  transport: "icon-transport",
  disaster: "icon-disaster",
  population: "icon-population",
  public_facilities: "icon-public",
  support: "icon-support",
};

// カードの絵（2026-11-01 受け取り。春の絵を4地区で使い回す）。住まいは選んだ家の絵
export const CARD_PICTURES: Readonly<Record<Exclude<KarteCard, "housing">, PropId>> = {
  childcare: "karte-childcare",
  transport: "karte-transport",
  disaster: "karte-disaster",
  population: "karte-population",
  public_facilities: "karte-public",
  support: "karte-support",
};

// 一覧のカード（図鑑の目次。028 見本）。上の段は絵と問いの大きいカード、下の段は人口・公共施設・支援制度の小さいカード。
// 並び順は karteLayout のまま。#karte-<card> 付きで開いたら、データが届いてカードが出てからそこまで移る
export function KarteEntries({ cards, conditions }: { cards: readonly KarteCard[]; conditions: Chosen }) {
  const data = useScreenData();
  const searchParams = useSearchParams();
  const district = data.districts[conditions.district];
  const { main, minor } = splitKarteCards(cards);
  const detailHref = (card: KarteCard) => karteDetailHref(conditions, card, searchParams);

  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView?.({ block: "start" });
  }, []);

  const bodies: Record<MainKarteCard, ReactNode> = {
    housing: <HousingEntry district={district} conditions={conditions} href={detailHref("housing")} />,
    childcare: <ChildcareEntry district={district} href={detailHref("childcare")} />,
    transport: (
      <MainEntry
        card="transport"
        question={transportQuestion(conditions.car)}
        summary={KARTE_ENTRY_SUMMARIES.transport.text}
        hints={[KARTE_ENTRY_HINTS.transport, ...(hasNoCar(conditions) ? [NOTICES.carFree] : [])]}
        href={detailHref("transport")}
      />
    ),
    disaster: (
      <MainEntry
        card="disaster"
        question={KARTE_ENTRY_QUESTIONS.disaster}
        summary={KARTE_ENTRY_SUMMARIES.disaster.text}
        hints={[KARTE_ENTRY_HINTS.disaster]}
        href={detailHref("disaster")}
      />
    ),
  };

  return (
    <div className="flex flex-col gap-4">
      <ul aria-label="くらしの項目" className="grid gap-4 lg:grid-cols-2">
        {main.map((card) => (
          <li key={card} id={karteCardAnchor(card)} className="flex scroll-mt-4">
            {bodies[card]}
          </li>
        ))}
      </ul>
      <ul aria-label="そのほかの項目" className="grid gap-3 md:grid-cols-3 md:gap-4">
        {minor.map((card) => (
          <li key={card} id={karteCardAnchor(card)} className="flex scroll-mt-4">
            <MinorEntry card={card} href={detailHref(card)} />
          </li>
        ))}
      </ul>
    </div>
  );
}

// 7項目のタブ（見本）。押すと一覧のそのカードまで移る。スマホは横に流し、右の「›」で先を見せる
export function KarteTabs({ cards }: { cards: readonly KarteCard[] }) {
  const [current, setCurrent] = useState<KarteCard | null>(cards[0] ?? null);
  const scrollRight = (event: React.MouseEvent<HTMLButtonElement>) =>
    event.currentTarget.previousElementSibling?.scrollBy({
      left: 160,
      behavior: "smooth",
    });
  return (
    <nav aria-label="項目へ移る" className="relative">
      <ul className="flex gap-2 overflow-x-auto pb-1 pr-12 [scrollbar-width:none] md:pr-0 xl:grid xl:grid-cols-7 xl:overflow-visible">
        {cards.map((card) => {
          const active = card === current;
          return (
            <li key={card} className="shrink-0">
              <a
                href={`#${karteCardAnchor(card)}`}
                onClick={() => setCurrent(card)}
                aria-current={active ? "true" : undefined}
                className={[
                  "flex min-h-tap items-center justify-center gap-1.5 whitespace-nowrap rounded-button border px-4 text-sm font-bold shadow-card",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  active ? "border-primary bg-primary text-white" : "border-line bg-surface text-ink hover:border-primary",
                ].join(" ")}
              >
                <PixelIcon icon={KARTE_CARD_ICONS[card]} size="sm" />
                {KARTE_CARD_LABELS[card]}
              </a>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={scrollRight}
        aria-label="ほかの項目を見る"
        className="absolute right-0 top-0 flex min-h-tap min-w-tap items-center justify-center rounded-full border border-line bg-surface text-xl font-bold text-primary shadow-card md:hidden"
      >
        <span aria-hidden="true">›</span>
      </button>
    </nav>
  );
}

// 大きいカードの枠：見出し（印と項目名）・問い・短い説明（beside）と右の絵、その下に幅いっぱいの中身（値段など）、
// 下に確かめるときの一言・出典・詳細へのボタン。スマホでも問いと値段が1行に収まるよう、絵の横には短い文だけを置く
function EntryFrame({
  card,
  question,
  picture,
  beside,
  children,
  footer,
  href,
}: {
  card: KarteCard;
  question: string;
  picture: ReactNode;
  beside?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  href: string;
}) {
  return (
    <article className="flex w-full flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card md:p-5">
      <div className="flex gap-2 md:gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 md:gap-2">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <PixelIcon icon={KARTE_CARD_ICONS[card]} />
            {KARTE_CARD_LABELS[card]}
          </h2>
          <p className="text-base font-bold md:text-lg">{question}</p>
          {beside}
        </div>
        <div className="flex w-[40%] max-w-[240px] shrink-0 items-start justify-end">{picture}</div>
      </div>
      {children}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-1 basis-56 flex-col gap-2">{footer}</div>
        <Link href={href} className={buttonClassName("secondary", "shrink-0 text-sm")}>
          {KARTE_ENTRY_ACTIONS[card]}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}

// 確かめるときの一言（見本の灰色の札）
function Hint({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 self-start rounded-2xl bg-kinari px-3 py-1.5 text-sm text-ink-muted">
      <PixelIcon icon="icon-info" size="sm" className="mt-0.5" />
      <span>{children}</span>
    </p>
  );
}

function EntryPicture({ prop, sizes = "(min-width: 1024px) 240px, 40vw" }: { prop: PropId; sizes?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 静的書き出しなので WebP をそのまま出し、幅は端末に選ばせる
    <img
      src={propSrc(prop, 240)}
      srcSet={propSrcSet(prop)}
      sizes={sizes}
      alt=""
      loading="lazy"
      draggable={false}
      className="h-auto max-h-36 w-full select-none object-contain"
    />
  );
}

// 出典の行。スマホは「…を見る」で開き、PC はいつも出す（見本）。PC では「データについて」へのリンクも添える
function EntrySources({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <div className={open ? "" : "hidden lg:block"}>{children}</div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-tap items-center gap-1 self-start text-sm font-bold text-primary lg:hidden"
      >
        <PixelIcon icon="icon-document" size="sm" />
        {label}
        <span aria-hidden="true" className={open ? "rotate-180" : ""}>
          ⌄
        </span>
      </button>
      <Link
        href={ABOUT_DATA_PATH}
        className="hidden min-h-tap items-center gap-1 self-start text-sm font-bold text-primary underline-offset-4 hover:underline lg:flex"
      >
        <PixelIcon icon="icon-document" size="sm" />
        {label}
      </Link>
    </div>
  );
}

// 住まい：選んだ家にいちばん近い相場の真ん中の値・件数・件数ラベル・注意書き・出典（要件 5章）。
// 借りるは家賃の情報がないことを先に出し、売買の相場を参考として見せる（2026-11-01 まさゆきさん）
function HousingEntry({ district, conditions, href }: { district: DistrictData; conditions: Chosen; href: string }) {
  const category = marketCategoryOrder(conditions.housing)[0];
  const state = district.market[category];
  const isLand = category === "land";
  const rent = conditions.housing === "rent";
  return (
    <EntryFrame
      card="housing"
      question={housingQuestion(conditions.housing)}
      href={href}
      beside={
        <>
          {rent && <p className="text-sm font-bold">{NO_RENT_DATA}</p>}
          <p className="text-sm md:text-base">
            {rent && "参考："}
            {MARKET_CATEGORY_PHRASES[category]}
            {isLand && `（1${SQUARE_METER}あたり）`}
          </p>
        </>
      }
      picture={
        // eslint-disable-next-line @next/next/no-img-element -- 静的書き出しなので WebP をそのまま出す
        <img
          src={houseSrc(conditions.housing, 320)}
          srcSet={`${houseSrc(conditions.housing, 320)} 320w, ${houseSrc(conditions.housing, 640)} 640w`}
          sizes="(min-width: 1024px) 240px, 40vw"
          alt=""
          loading="lazy"
          draggable={false}
          className="h-auto max-h-36 w-full select-none object-contain"
        />
      }
      footer={
        <>
          <Hint>{NOTICES.market}</Hint>
          {state.status !== "unavailable" && (
            <EntrySources label="対象期間・取得日を見る">
              <DataSourceNote
                source={state.source}
                period={state.status === "available" ? formatQuarterRange(state.value.periodFrom, state.value.periodTo) : undefined}
              />
            </EntrySources>
          )}
        </>
      }
    >
      {state.status === "available" ? (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="price-figure text-[2.5rem] leading-none md:text-5xl">
            {formatManYen(state.value.median)}
            {isLand && <span className="font-sans text-base font-bold">／{SQUARE_METER}</span>}
          </span>
          <span aria-hidden="true" className="h-9 w-px bg-line" />
          <span className="flex flex-col leading-tight">
            <span className="text-xs text-ink-muted">過去の取引</span>
            <span className="text-lg font-bold tabular-nums">{state.value.sampleCount.toLocaleString("ja-JP")}件</span>
          </span>
          <CountLabel count={state.value.sampleCount} />
        </p>
      ) : (
        <DataStateMessage state={state} />
      )}
    </EntryFrame>
  );
}

// 子育て・学校：学区・小中学校・保育施設の入口と、出典（学校の一覧の出典に「ほか」を添える）
function ChildcareEntry({ district, href }: { district: DistrictData; href: string }) {
  const sourced = firstSourced([district.schools, district.childcare, district.elementarySchoolDistricts]);
  const tiles = [
    { label: "学区", icon: "icon-house", tone: "bg-blush-soft" },
    { label: "小中学校", icon: "icon-book", tone: "bg-pixel-sky/60" },
    { label: "保育施設", icon: "icon-school", tone: "bg-warm-soft" },
  ] as const;
  return (
    <EntryFrame
      card="childcare"
      question={KARTE_ENTRY_QUESTIONS.childcare}
      href={href}
      picture={<EntryPicture prop="karte-childcare" />}
      footer={
        <>
          <Hint>{KARTE_ENTRY_HINTS.childcare}</Hint>
          {sourced && (
            <EntrySources label="出典・対象時点・確認日を見る">
              <SourceNote
                source={`${sourced.publisher}「${sourced.name}」ほか`}
                period={sourced.periodLabel ?? "記載なし"}
                date={sourced.checkedOn ?? sourced.fetchedOn}
                dateKind={sourced.checkedOn ? "確認日" : "取得日"}
              />
            </EntrySources>
          )}
        </>
      }
    >
      <ul className="grid max-w-sm grid-cols-3 gap-2">
        {tiles.map((tile) => (
          <li key={tile.label}>
            <Link
              href={href}
              className={`flex min-h-tap flex-col items-center justify-center gap-1 rounded-button px-1 py-2 text-sm font-bold ${tile.tone} focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary`}
            >
              <PixelIcon icon={tile.icon} size="sm" />
              {tile.label}
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-sm">{KARTE_ENTRY_SUMMARIES.childcare.text}</p>
    </EntryFrame>
  );
}

function firstSourced(states: readonly DataState<unknown>[]): SourceInfo | null {
  for (const state of states) if (state.status !== "unavailable") return state.source;
  return null;
}

// 交通・防災：問いと一言だけ（数字は詳細のページで出す）
function MainEntry({
  card,
  question,
  summary,
  hints,
  href,
}: {
  card: "transport" | "disaster";
  question: string;
  summary: string;
  hints: readonly string[];
  href: string;
}) {
  return (
    <EntryFrame
      card={card}
      question={question}
      href={href}
      picture={<EntryPicture prop={CARD_PICTURES[card]} />}
      beside={<p className="text-sm">{summary}</p>}
      footer={hints.map((hint) => (
        <Hint key={hint}>{hint}</Hint>
      ))}
    />
  );
}

// 小さいカード（人口・公共施設・支援制度）。カード全体が詳細へのリンク。PC は下にボタンの形、スマホは1行で右に「›」
function MinorEntry({ card, href }: { card: MinorKarteCard; href: string }) {
  const summary = KARTE_ENTRY_SUMMARIES[card];
  return (
    <Link
      href={href}
      className="group flex w-full items-center gap-3 rounded-card border border-line bg-surface p-3 shadow-card hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:flex-col md:items-stretch md:p-4"
    >
      <span className="flex min-w-0 flex-1 items-center gap-3 md:items-start">
        <PixelIcon icon={KARTE_CARD_ICONS[card]} />
        <span className="flex min-w-0 flex-1 flex-col gap-1 md:flex-row md:items-start md:justify-between">
          <span className="flex min-w-0 flex-col gap-1">
            <span className="text-lg font-bold">{KARTE_CARD_LABELS[card]}</span>
            <span className="text-sm text-ink-muted md:text-ink">
              {summary.short ? (
                <>
                  <span className="md:hidden">{summary.short}</span>
                  <span className="hidden md:inline">{summary.text}</span>
                </>
              ) : (
                summary.text
              )}
            </span>
          </span>
          <span className="hidden w-28 shrink-0 md:block">
            <EntryPicture prop={CARD_PICTURES[card]} sizes="112px" />
          </span>
        </span>
      </span>
      <span className="w-20 shrink-0 md:hidden">
        <EntryPicture prop={CARD_PICTURES[card]} sizes="80px" />
      </span>
      <span aria-hidden="true" className="text-xl text-ink-muted md:hidden">
        ›
      </span>
      <span className={buttonClassName("secondary", "hidden min-h-0 py-1.5 text-sm md:flex")}>
        {KARTE_ENTRY_ACTIONS[card]}
        <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}
