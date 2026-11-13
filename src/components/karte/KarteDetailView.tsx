"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ScreenDataBoundary, useScreenData } from "@/components/data/ScreenDataBoundary";
import { useWideScreen } from "@/components/kurashi/useWideScreen";
import { ScreenTabBar } from "@/components/layout/ScreenTabBar";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { ButtonLink } from "@/components/ui/Button";
import { ScreenSkeleton } from "@/components/ui/Skeleton";
import { karteLayout } from "@/lib/conditions/karte-order";
import { CAR_LABELS, DISTRICT_NAMES, HOUSING_LABELS, KARTE_CARD_LABELS, familyLabel, type KarteCard } from "@/lib/conditions/labels";
import { hasNoCar, type Conditions } from "@/lib/conditions/model";
import { useConditions } from "@/lib/conditions/useConditions";
import { houseSrc, propSrc, propSrcSet } from "@/lib/illust/assets";
import { detailTexts, entryNumber, housingKnows, withDistrict, type DetailTexts } from "@/lib/karte/details";
import { transportQuestion } from "@/lib/karte/entries";
import { karteBackHref, shitamiMemoHref } from "@/lib/karte/links";
import { SHITAMI_ITEMS, shitamiItemForCard } from "@/lib/karte/shitami-memo";
import { SEASON_PARAM } from "@/lib/kurashi/season";
import { mapHref } from "@/lib/map/links";
import type { DistrictId } from "@/lib/town-district/resolve";
import { HousingPriceCard, useHousingTab } from "./HousingCard";
import { KarteCardIcon } from "./KarteCardIcon";
import { KartePrintButton } from "./KartePrint";
import { AddToShitamiButton } from "./ShitamiMemo";
import { CARD_PICTURES } from "./KarteEntries";
import { NoDistrict } from "./KarteView";
import { BasisTables, housingBasisRows, otherBasisRows, rentBasisRows, type BasisRow } from "./DetailBasis";
import { NoticeBox, PropIcon } from "./DetailCard";
import { OtherDetailCard, detailTabs, useDetailTab } from "./DetailPanels";

type Chosen = Conditions & { district: DistrictId };

const MAP_IN_CARD: ReadonlySet<KarteCard> = new Set(["childcare", "transport", "disaster"]);

// カルテの詳細のページ（図鑑の1ページ。028 見本 karte-detail-housing.png）。番号・問い・数字・この数字から分かること・
// 現地で確かめたいこと・数字の根拠を、7項目とも同じ形で出す。条件は URL パラメータに持つ（F-02）。<Suspense> の中で使う
export function KarteDetailView({ card }: { card: KarteCard }) {
  const { conditions } = useConditions();
  const { district } = conditions;
  if (district === null) return <NoDistrict conditions={conditions} />;
  return <Detail card={card} conditions={{ ...conditions, district }} />;
}

