"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ScreenDataBoundary, useScreenData } from "@/components/data/ScreenDataBoundary";
import { useWideScreen } from "@/components/kurashi/useWideScreen";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { ButtonLink } from "@/components/ui/Button";
import { ScreenSkeleton } from "@/components/ui/Skeleton";
import { karteLayout } from "@/lib/conditions/karte-order";
import { CAR_LABELS, DISTRICT_NAMES, HOUSING_LABELS, KARTE_CARD_LABELS, familyLabel, type KarteCard } from "@/lib/conditions/labels";
import { hasNoCar, type Conditions } from "@/lib/conditions/model";
import { useConditions } from "@/lib/conditions/useConditions";
import type { DataState, DistrictData, SourceInfo } from "@/lib/data/screen-data";
import { formatJaDate, formatQuarterRange } from "@/lib/format";
import { houseSrc, propSrc, propSrcSet } from "@/lib/illust/assets";
import { detailTexts, entryNumber, housingKnows, withDistrict, type DetailTexts } from "@/lib/karte/details";
import { MARKET_CATEGORY_PHRASES, transportQuestion } from "@/lib/karte/entries";
import { karteBackHref } from "@/lib/karte/links";
import { SEASON_PARAM } from "@/lib/kurashi/season";
import { mapHref } from "@/lib/map/links";
import type { DistrictId } from "@/lib/town-district/resolve";
import { HousingPriceCard, useHousingTab, type HousingTab } from "./HousingCard";
import { CARD_PICTURES, KARTE_CARD_ICONS } from "./KarteEntries";
import { NoDistrict } from "./KarteView";
import { ChildcareCard, DisasterCard, PopulationCard, PublicFacilitiesCard, SupportCard } from "./OtherCards";
import { TransportCard } from "./TransportCard";

