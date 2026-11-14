"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ScreenDataBoundary, useScreenData } from "@/components/data/ScreenDataBoundary";
import { useWideScreen } from "@/components/kurashi/useWideScreen";
import { ScreenTabBar } from "@/components/layout/ScreenTabBar";
import { DistrictPinIcon } from "@/components/illust/DistrictPinIcon";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { ButtonLink } from "@/components/ui/Button";
import { ScreenSkeleton } from "@/components/ui/Skeleton";
import { karteLayout } from "@/lib/conditions/karte-order";
import { CAR_LABELS, DISTRICT_NAMES, HOUSING_LABELS, KARTE_CARD_LABELS, familyLabel, type KarteCard } from "@/lib/conditions/labels";
import { hasNoCar, type Conditions } from "@/lib/conditions/model";
import { useConditions } from "@/lib/conditions/useConditions";
import { houseSrc, propSrc, propSrcSet } from "@/lib/illust/assets";
import { detailTexts, entryNumber, type DetailTexts } from "@/lib/karte/details";
import { transportQuestion } from "@/lib/karte/entries";
import { karteBackHref, shitamiMemoHref } from "@/lib/karte/links";
import { SHITAMI_ITEMS, shitamiItemForCard } from "@/lib/karte/shitami-memo";
import { findIida } from "@/lib/kurabe/city";
import { kurabeHref } from "@/lib/kurabe/links";
import { SEASON_PARAM } from "@/lib/kurashi/season";
import { mapHref } from "@/lib/map/links";
import type { DistrictId } from "@/lib/town-district/resolve";
import { HousingCards, HousingSearchCard } from "./HousingCard";
import { KarteCardIcon } from "./KarteCardIcon";
import { KartePrintButton } from "./KartePrint";
import { AddToShitamiButton } from "./ShitamiMemo";
import { CARD_PICTURES } from "./KarteEntries";
import { NoDistrict } from "./KarteView";
import { BasisTables, housingBasisRows, otherBasisRows, rentBasisRows, type BasisRow } from "./DetailBasis";
import { NoticeBox, PropIcon } from "./DetailCard";
import { OtherDetailCard, detailTabs, useDetailTab } from "./DetailPanels";
import { SupportBeforeApply } from "./SupportFinder";

type Chosen = Conditions & { district: DistrictId };

// カルテの詳細のページ（図鑑の1ページ。028 見本 karte-detail-housing.png）。番号・問い・数字・
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

      {/* 下のボタンは7つの詳細とも「カルテ一覧へ」だけ。地図へは、カードの中の「地図で場所を見る」「地図で周辺を確かめる」から行く
          （039 見本。2026-11-12・2026-11-13 まさゆきさん。公共施設・人口・支援制度は地図に出す場所がないのでボタンを出さない） */}
      <ButtonLink href={listHref} variant="secondary" className="md:self-start">
        <span aria-hidden="true">←</span>
        カルテ一覧へ
      </ButtonLink>

      <ScreenTabBar current="karte" linkCurrent conditions={conditions} seasonSlug={searchParams.get(SEASON_PARAM)} />
    </div>
  );
}