function Detail({ card, conditions }: { card: KarteCard; conditions: Chosen }) {
  const searchParams = useSearchParams();
  const layout = karteLayout(conditions);
  const texts = detailTexts(card, {
    housing: conditions.housing,
    transportQuestion: transportQuestion(conditions.car),
  });
  const districtName = DISTRICT_NAMES[conditions.district];
  const listHref = karteBackHref(conditions, searchParams);
  const map = mapHref(conditions, searchParams.get(SEASON_PARAM));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
      <nav aria-label="パンくず" className="text-sm">
        <ol className="flex items-center gap-2">
          <li>
            <Link href={listHref} className="inline-flex min-h-tap items-center font-bold text-primary underline-offset-4 hover:underline">
              カルテ一覧
            </Link>
          </li>
          <li aria-hidden="true" className="text-ink-muted">
            /
          </li>
          <li aria-current="page">{KARTE_CARD_LABELS[card]}</li>
        </ol>
      </nav>
        {/* 見出しの右上の「印刷する」（023） */}
        <KartePrintButton conditions={conditions} current={card} />
      </div>

      <header className="flex items-center gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="flex items-center gap-2 text-lg font-bold">
            <span className="flex size-9 items-center justify-center rounded-full bg-gold text-base text-white">
              <span className="sr-only">項目</span>
              {entryNumber(layout.cards, card)}
            </span>
            {KARTE_CARD_LABELS[card]}
          </p>
          <h1 className="text-2xl font-extrabold md:text-3xl">
            <span className="md:hidden">{texts.question.short}</span>
            <span className="hidden md:inline">{texts.question.long}</span>
          </h1>
          <ChosenChips card={card} conditions={conditions} />
        </div>
        <DetailPicture card={card} conditions={conditions} />
      </header>

      <ScreenDataBoundary fallback={<ScreenSkeleton label="カルテを読み込んでいます" />}>
        <DetailBody card={card} conditions={conditions} texts={texts} districtName={districtName} />
      </ScreenDataBoundary>

      {MAP_IN_CARD.has(card) ? (
        // 子育て・学校・交通・防災は「カルテ一覧へ」だけ。地図へは、カードの中の「地図で場所を見る」から、その種類だけにチェックを入れて行く
        // （039 見本。2026-11-12 まさゆきさん。交通・防災は 2026-11-13 まさゆきさん）
        <ButtonLink href={listHref} variant="secondary" className="md:self-start">
          <span aria-hidden="true">←</span>
          カルテ一覧へ
        </ButtonLink>
      ) : (
      <div className="flex flex-col gap-2 md:flex-row-reverse md:gap-4">
        <ButtonLink href={map} className="md:flex-1">
          <PixelIcon icon="icon-map" size="sm" />
          <span className="md:hidden">地図で確かめる</span>
          <span className="hidden md:inline">地図で周辺を確かめる</span>
          <span aria-hidden="true">→</span>
        </ButtonLink>
        <ButtonLink href={listHref} variant="secondary" className="md:flex-1">
          <span aria-hidden="true">←</span>
          <span className="md:hidden">戻る</span>
          <span className="hidden md:inline">カルテ一覧へ</span>
        </ButtonLink>
      </div>
      )}

      <ScreenTabBar current="karte" linkCurrent conditions={conditions} seasonSlug={searchParams.get(SEASON_PARAM)} />
    </div>
  );
}

// 選んだ条件（見本：PC は「選択中：買う・新しめ」、スマホは地区・家族・車の帯）
function ChosenChips({ card, conditions }: { card: KarteCard; conditions: Chosen }) {
  const chosen =
    card === "housing"
      ? HOUSING_LABELS[conditions.housing]
      : card === "transport" && conditions.car !== null
        ? `車${CAR_LABELS[conditions.car]}`
        : card === "childcare"
          ? familyLabel(conditions)
          : null;
  return (
    <>
      {/* PC は見出しの下に地区の札（040 見本 karte-detail-disaster.png。7つの詳細すべて）。スマホは下の条件の帯に地区が出ている */}
      <div className="hidden flex-wrap items-center gap-2 md:flex">
        <p className="flex items-center gap-1.5 rounded-full border border-gold/50 bg-warm-soft px-4 py-1.5 font-bold">
          <PixelIcon icon="icon-pin" size="sm" />
          <span className="sr-only">地区：</span>
          {DISTRICT_NAMES[conditions.district]}
        </p>
        {chosen && (
          <p className="flex items-center gap-2 rounded-button bg-pixel-sky/60 px-4 py-2 font-bold">
            {/* 子育て・学校は家族の印（039 見本） */}
            {card === "childcare" ? <PropIcon prop="childcare-chip-family" className="size-6" /> : <KarteCardIcon card={card} size="sm" />}
            選択中：{chosen}
          </p>
        )}
      </div>
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-button bg-pixel-sky/60 px-3 py-1.5 text-xs md:hidden">
        <PixelIcon icon="icon-pin" size="sm" />
        {DISTRICT_NAMES[conditions.district]}
        <span aria-hidden="true" className="text-ink-muted">
          |
        </span>
        <PixelIcon icon="icon-family" size="sm" />
        {familyLabel(conditions)}
        {conditions.car !== null && (
          <>
            <span aria-hidden="true" className="text-ink-muted">
              |
            </span>
            <PixelIcon icon="icon-car" size="sm" />車{CAR_LABELS[conditions.car]}
          </>
        )}
      </p>
    </>
  );
}

