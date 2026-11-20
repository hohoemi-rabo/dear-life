"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { ChooseAgainLink, ConditionsPanel, ConditionsStrip } from "@/components/conditions/ConditionsPanel";
import { ScreenDataBoundary } from "@/components/data/ScreenDataBoundary";
import { FamilyRow } from "@/components/illust/FamilyRow";
import { ScreenTabBar } from "@/components/layout/ScreenTabBar";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { ButtonLink, buttonClassName } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ScreenSkeleton } from "@/components/ui/Skeleton";
import { karteLayout } from "@/lib/conditions/karte-order";
import { DISTRICT_NAMES } from "@/lib/conditions/labels";
import type { Conditions } from "@/lib/conditions/model";
import { conditionsHref } from "@/lib/conditions/url";
import { useConditions } from "@/lib/conditions/useConditions";
import { karteHeaderFor, propSrc, propSrcSet } from "@/lib/illust/assets";
import { checkMemoItems } from "@/lib/karte/check-memo";
import { SHITAMI_MEMO_ANCHOR } from "@/lib/karte/shitami-memo";
import {
  KARTE_TAB_PARAM,
  karteTabCards,
  karteTabFromHash,
  karteTabs,
  parseKarteTab,
  withKarteTab,
  type KarteTab,
} from "@/lib/karte/tabs";
import type { Priority } from "@/lib/conditions/labels";
import { karteDetailHref, kurashiHref } from "@/lib/karte/links";
import { kurabeHref } from "@/lib/kurabe/links";
import { parseSeason, SEASON_PARAM } from "@/lib/kurashi/season";
import { mascotMotion } from "@/lib/mascot/spots";
import type { MascotMotionId } from "@/lib/mascot/assets";
import { MascotCompanion, MascotFigure } from "@/components/mascot/Mascot";
import { singleMascotMotion } from "@/lib/mascot/single";
import { mapHref } from "@/lib/map/links";
import { ERABU_PATH } from "@/lib/site";
import type { DistrictId } from "@/lib/town-district/resolve";
import { CheckMemo } from "./CheckMemo";
import { KartePrintButton } from "./KartePrint";
import { NextStepScene } from "./NextStepScene";
import { ShitamiMemoSection } from "./ShitamiMemo";
import { DistrictSwitchNotice } from "./DistrictSwitchNotice";
import { KARTE_TABPANEL_ID, KarteEntries, KarteTabs, karteTabId } from "./KarteEntries";
import { useDistrictSwitch } from "./useDistrictSwitch";

type Chosen = Conditions & { district: DistrictId };

// 03 カルテ（F-03・F-04・4章）。図鑑の目次のように7項目のカードを並べ、各カードから項目ごとの詳細のページへ進む（028 見本）。
// 条件は URL パラメータに持つ（F-02）。useSearchParams を使うので <Suspense> の中で使う。PC（xl 以上）は左に「わが家の設定」を置く
export function KarteView() {
  const { conditions, setConditions } = useConditions();
  const searchParams = useSearchParams();
  const { district } = conditions;
  const { noticeDistrict, cardsHighlighted } = useDistrictSwitch(district);
  const { tab, selectTab } = useKarteTab(conditions.priorities);
  const panelRef = useTabFadeIn(tab);
  if (district === null) return <NoDistrict conditions={conditions} />;

  const chosen = { ...conditions, district };
  const layout = karteLayout(chosen);
  // マスコット（042）：選んだ地区のしぐさを、くらしで見ていた季節（URL の s）の服装で。カルテには見出しの右・下の帯の2か所に出る（わが家の設定の家族の横の地区のしぐさは 2026-11-17 まさゆきさんの判断で外した。一人のときのまばたきのぽてり（043）は別）
  const season = parseSeason(searchParams.get(SEASON_PARAM));
  const mascot = mascotMotion(district, season);
  // 一人のときだけ人の絵の横に並ぶぽてり（043。押せない）。PC は「わが家の設定」、スマホは上の条件の帯（2026-11-19 まさゆきさん）
  const companion = singleMascotMotion(chosen, season);
  const memoItems = checkMemoItems(chosen);
  return (
    <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
      <aside aria-label="わが家の設定" className="hidden xl:block">
        <ConditionsPanel
          conditions={chosen}
          onConditionsChange={setConditions}
          chooseAgainLabel="条件を変える"
          familyCompanion={companion !== null && <MascotCompanion motion={companion} className="h-11" />}
        />
      </aside>

      <div className="flex min-w-0 flex-col gap-4">
        <div className="xl:hidden">
          <ConditionsStrip
            conditions={chosen}
            onConditionsChange={setConditions}
            action={<ChooseAgainLink conditions={chosen} label="条件を変える" icon="icon-gear" className="flex-col gap-0 text-xs" />}
            familyCompanion={companion !== null && <MascotCompanion motion={companion} className="h-7" />}
          />
        </div>

        <div className="flex flex-col gap-1">
          {/* 見出しの右上の「印刷する」（023。2026-11-09 まさゆきさん） */}
          <div className="flex justify-end">
            <KartePrintButton conditions={chosen} current={null} />
          </div>
          <KarteHeading conditions={chosen} leads={layout.leads} mascot={mascot} />
        </div>
        <CheckMemo
          conditions={chosen}
          items={memoItems}
          hrefFor={(item) =>
            item.target.kind === "map"
              ? mapHref(chosen, searchParams.get(SEASON_PARAM))
              : karteDetailHref(chosen, item.target.card, searchParams)
          }
          shitamiMemoHref={`#${SHITAMI_MEMO_ANCHOR}`}
        />
        <KarteTabs tabs={karteTabs(layout.cards, chosen.priorities)} current={tab} onSelect={selectTab} />

        <div ref={panelRef} role="tabpanel" id={KARTE_TABPANEL_ID} aria-labelledby={karteTabId(tab)} className="flex flex-col gap-4">
          <ScreenDataBoundary fallback={<ScreenSkeleton label="カルテを読み込んでいます" />}>
            <KarteEntries
              cards={karteTabCards(tab, layout.cards, chosen.priorities)}
              conditions={chosen}
              memoItems={memoItems}
              highlighted={cardsHighlighted}
            />
          </ScreenDataBoundary>
          {/* 選んだカードだけで終わりにせず、選ばなかった項目にも気づけるように（048。一文は付けない。2026-11-20 まさゆきさん） */}
          {tab === "mine" && (
            <button type="button" onClick={() => selectTab("all")} className={buttonClassName("secondary", "self-center")}>
              ほかの項目も見る
              <span aria-hidden="true">→</span>
            </button>
          )}
        </div>

        {/* わが家の下見プラン（036）。カードと「次は、現地で確かめよう」のあいだに置く */}
        <ScreenDataBoundary fallback={<ScreenSkeleton label="下見プランを読み込んでいます" />}>
          <ShitamiMemoSection
            conditions={chosen}
            links={{ map: mapHref(chosen, searchParams.get(SEASON_PARAM)), housing: karteDetailHref(chosen, "housing", searchParams) }}
          />
        </ScreenDataBoundary>

        <NextStepBand conditions={chosen} searchParams={searchParams} />
      </div>

      <DistrictSwitchNotice district={noticeDistrict} conditions={chosen} />
      <ScreenTabBar current="karte" conditions={chosen} seasonSlug={searchParams.get(SEASON_PARAM)} />
    </div>
  );
}