// 選んだ条件（見本：PC は「選択中：車1台」、住まいだけ「選んだ条件：買う・新しめ」（040 見本）、スマホは地区・家族・車の帯）
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
          <DistrictPinIcon />
          {/* 支援制度は市全体の制度なので、地区だけの制度と受け取られないように「飯田市全体」（040 見本） */}
          <span className="sr-only">{card === "support" ? "対象：" : "地区："}</span>
          {card === "support" ? "飯田市全体" : DISTRICT_NAMES[conditions.district]}
        </p>
        {chosen && (
          <p className="flex items-center gap-2 rounded-button bg-pixel-sky/60 px-4 py-2 font-bold">
            {/* 子育て・学校は家族の印（039 見本） */}
            {card === "childcare" ? <PropIcon prop="childcare-chip-family" className="size-6" /> : <KarteCardIcon card={card} size="sm" />}
            {card === "housing" ? "選んだ条件" : "選択中"}：{chosen}
          </p>
        )}
      </div>
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-button bg-pixel-sky/60 px-3 py-1.5 text-xs md:hidden">
        <DistrictPinIcon className="size-4" />
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
  const iida = findIida(data);
  const tabs = card === "housing" ? [] : detailTabs(card, { district, noCar, iida });
  const [otherTab, setOtherTab] = useDetailTab(tabs);
  const shitamiItem = shitamiItemForCard(card, conditions);
  const memoHref = shitamiMemoHref(conditions, searchParams.get(SEASON_PARAM));
  const map = mapHref(conditions, searchParams.get(SEASON_PARAM));

  const checks = (
      <Box title={texts.checkTitle} inset={card === "housing"}>
        {/* 絵は箇条書き2〜3行と同じくらいの高さにし、箇条書きを絵の真ん中にそろえる（下に空きが出ないように。2026-11-13） */}
        <div className="flex items-center gap-3">
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
            sizes="96px"
            alt=""
            loading="lazy"
            draggable={false}
            className="hidden h-auto w-24 shrink-0 select-none sm:block"
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
  );

  return (
    <div className="flex flex-col gap-4">
      {card === "housing" ? (
        <HousingCards district={district} rent={data.rent} housing={conditions.housing} />
      ) : (
        <OtherDetailCard
          card={card}
          tabs={tabs}
          tab={otherTab}
          onTabChange={setOtherTab}
          district={district}
          supportPrograms={data.supportPrograms}
          noCar={noCar}
          iida={iida}
          compareCityHref={cityCompareHref(kurabeHref(conditions, searchParams.get(SEASON_PARAM)))}
        />
      )}

      {card === "housing" ? (
        // 住まいは「物件を探す・下見する」のカードの中に「下見で確かめたいこと」を出す（040 見本）
        <HousingSearchCard mapHref={map}>{checks}</HousingSearchCard>
      ) : texts.checkNote ? (
        <SupportBeforeApply title={texts.checkTitle} text={texts.checkNote} />
      ) : (
        checks
      )}

      {texts.notice && <NoticeBox title={texts.notice} className="items-center md:px-4 md:[&_p]:text-base" />}

      <Basis
        rows={
          card === "housing"
            ? [
                ...(conditions.housing === "rent" ? rentBasisRows(data.rent, district.housingTenure, districtName) : []),
                ...housingBasisRows(district, districtName),
              ]
            : otherBasisRows(card, [otherTab], data.supportPrograms)
        }
        note={texts.basisNote}
        // 子育て・学校は「〇〇の出典を見る」（〇〇は今のタブの名前。039 見本）、防災は「出典・更新日を見る」、人口は「出典・調査時点を見る」（040 見本）の閉じた欄
        title={
          card === "childcare"
            ? `${otherTab.label}の出典を見る`
            : card === "housing"
              ? "出典・集計条件を見る"
              : card === "disaster" || card === "public_facilities"
              ? "出典・更新日を見る"
              : card === "support"
                ? "出典・確認日を見る"
                : card === "population"
                  ? "出典・調査時点を見る"
                  : null
        }
        icon={card === "childcare" ? "icon-book" : "icon-document"}
      />
    </div>
  );
}

// 「現地で確かめたいこと」の箱。スマホは開閉でき（最初は開いている）、PC はいつも開いている（見本）
// inset は別のカードの中に置くとき（住まいの「物件を探す・下見する」。040 見本）。影を付けず、枠を薄くする
function Box({ title, inset = false, children }: { title: string; inset?: boolean; children: ReactNode }) {
  const wide = useWideScreen();
  const [open, setOpen] = useState(true);
  return (
    <details
      open={wide || open}
      onToggle={(event) => {
        if (!wide) setOpen(event.currentTarget.open);
      }}
      className={`group rounded-card border border-line bg-surface ${inset ? "" : "shadow-card"}`}
    >
      <summary
        className={`flex min-h-tap cursor-pointer list-none items-center gap-2 rounded-t-card px-4 py-2 font-bold lg:cursor-default [&::-webkit-details-marker]:hidden bg-warm-soft`}
        onClick={(event) => {
          if (wide) event.preventDefault();
        }}
      >
        <PixelIcon icon="icon-checklist" size="sm" />
        <h2 className="flex-1">{title}</h2>
        <span aria-hidden="true" className="text-ink-muted transition-transform group-open:rotate-180 lg:hidden">
          ⌄
        </span>
      </summary>
      <div className="flex flex-col gap-3 p-4">{children}</div>
    </details>
  );
}

// 出典・対象期間・取得日の欄。7つの詳細とも最初は閉じておく（2026-11-13 まさゆきさん。交通だけ PC で開いていたのをそろえた）
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
  return (
    <details className="group rounded-card border border-line bg-surface shadow-card">
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

// 防災の「いまの街とくらべる →」（041）。条件と季節を持ったまま地区くらべの「いまの街と」を開く
function cityCompareHref(kurabe: string): string {
  return `${kurabe}${kurabe.includes("?") ? "&" : "?"}t=city`;
}