function DetailPicture({ card, conditions }: { card: KarteCard; conditions: Chosen }) {
  // スマホの見本には見出しの絵がない（問いと条件の札を幅いっぱいに出す）
  const className = "hidden h-auto w-48 shrink-0 select-none md:block md:w-72";
  if (card === "housing") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- 静的書き出しなので WebP をそのまま出す
      <img
        src={houseSrc(conditions.housing, 320)}
        srcSet={`${houseSrc(conditions.housing, 320)} 320w, ${houseSrc(conditions.housing, 640)} 640w`}
        sizes="288px"
        alt=""
        draggable={false}
        className={className}
      />
    );
  }
  const prop = CARD_PICTURES[card];
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 静的書き出しなので WebP をそのまま出す
    <img src={propSrc(prop, 240)} srcSet={propSrcSet(prop)} sizes="288px" alt="" draggable={false} className={className} />
  );
}

function DetailBody({
  card,
  conditions,
  texts,
  districtName,
}: {
  card: KarteCard;
  conditions: Chosen;
  texts: DetailTexts;
  districtName: string;
}) {
  const data = useScreenData();
  const searchParams = useSearchParams();
  const district = data.districts[conditions.district];
  const noCar = hasNoCar(conditions);
  const [housingTab, setHousingTab] = useHousingTab(conditions.housing);
  const tabs = card === "housing" ? [] : detailTabs(card, { district, supportPrograms: data.supportPrograms, noCar });
  const [otherTab, setOtherTab] = useDetailTab(tabs);
  const knows =
    texts.knows && card === "housing" && housingTab.category ? { ...texts.knows, text: housingKnows(housingTab.category) } : texts.knows;
  const shitamiItem = shitamiItemForCard(card, conditions);
  const memoHref = shitamiMemoHref(conditions, searchParams.get(SEASON_PARAM));

  return (
    <div className="flex flex-col gap-4">
      {card === "housing" ? (
        <HousingPriceCard district={district} rent={data.rent} housing={conditions.housing} tab={housingTab} onTabChange={setHousingTab} />
      ) : (
        <OtherDetailCard
          card={card}
          tabs={tabs}
          tab={otherTab}
          onTabChange={setOtherTab}
          district={district}
          supportPrograms={data.supportPrograms}
          noCar={noCar}
        />
      )}

      {/* 子育て・学校は「この数字から分かること」を出さず、「現地で確かめたいこと」を幅いっぱいにする（2026-11-12 まさゆきさん） */}
      <div className={`grid gap-4 ${knows ? "md:grid-cols-2" : ""}`}>
        {knows && (
          <Box title="この数字から分かること" icon="icon-bulb" tone="bg-pixel-sky/60">
            <p className="font-bold">{withDistrict(knows.text, districtName)}</p>
            <div className="flex gap-2 rounded-button bg-warm-soft p-3">
              <PixelIcon icon="icon-sprout" />
              <p className="flex flex-col text-sm">
                <span className="font-bold text-kind-local">{knows.tip.title}</span>
                <span>{knows.tip.body}</span>
              </p>
            </div>
          </Box>
        )}
        <Box title={texts.checkTitle} icon="icon-checklist" tone="bg-warm-soft">
          <div className="flex items-start gap-3">
            {/* 確かめたいことは箇条書きにし、現地で使うものは下見プランに入れる（036。2026-11-10 まさゆきさん：
                押せても残らないチェックの箱と、下見プランのどちらに印を付けるか迷うため。印刷の空欄の箱は残す） */}
            <ul className="flex flex-1 list-disc flex-col gap-2 pl-5">
              {texts.checks.map((check) => (
                <li key={check}>{check}</li>
              ))}
            </ul>
            {/* eslint-disable-next-line @next/next/no-img-element -- 静的書き出しなので WebP をそのまま出す */}
            <img
              src={propSrc("karte-check", 240)}
              srcSet={propSrcSet("karte-check")}
              sizes="128px"
              alt=""
              loading="lazy"
              draggable={false}
              className="hidden h-auto w-32 shrink-0 select-none sm:block"
            />
          </div>
          {shitamiItem && (
            <div className="flex flex-col gap-2 border-t border-line pt-3">
              <p className="text-sm">
                <span className="font-bold">下見プラン：</span>
                {SHITAMI_ITEMS[shitamiItem].title}
              </p>
              <AddToShitamiButton district={conditions.district} item={shitamiItem} memoHref={memoHref} />
            </div>
          )}
        </Box>
      </div>

      {texts.notice && <NoticeBox title={texts.notice} className="items-center md:px-4 md:[&_p]:text-base" />}

      <Basis
        rows={
          card === "housing"
            ? housingTab.category === null
              ? rentBasisRows(data.rent, district.housingTenure, districtName)
              : housingBasisRows(district, districtName, housingTab.category)
            : otherBasisRows(card, [otherTab])
        }
        note={texts.basisNote}
        // 子育て・学校は「〇〇の出典を見る」（〇〇は今のタブの名前。039 見本）、防災は「出典・更新日を見る」（040 見本）の閉じた欄
        title={card === "childcare" ? `${otherTab.label}の出典を見る` : card === "disaster" ? "出典・更新日を見る" : null}
        icon={card === "childcare" ? "icon-book" : "icon-document"}
      />
    </div>
  );
}

