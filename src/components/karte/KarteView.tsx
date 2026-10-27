"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ChooseAgainLink, ConditionChips, ConditionsPanel } from "@/components/conditions/ConditionsPanel";
import { ScreenDataBoundary, useScreenData } from "@/components/data/ScreenDataBoundary";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ScreenSkeleton } from "@/components/ui/Skeleton";
import { karteLayout } from "@/lib/conditions/karte-order";
import { DISTRICT_NAMES, KARTE_CARD_LABELS, karteCardAnchor, type KarteCard } from "@/lib/conditions/labels";
import { hasNoCar, type Conditions } from "@/lib/conditions/model";
import { conditionsHref } from "@/lib/conditions/url";
import { useConditions } from "@/lib/conditions/useConditions";
import { kurashiHref } from "@/lib/karte/links";
import { kurabeHref } from "@/lib/kurabe/links";
import { mapHref } from "@/lib/map/links";
import { SEASON_PARAM } from "@/lib/kurashi/season";
import { ERABU_PATH } from "@/lib/site";
import type { DistrictId } from "@/lib/town-district/resolve";
import { HousingCard } from "./HousingCard";
import { ChildcareCard, DisasterCard, PopulationCard, PublicFacilitiesCard, SupportCard } from "./OtherCards";
import { TransportCard } from "./TransportCard";

type Chosen = Conditions & { district: DistrictId };

// 03 カルテ（F-03・F-04・4章）。場面の根拠を分野ごとのカードで確かめる。条件は URL パラメータに持つ（F-02）。
// useSearchParams を使うので <Suspense> の中で使う。PC（xl 以上）は左に「わが家の設定」を置く
export function KarteView() {
  const { conditions, setConditions } = useConditions();
  const searchParams = useSearchParams();
  const { district } = conditions;
  if (district === null) return <NoDistrict conditions={conditions} />;

  const chosen = { ...conditions, district };
  const layout = karteLayout(chosen);
  const onDistrictChange = (id: DistrictId) => setConditions({ district: id });
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">わが家のカルテ</h1>
        <p className="text-sm text-ink-muted">{DISTRICT_NAMES[district]}の暮らしの根拠を、出典とともに確かめよう。</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)] xl:gap-6">
        <aside aria-label="わが家の設定" className="hidden xl:block">
          <ConditionsPanel conditions={chosen} onDistrictChange={onDistrictChange} chooseAgainLabel="条件を変える" />
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2 xl:hidden">
            <ConditionChips conditions={chosen} onDistrictChange={onDistrictChange} />
            <ChooseAgainLink conditions={chosen} label="条件を変える" />
          </div>

          {/* 条件がどう並びに反映されたかを、上部の一文で必ず伝える（要件 4章） */}
          <div role="note" aria-label="表示の順番" className="flex flex-col gap-1 rounded-card bg-primary-soft px-4 py-3 text-sm font-bold text-primary">
            {layout.leads.map((lead) => (
              <p key={lead}>{lead}</p>
            ))}
          </div>

          <ScreenDataBoundary fallback={<ScreenSkeleton label="カルテを読み込んでいます" />}>
            <KarteCards cards={layout.cards} conditions={chosen} />
          </ScreenDataBoundary>

          <KarteNavigation conditions={chosen} searchParams={searchParams} />
        </div>
      </div>
    </div>
  );
}

// カードの並びと開閉。最初は1枚目を開く。くらしの場面から #karte-<card> で来たら、そのカードを開いてそこまで移る（F-14）
function KarteCards({ cards, conditions }: { cards: readonly KarteCard[]; conditions: Chosen }) {
  const data = useScreenData();
  const district = data.districts[conditions.district];
  const [open, setOpen] = useState<ReadonlySet<KarteCard>>(() => new Set(cards.slice(0, 1)));
  const cardsKey = cards.join(",");

  useEffect(() => {
    const openFromHash = () => {
      const ids = cardsKey.split(",") as KarteCard[];
      const card = ids.find((id) => window.location.hash === `#${karteCardAnchor(id)}`);
      if (!card) return;
      setOpen((current) => new Set(current).add(card));
      // 開いて中身が出てから移る（閉じたままだと移った先が短く、下のカードが見えてしまう）
      requestAnimationFrame(() => document.getElementById(karteCardAnchor(card))?.scrollIntoView?.({ block: "start" }));
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, [cardsKey]);

  const toggle = (card: KarteCard, isOpen: boolean) =>
    setOpen((current) => {
      if (current.has(card) === isOpen) return current;
      const next = new Set(current);
      if (isOpen) next.add(card);
      else next.delete(card);
      return next;
    });

  const body: Record<KarteCard, ReactNode> = {
    housing: <HousingCard district={district} housing={conditions.housing} />,
    childcare: <ChildcareCard district={district} />,
    transport: <TransportCard district={district} noCar={hasNoCar(conditions)} />,
    disaster: <DisasterCard district={district} />,
    population: <PopulationCard district={district} />,
    public_facilities: <PublicFacilitiesCard district={district} />,
    support: <SupportCard programs={data.supportPrograms} />,
  };

  return (
    <ol aria-label="分野ごとのカード" className="flex flex-col gap-3">
      {cards.map((card) => (
        <li key={card}>
          <details
            id={karteCardAnchor(card)}
            open={open.has(card)}
            onToggle={(event) => toggle(card, event.currentTarget.open)}
            className="group scroll-mt-4 rounded-card border border-line bg-surface shadow-card"
          >
            <summary className="flex min-h-tap cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-lg font-bold [&::-webkit-details-marker]:hidden">
              <h2>{KARTE_CARD_LABELS[card]}</h2>
              <span aria-hidden="true" className="text-ink-muted transition-transform group-open:rotate-90">
                ›
              </span>
            </summary>
            <div className="border-t border-line px-4 py-4">{body[card]}</div>
          </details>
        </li>
      ))}
    </ol>
  );
}

// 下部：地区くらべ・地図と「くらしに戻る」
function KarteNavigation({ conditions, searchParams }: { conditions: Chosen; searchParams: { get(name: string): string | null } }) {
  return (
    <nav aria-label="ほかの見方" className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <ButtonLink href={kurabeHref(conditions, searchParams.get(SEASON_PARAM))} variant="secondary">
          地区くらべ
        </ButtonLink>
        <ButtonLink href={mapHref(conditions, searchParams.get(SEASON_PARAM))} variant="secondary">
          地図
        </ButtonLink>
      </div>
      <Link
        href={kurashiHref(conditions, searchParams)}
        className="inline-flex min-h-tap items-center justify-center gap-1 self-center font-bold text-primary underline underline-offset-4 hover:no-underline"
      >
        <span aria-hidden="true">←</span>
        くらしに戻る
      </Link>
    </nav>
  );
}


function NoDistrict({ conditions }: { conditions: Conditions }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <h1 className="text-2xl font-bold">わが家のカルテ</h1>
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