type Chosen = Conditions & { district: DistrictId };

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
      {chosen && (
        <p className="hidden items-center gap-2 self-start rounded-button bg-pixel-sky/60 px-4 py-2 font-bold md:flex">
          <PixelIcon icon={KARTE_CARD_ICONS[card]} size="sm" />
          選択中：{chosen}
        </p>
      )}
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
  const district = data.districts[conditions.district];
  const [tab, setTab] = useHousingTab(conditions.housing);

  const main: Record<KarteCard, ReactNode> = {
    housing: <HousingPriceCard district={district} housing={conditions.housing} tab={tab} onTabChange={setTab} />,
    childcare: <ChildcareCard district={district} />,
    transport: <TransportCard district={district} noCar={hasNoCar(conditions)} />,
    disaster: <DisasterCard district={district} />,
    population: <PopulationCard district={district} />,
    public_facilities: <PublicFacilitiesCard district={district} />,
    support: <SupportCard programs={data.supportPrograms} />,
  };
  const knows = card === "housing" && tab.category ? housingKnows(tab.category) : texts.knows;

  return (
    <div className="flex flex-col gap-4">
      {card === "housing" ? (
        main.housing
      ) : (
        <section aria-label={KARTE_CARD_LABELS[card]} className="rounded-card border border-line bg-surface p-4 shadow-card md:p-5">
          {main[card]}
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Box title="この数字から分かること" icon="icon-bulb" tone="bg-pixel-sky/60">
          <p className="font-bold">{withDistrict(knows, districtName)}</p>
          <div className="flex gap-2 rounded-button bg-warm-soft p-3">
            <PixelIcon icon="icon-sprout" />
            <p className="flex flex-col text-sm">
              <span className="font-bold text-kind-local">{texts.tip.title}</span>
              <span>{texts.tip.body}</span>
            </p>
          </div>
        </Box>
        <Box title={texts.checkTitle} icon="icon-checklist" tone="bg-warm-soft">
          <div className="flex items-start gap-3">
            <ul className="flex flex-1 flex-col">
              {texts.checks.map((check) => (
                <li key={check}>
                  {/* 押せるが、どこにも保存しない（条件は URL だけに持つ。F-02） */}
                  <label className="flex min-h-tap cursor-pointer items-center gap-3">
                    <input type="checkbox" className="size-5 shrink-0 accent-primary" />
                    {check}
                  </label>
                </li>
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
        </Box>
      </div>

      <Basis card={card} district={district} districtName={districtName} tab={tab} note={texts.basisNote} />
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
  card,
  district,
  districtName,
  tab,
  note,
}: {
  card: KarteCard;
  district: DistrictData;
  districtName: string;
  tab: HousingTab;
  note?: string;
}) {
  const wide = useWideScreen();
  const [open, setOpen] = useState<boolean | null>(null);
  const rows = basisRows(card, district, districtName, tab);
  return (
    <details
      open={open ?? wide}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="group rounded-card border border-line bg-surface shadow-card"
    >
      <summary className="flex min-h-tap cursor-pointer list-none items-center gap-2 px-4 py-2 font-bold text-primary [&::-webkit-details-marker]:hidden">
        <PixelIcon icon="icon-document" size="sm" />
        <h2 className="flex-1">
          <span className="md:hidden">出典・対象期間・取得日</span>
          <span className="hidden md:inline">数字の根拠を見る</span>
        </h2>
        <span aria-hidden="true" className="transition-transform group-open:rotate-180">
          ⌄
        </span>
      </summary>
      <div className="flex flex-col gap-2 px-4 pb-4">
        {rows.length === 0 ? (
          <p className="text-sm">データ未取得</p>
        ) : (
          rows.map((group, index) => (
            <table key={index} className="w-full text-left text-sm">
              <tbody className="divide-y divide-line">
                {group.map(([label, value]) => (
                  <tr key={label}>
                    <th scope="row" className="w-28 bg-kinari px-3 py-1.5 font-normal text-ink-muted">
                      {label}
                    </th>
                    <td className="px-3 py-1.5">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))
        )}
        {note && <p className="text-xs text-ink-muted">{note}</p>}
      </div>
    </details>
  );
}

type BasisRow = readonly [label: string, value: string];

function sourceRows(source: SourceInfo, period?: string): BasisRow[] {
  const date = source.checkedOn ?? source.fetchedOn;
  return [
    ["出典", `${source.publisher}「${source.name}」`],
    ["対象", period ?? source.periodLabel ?? "記載なし"],
    ...(date ? [[source.checkedOn ? "確認日" : "取得日", formatJaDate(date)] as const] : []),
  ];
}

// 項目ごとの出典の表。同じ出典は1回だけ出す。住まいは、今見ているタブの集計対象と期間を出す
export function basisRows(card: KarteCard, district: DistrictData, districtName: string, tab: HousingTab): BasisRow[][] {
  if (card === "housing") {
    // 借りるの「選んだ家」（家賃の情報なし）は、となりのタブと同じ相場の出典を出す
    const category = tab.category ?? "house_built_within_20y";
    const state = district.market[category];
    if (state.status === "unavailable") return [];
    const period = state.status === "available" ? formatQuarterRange(state.value.periodFrom, state.value.periodTo) : undefined;
    const [source, , ...dates] = sourceRows(state.source, period);
    return [
      [
        source,
        ["集計対象", `${districtName}・${MARKET_CATEGORY_PHRASES[category]}`],
        ["対象期間", period ?? state.source.periodLabel ?? "記載なし"],
        ...dates,
      ],
    ];
  }
  if (card === "support")
    return [
      [
        ["出典", "飯田市公式サイト（制度ごとのページ）"],
        ["確認日", "制度ごとに記載"],
      ],
    ];
  const states: Record<Exclude<KarteCard, "housing" | "support">, readonly DataState<unknown>[]> = {
    childcare: [
      district.elementarySchoolDistricts,
      district.juniorHighSchoolDistricts,
      district.schools,
      district.childcare,
      district.afterSchoolClubs,
    ],
    transport: [district.busStops, district.trainStations, district.trainDepartures, district.busOuting, district.trainOuting],
    disaster: [district.evacuationSites],
    population: [district.population],
    public_facilities: [district.publicFacilities],
  };
  const seen = new Set<string>();
  const groups: BasisRow[][] = [];
  for (const state of states[card]) {
    if (state.status === "unavailable" || seen.has(state.source.id)) continue;
    seen.add(state.source.id);
    groups.push(sourceRows(state.source));
  }
  return groups;
}