// 「この数字から分かること」「現地で確かめたいこと」の箱。スマホは開閉でき（最初は開いている）、PC はいつも開いている（見本）
function Box({ title, icon, tone, children }: { title: string; icon: "icon-bulb" | "icon-checklist"; tone: string; children: ReactNode }) {
  const wide = useWideScreen();
  const [open, setOpen] = useState(true);
  return (
    <details
      open={wide || open}
      onToggle={(event) => {
        if (!wide) setOpen(event.currentTarget.open);
      }}
      className="group rounded-card border border-line bg-surface shadow-card"
    >
      <summary
        className={`flex min-h-tap cursor-pointer list-none items-center gap-2 rounded-t-card px-4 py-2 font-bold lg:cursor-default [&::-webkit-details-marker]:hidden ${tone}`}
        onClick={(event) => {
          if (wide) event.preventDefault();
        }}
      >
        <PixelIcon icon={icon} size="sm" />
        <h2 className="flex-1">{title}</h2>
        <span aria-hidden="true" className="text-ink-muted transition-transform group-open:rotate-180 lg:hidden">
          ⌄
        </span>
      </summary>
      <div className="flex flex-col gap-3 p-4">{children}</div>
    </details>
  );
}

// 「数字の根拠を見る」（見本）：出典・集計対象・対象期間・取得日。PC は最初から開き、スマホは閉じておく
function Basis({
  rows,
  note,
  title,
  icon,
}: {
  rows: BasisRow[][];
  note?: string;
  title: string | null;
  icon: "icon-document" | "icon-book";
}) {
  const wide = useWideScreen();
  const [open, setOpen] = useState<boolean | null>(null);
  return (
    <details
      open={open ?? (title === null && wide)}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="group rounded-card border border-line bg-surface shadow-card"
    >
      <summary className="flex min-h-tap cursor-pointer list-none items-center gap-2 px-4 py-2 font-bold text-primary [&::-webkit-details-marker]:hidden">
        <PixelIcon icon={icon} size="sm" />
        <h2 className="flex-1">
          {title ?? (
            <>
              <span className="md:hidden">出典・対象期間・取得日</span>
              <span className="hidden md:inline">数字の根拠を見る</span>
            </>
          )}
        </h2>
        <span aria-hidden="true" className="transition-transform group-open:rotate-180">
          ⌄
        </span>
      </summary>
      <div className="flex flex-col gap-2 px-4 pb-4">
        <BasisTables rows={rows} note={note} />
      </div>
    </details>
  );
}
