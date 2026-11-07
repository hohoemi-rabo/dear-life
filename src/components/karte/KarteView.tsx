"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChooseAgainLink, ConditionsPanel, ConditionsStrip } from "@/components/conditions/ConditionsPanel";
import { ScreenDataBoundary } from "@/components/data/ScreenDataBoundary";
import { FamilyRow } from "@/components/illust/FamilyRow";
import { ScreenTabBar } from "@/components/layout/ScreenTabBar";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ScreenSkeleton } from "@/components/ui/Skeleton";
import { karteLayout } from "@/lib/conditions/karte-order";
import { DISTRICT_NAMES } from "@/lib/conditions/labels";
import type { Conditions } from "@/lib/conditions/model";
import { conditionsHref } from "@/lib/conditions/url";
import { useConditions } from "@/lib/conditions/useConditions";
import { karteHeaderFor, propSrc, propSrcSet } from "@/lib/illust/assets";
import { checkMemoItems } from "@/lib/karte/check-memo";
import { karteDetailHref, kurashiHref } from "@/lib/karte/links";
import { kurabeHref } from "@/lib/kurabe/links";
import { SEASON_PARAM } from "@/lib/kurashi/season";
import { mapHref } from "@/lib/map/links";
import { ERABU_PATH } from "@/lib/site";
import type { DistrictId } from "@/lib/town-district/resolve";
import { CheckMemo } from "./CheckMemo";
import { NextStepScene } from "./NextStepScene";
import { DistrictSwitchNotice } from "./DistrictSwitchNotice";
import { KarteEntries, KarteTabs } from "./KarteEntries";
import { useDistrictSwitch } from "./useDistrictSwitch";

type Chosen = Conditions & { district: DistrictId };

// 03 カルテ（F-03・F-04・4章）。図鑑の目次のように7項目のカードを並べ、各カードから項目ごとの詳細のページへ進む（028 見本）。
// 条件は URL パラメータに持つ（F-02）。useSearchParams を使うので <Suspense> の中で使う。PC（xl 以上）は左に「わが家の設定」を置く
export function KarteView() {
  const { conditions, setConditions } = useConditions();
  const searchParams = useSearchParams();
  const { district } = conditions;
  const { noticeDistrict, cardsHighlighted } = useDistrictSwitch(district);
  if (district === null) return <NoDistrict conditions={conditions} />;

  const chosen = { ...conditions, district };
  const layout = karteLayout(chosen);
  const memoItems = checkMemoItems(chosen);
  return (
    <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
      <aside aria-label="わが家の設定" className="hidden xl:block">
        <ConditionsPanel conditions={chosen} onConditionsChange={setConditions} chooseAgainLabel="条件を変える" />
      </aside>

      <div className="flex min-w-0 flex-col gap-4">
        <div className="xl:hidden">
          <ConditionsStrip
            conditions={chosen}
            onConditionsChange={setConditions}
            action={<ChooseAgainLink conditions={chosen} label="条件を変える" icon="icon-gear" className="flex-col gap-0 text-xs" />}
          />
        </div>

        <KarteHeading conditions={chosen} leads={layout.leads} />
        <CheckMemo
          conditions={chosen}
          items={memoItems}
          hrefFor={(item) =>
            item.target.kind === "map"
              ? mapHref(chosen, searchParams.get(SEASON_PARAM))
              : karteDetailHref(chosen, item.target.card, searchParams)
          }
        />
        <KarteTabs cards={layout.cards} />

        <ScreenDataBoundary fallback={<ScreenSkeleton label="カルテを読み込んでいます" />}>
          <KarteEntries cards={layout.cards} conditions={chosen} memoItems={memoItems} highlighted={cardsHighlighted} />
        </ScreenDataBoundary>

        <NextStepBand conditions={chosen} searchParams={searchParams} />
      </div>

      <DistrictSwitchNotice district={noticeDistrict} conditions={chosen} />
      <ScreenTabBar current="karte" conditions={chosen} seasonSlug={searchParams.get(SEASON_PARAM)} />
    </div>
  );
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
// 並びの一文は、条件がどう並びに反映されたかを必ず伝えるもの（要件 4章）
function KarteHeading({ conditions, leads }: { conditions: Chosen; leads: readonly string[] }) {
  const header = karteHeaderFor(conditions.district);
  return (
    <header className="flex items-center gap-3 md:gap-4">
      <FamilyRow conditions={conditions} fatherHeight={64} lazy className="hidden shrink-0 xl:flex" />
      <TitleBook className="hidden size-12 sm:block" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h1 className="flex items-center gap-2 whitespace-nowrap text-xl font-extrabold sm:text-2xl md:text-3xl">
          <TitleBook className="size-8 sm:hidden" />
          わが家のカルテ
        </h1>
        <p className="text-sm md:text-base">
          {DISTRICT_NAMES[conditions.district]}
          の暮らしを、ひとつずつ確かめよう。
        </p>
        <div role="note" aria-label="表示の順番" className="flex flex-col text-xs text-ink-muted md:text-sm">
          {leads.map((lead) => (
            <p key={lead}>{lead}</p>
          ))}
        </div>
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
      <NextStepScene conditions={conditions} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 id="next-step-title" className="text-lg font-bold md:text-xl">
          次は、現地で確かめよう
        </h2>
        <p className="text-sm">気になる場所を地図で見たり、他の地区とくらべてみましょう。</p>
      </div>
      <div className="flex flex-col gap-2 md:w-full lg:w-[min(40%,400px)] xl:w-[min(46%,440px)]">
        <div className="grid grid-cols-2 gap-2">
          <ButtonLink
            href={mapHref(conditions, searchParams.get(SEASON_PARAM))}
            className="gap-1 whitespace-nowrap px-2 text-[13px] md:text-sm"
          >
            <PixelIcon icon="icon-map" size="sm" />
            地図で場所を見る
          </ButtonLink>
          <ButtonLink
            href={kurabeHref(conditions, searchParams.get(SEASON_PARAM))}
            variant="secondary"
            className="gap-1 whitespace-nowrap px-2 text-[13px] md:text-sm"
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