// 今のタブ（048）。URL の tab から読み、押したら tab を書きかえる（履歴は増やさない）。
// 一覧のカードの id（#karte-<card>）で来たときは、そのカードが出る項目のタブに切りかえる
function useKarteTab(priorities: readonly Priority[]): { tab: KarteTab; selectTab: (tab: KarteTab) => void } {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const tab = parseKarteTab(searchParams.get(KARTE_TAB_PARAM), priorities);

  const selectTab = useCallback(
    (next: KarteTab, hash = "") => {
      const query = withKarteTab(searchParams, next, priorities).toString();
      router.replace(`${query ? `${pathname}?${query}` : pathname}${hash}`, { scroll: false });
    },
    [pathname, priorities, router, searchParams],
  );

  // 開いたときに一度だけ見る
  const hashChecked = useRef(false);
  useEffect(() => {
    if (hashChecked.current) return;
    hashChecked.current = true;
    const card = karteTabFromHash(window.location.hash);
    if (card !== null && card !== tab) selectTab(card, window.location.hash);
  }, [selectTab, tab]);

  return { tab, selectTab };
}

// タブを押したら、出てきたカードをふわっと出す（2026-11-20 まさゆきさん）。開いたときは動かさない。
// 中身を作り直すとデータの読み込みやカードへ移る動きがやり直しになるので、枠に Web Animations をかけるだけにする。
// 「動きを減らす」の設定では動かさない
const TAB_FADE_MS = 320;
function useTabFadeIn(tab: KarteTab) {
  const panel = useRef<HTMLDivElement>(null);
  const shownTab = useRef(tab);
  useEffect(() => {
    if (shownTab.current === tab) return;
    shownTab.current = tab;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    panel.current?.animate?.(
      [
        { opacity: 0, transform: "translateY(12px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: TAB_FADE_MS, easing: "ease-out" },
    );
  }, [tab]);
  return panel;
}

// 「わが家のカルテ」の左の本。PC は見出しの横に大きく、スマホは見出しの文字の左に出す。飾りなので読み上げない
function TitleBook({ className }: { className: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 静的書き出しなので WebP をそのまま出す
    <img
      src={propSrc("karte-title-book", 96)}
      srcSet={propSrcSet("karte-title-book")}
      sizes="48px"
      alt=""
      draggable={false}
      className={`shrink-0 select-none object-contain ${className}`}
    />
  );
}

// 見出し（見本）：家族の絵（PC）・本の印・「わが家のカルテ」・地区の一文・並びの一文と、右に風景の絵。
// 並びの一文は、大切にしたいことを選んだときに「わが家の大切なこと」にまとめたことを伝える（要件 4章・048）
function KarteHeading({ conditions, leads, mascot }: { conditions: Chosen; leads: readonly string[]; mascot: MascotMotionId | null }) {
  const header = karteHeaderFor(conditions.district);
  return (
    <header className="flex items-center gap-3 md:gap-4">
      <FamilyRow conditions={conditions} fatherHeight={64} lazy className="hidden shrink-0 xl:flex" />
      <TitleBook className="hidden size-12 sm:block" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-end gap-2 md:gap-3">
          <h1 className="flex items-center gap-2 whitespace-nowrap text-xl font-extrabold sm:text-2xl md:text-3xl">
            <TitleBook className="size-8 sm:hidden" />
            わが家のカルテ
          </h1>
          {/* マスコット（042）：見出しの右（2026-11-15 まさゆきさん。地区くらべの見出しの横とそろえる） */}
          {mascot !== null && <MascotFigure motion={mascot} className="relative h-7 md:h-11" />}
        </div>
        <p className="text-sm md:text-base">
          {DISTRICT_NAMES[conditions.district]}
          の暮らしを、ひとつずつ確かめよう。
        </p>
        {leads.length > 0 && (
          <div role="note" aria-label="表示の順番" className="flex flex-col text-xs text-ink-muted md:text-sm">
            {leads.map((lead) => (
              <p key={lead}>{lead}</p>
            ))}
          </div>
        )}
      </div>
      <picture className="w-28 shrink-0 sm:w-48 lg:w-[min(40%,520px)]">
        <source media="(min-width: 1024px)" srcSet={propSrcSet(header.wide)} sizes="min(40vw, 520px)" />
        <img
          src={propSrc(header.tall, 240)}
          srcSet={propSrcSet(header.tall)}
          sizes="(min-width: 640px) 192px, 112px"
          alt=""
          draggable={false}
          className="h-auto w-full select-none"
        />
      </picture>
    </header>
  );
}

// 下の帯（見本「次は、現地で確かめよう」）：歩く家族と、地図・地区くらべ・くらしに戻る。
// iPad の縦（md）は絵と文の下にボタンを回し、横1列は lg から。lg はボタンの幅を少し詰めて見出しを1行に収める（2026-11-07）
function NextStepBand({ conditions, searchParams }: { conditions: Chosen; searchParams: { get(name: string): string | null } }) {
  return (
    <nav aria-labelledby="next-step-title" className="flex flex-col gap-4 rounded-card bg-warm-soft p-4 md:flex-row md:flex-wrap md:items-center md:p-5 lg:flex-nowrap">
      <NextStepScene conditions={conditions} season={parseSeason(searchParams.get(SEASON_PARAM))} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 id="next-step-title" className="text-lg font-bold md:text-xl">
          次は、現地で確かめよう
        </h2>
        <p className="text-sm">気になる場所を地図で見たり、他の地区とくらべてみましょう。</p>
      </div>
      <div className="flex flex-col gap-2 md:w-full lg:w-[min(40%,400px)] xl:w-[min(46%,440px)]">
        {/* 2つ並べて収まる幅なら半分ずつ、収まらなければ縦に積む。Android の Chrome は文字を大きくする設定で
            文字が広がり、2列に固定するとボタンから字がはみ出した（2026-11-09）。!min-w-max で字の幅より縮めない */}
        <div className="flex flex-wrap gap-2">
          <ButtonLink
            href={mapHref(conditions, searchParams.get(SEASON_PARAM))}
            className="flex-1 whitespace-nowrap !gap-1 !px-2 !text-[13px] !min-w-max md:!text-sm"
          >
            <PixelIcon icon="icon-map" size="sm" />
            地図で場所を見る
          </ButtonLink>
          <ButtonLink
            href={kurabeHref(conditions, searchParams.get(SEASON_PARAM))}
            variant="secondary"
            className="flex-1 whitespace-nowrap !gap-1 !px-2 !text-[13px] !min-w-max md:!text-sm"
          >
            <PixelIcon icon="icon-chart" size="sm" />
            地区をくらべる
          </ButtonLink>
        </div>
        <Link
          href={kurashiHref(conditions, searchParams)}
          className="inline-flex min-h-tap items-center justify-center gap-1 self-center text-sm font-bold text-primary underline-offset-4 hover:underline"
        >
          <span aria-hidden="true">←</span>
          くらしに戻る
        </Link>
      </div>
    </nav>
  );
}

export function NoDistrict({ conditions }: { conditions: Conditions }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <h1 className="text-2xl font-extrabold">わが家のカルテ</h1>
      <Card className="flex flex-col items-start gap-3">
        <p>住む地区がまだ選ばれていません。「01 えらぶ」で地区を選ぶと、その地区の相場・学校・交通などを確かめられます。</p>
        <ButtonLink href={conditionsHref(ERABU_PATH, conditions)}>
          地区をえらぶ
          <span aria-hidden="true">→</span>
        </ButtonLink>
      </Card>
    </div>
  );
}
