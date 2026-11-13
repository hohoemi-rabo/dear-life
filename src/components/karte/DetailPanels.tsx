"use client";

import { useId, useState, type ReactNode } from "react";
import { DataStateMessage } from "@/components/data/DataStateMessage";
import { usePrintMode } from "@/components/print/PrintMode";
import { GofreelyPanel } from "@/components/data/GofreelyPanel";
import { SourceNote } from "@/components/ui/SourceNote";
import { DISTRICT_NAMES, type KarteCard } from "@/lib/conditions/labels";
import type {
  DataState,
  DistrictData,
  Facility,
  Outing,
  StationTrips,
  SupportProgram,
} from "@/lib/data/screen-data";
import { formatJaDate, formatServiceTime } from "@/lib/format";
import type { PropId } from "@/lib/illust/assets";
import { DETAIL_NOTICES } from "@/lib/karte/details";
import { districtSchoolZones } from "@/lib/karte/school-zones";
import { DISASTER_TAB_HAZARDS, disasterTabHazards } from "@/lib/karte/evacuation";
import { ageShares, groupBySubkind, HAZARD_LABELS } from "@/lib/karte/facilities";
import { ERRAND_STATIONS } from "@/lib/karte/errands";
import { busiestStation, hasServiceTimes, trainTrips, type StationTripsRow } from "@/lib/karte/train";
import { busReachDateNote, busReachSentence } from "@/lib/transit/bus-reach";
import { NOTICES } from "@/lib/notices";
import { BigCount, DetailFigure, DetailPicture, DetailTabs, NoticeBox, type DetailTabItem } from "./DetailCard";
import { ErrandsHead, ErrandsTable } from "./ErrandsTable";
import { DISASTER_TAB_ICONS, EvacuationFinder, EvacuationPrintList, HazardMapBand } from "./EvacuationFinder";
import { ChildcareFacilityPanel } from "./ChildcareFacilities";
import { FacilityMapLink, SchoolZonePanel } from "./SchoolZones";

// 住まい以外の6つの詳細のカード（028。住まいの見本 karte-detail-housing.png と同じ形）。
// 上に絵と大きい数字、注意書き、タブ。タブの下に、そのタブの一覧を出す。出典・対象・確認日は下の「数字の根拠」にまとめる
export type OtherCard = Exclude<KarteCard, "housing">;

export type DetailTab = DetailTabItem & {
  // 「数字の根拠」に出す出典（このタブで使っているデータ）
  states: readonly DataState<unknown>[];
};

const SUPPORT_CATEGORIES: readonly SupportProgram["category"][] = ["移住", "住まい", "子育て", "その他"];

// 項目ごとのタブ。タブを持たない人口・公共施設は1つだけ（タブの列は出さない）。
// 交通は、車0台なら冬のおでかけを最初に開く
export function detailTabs(
  card: OtherCard,
  { district, supportPrograms, noCar }: { district: DistrictData; supportPrograms: readonly SupportProgram[]; noCar: boolean },
): DetailTab[] {
  switch (card) {
    case "childcare":
      return [
        {
          id: "districts",
          label: "通う学校（学区）",
          icon: "icon-school",
          prop: "childcare-tab-zone",
          // 通う学校は市の通学区域の規則の別表から出す（039）
          states: [district.schoolZones],
        },
        // 「地区の学校」：学区の学校の数と、地区にある学校（高校なども入る）の数を取り違えないように（039）
        { id: "schools", label: "地区の学校", icon: "icon-school", prop: "childcare-tab-schools", states: [district.schools] },
        { id: "childcare", label: "保育園など", icon: "icon-house", prop: "childcare-tab-nursery", states: [district.childcare] },
        { id: "clubs", label: "放課後クラブ", icon: "icon-family", prop: "childcare-tab-clubs", states: [district.afterSchoolClubs] },
      ];
    case "transport": {
      const hasStation = district.trainStations.status !== "none";
      const bus: DetailTab = { id: "bus", label: "バス停", icon: "icon-pin", illust: "bus", states: [district.busStops] };
      const train: DetailTab = {
        id: "train",
        label: "電車",
        icon: "icon-transport",
        illust: "train",
        states: hasStation ? [district.trainStations, trainTrips(district)] : [district.trainStations],
      };
      // 行ける場所（買い物・病院・診療所・市役所・学校・駅。地区ごと。036・037・038）。車0台なら最初に開く
      const errands: DetailTab = {
        id: "errands",
        label: "行ける場所",
        icon: "icon-transport",
        illust: "errands",
        states: [
          district.busErrands,
          district.clinicCount,
          ...(ERRAND_STATIONS[district.id] === null ? [] : [trainTrips(district)]),
          district.schools,
        ],
      };
      if (!noCar) return [bus, train, errands];
      const outing: DetailTab = {
        id: "outing",
        label: "冬のおでかけ",
        icon: "icon-winter",
        illust: "outing",
        states: hasStation ? [district.busOuting, district.trainOuting] : [district.busOuting],
      };
      return [errands, outing, bus, train];
    }
    case "disaster": {
      // 災害の種類のタブ（040 見本）。「すべて」はなく、最初は洪水。件数はタブではなく一覧の見出しの右に出す
      const state = district.evacuationSites;
      const hazards = state.status === "available" ? disasterTabHazards(state.value) : DISASTER_TAB_HAZARDS.slice(0, 1);
      return hazards.map((hazard) => ({
        id: hazard,
        label: HAZARD_LABELS[hazard],
        icon: "icon-disaster" as const,
        prop: DISASTER_TAB_ICONS[hazard],
        states: [state],
      }));
    }
    case "population":
      return [{ id: "all", label: "人口", icon: "icon-population", states: [district.population] }];
    case "public_facilities":
      return [{ id: "all", label: "公共施設", icon: "icon-public", states: [district.publicFacilities] }];
    case "support": {
      const all: DetailTab = { id: "all", label: "すべて", icon: "icon-support", states: [] };
      if (supportPrograms.length === 0) return [all];
      const categories = SUPPORT_CATEGORIES.filter((category) => supportPrograms.some((program) => program.category === category));
      return [
        { ...all, count: supportPrograms.length },
        ...categories.map((category) => ({
          id: category,
          label: category,
          icon: "icon-support" as const,
          count: supportPrograms.filter((program) => program.category === category).length,
          states: [],
        })),
      ];
    }
  }
}

// 今のタブ。データが変わってタブがなくなったら最初のタブに戻す
// 印刷（023）で並べるタブ。支援制度は「すべて」に全部入っているので、種類ごとのタブは同じものの繰り返しになるため出さない。
// 防災は1つ目のタブの場所で、地区の避難場所を全部1つの一覧にして出す（040）
export function printTabs(card: OtherCard, tabs: readonly DetailTab[]): readonly DetailTab[] {
  return card === "disaster" || card === "support" ? tabs.slice(0, 1) : tabs;
}

export function useDetailTab(tabs: readonly DetailTab[]): [DetailTab, (id: string) => void] {
  const [id, setId] = useState<string | null>(null);
  return [tabs.find((tab) => tab.id === id) ?? tabs[0], setId];
}

const CARD_LABELS: Readonly<Record<OtherCard, string>> = {
  childcare: "子育て・学校",
  transport: "交通",
  disaster: "防災",
  population: "人口",
  public_facilities: "公共施設",
  support: "支援制度",
};

type PanelContent = {
  picture: PropId;
  title: ReactNode;
  figure: ReactNode;
  // 絵・見出し・大きい数字の代わりに出す、そのタブだけの見出し（交通の「行ける場所」。038 見本）
  head?: ReactNode;
  notice?: { title: string; body?: string };
  list?: ReactNode;
};

export function OtherDetailCard({
  card,
  tabs,
  tab,
  onTabChange,
  district,
  supportPrograms,
  noCar,
}: {
  card: OtherCard;
  tabs: readonly DetailTab[];
  tab: DetailTab;
  onTabChange: (id: string) => void;
  district: DistrictData;
  supportPrograms: readonly SupportProgram[];
  noCar: boolean;
}) {
  const panelId = useId();
  if (card === "disaster") {
    // 防災はハザードマップの帯と「災害の種類から避難先を探す」の箱（040 見本）
    return (
      <>
        <HazardMapBand />
        <EvacuationFinder state={district.evacuationSites} tabs={tabs} selectedId={tab.id} onSelect={onTabChange} />
      </>
    );
  }
  const content = panelContent(card, tab.id, { district, supportPrograms, noCar });
  const tabRow = tabs.length > 1 && (
    <DetailTabs label={`${CARD_LABELS[card]}の見る範囲`} tabs={tabs} selectedId={tab.id} panelId={panelId} onSelect={onTabChange} />
  );
  // 交通・子育て・学校はタブをカードの上に出す（038・039 見本。2026-11-12 まさゆきさん：タブを変えるとカードの頭もタブごとに変わる）。ほかの項目は今のまま
  const tabsAbove = card === "transport" || card === "childcare";
  return (
    <>
      {tabsAbove && tabRow}
      <section aria-label={CARD_LABELS[card]} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card md:p-5">
        <div id={panelId} role="tabpanel" aria-label={tab.label} className="flex flex-col gap-3">
          <PanelHead content={content} />
        </div>
        {!tabsAbove && tabRow}
        {content.list}
        {card === "transport" && <TransportMapLink tabId={tab.id} district={district} />}
      </section>
    </>
  );
}

// 交通のタブの「地図で場所を見る」（子育て・学校と同じ形。040）。バス停のタブはバス停だけ、電車のタブは駅だけ、
// 行ける場所・冬のおでかけのタブは乗る場所のバス停と駅の両方にチェックを入れて地図を開く（2026-11-13 まさゆきさん）。
// その地区に点がないタブ（伊賀良の電車など）には出さない
function TransportMapLink({ tabId, district }: { tabId: string; district: DistrictData }) {
  const hasPoints = (state: DataState<readonly Facility[]>) => state.status === "available" && state.value.length > 0;
  if (tabId === "bus") return hasPoints(district.busStops) ? <FacilityMapLink layer="bus_stops" /> : null;
  if (tabId === "train") return hasPoints(district.trainStations) ? <FacilityMapLink layer="train_stations" /> : null;
  return hasPoints(district.busStops) || hasPoints(district.trainStations) ? <FacilityMapLink layer="transit" /> : null;
}

// 1つのタブの中身をタブの列なしで出す（印刷。023）
export function OtherTabPanel({
  card,
  tab,
  district,
  supportPrograms,
  noCar,
}: {
  card: OtherCard;
  tab: DetailTab;
  district: DistrictData;
  supportPrograms: readonly SupportProgram[];
  noCar: boolean;
}) {
  if (card === "disaster") {
    return (
      <>
        <HazardMapBand />
        <EvacuationPrintList state={district.evacuationSites} />
      </>
    );
  }
  const content = panelContent(card, tab.id, { district, supportPrograms, noCar });
  return (
    <>
      <PanelHead content={content} />
      {content.list}
    </>
  );
}

function PanelHead({ content }: { content: PanelContent }) {
  return (
    <div className="flex break-inside-avoid flex-col gap-3">
      {content.head ?? (
        <DetailFigure picture={<DetailPicture asset={content.picture} />} title={content.title}>
          {content.figure}
        </DetailFigure>
      )}
      {content.notice && <NoticeBox title={content.notice.title} body={content.notice.body} className="md:ml-[9.25rem]" />}
    </div>
  );
}

function panelContent(
  // 防災は panelContent を通さず、EvacuationFinder で出す（040）
  card: Exclude<OtherCard, "disaster">,
  tabId: string,
  { district, supportPrograms, noCar }: { district: DistrictData; supportPrograms: readonly SupportProgram[]; noCar: boolean },
): PanelContent {
  switch (card) {
    case "childcare":
      return childcareContent(tabId, district);
    case "transport":
      return transportContent(tabId, district, noCar);
    case "population":
      return populationContent(district.population);
    case "public_facilities":
      return publicContent(district.publicFacilities);
    case "support":
      return supportContent(tabId, supportPrograms);
  }
}

// 値があれば数を、なければ「該当なし／データ未取得」を出す
function countOrMessage<T>(state: DataState<readonly T[]>, unit: string, after?: (items: readonly T[]) => ReactNode): ReactNode {
  if (state.status !== "available") return <DataStateMessage state={state} />;
  return <BigCount count={state.value.length} unit={unit} after={after?.(state.value)} />;
}

function childcareContent(tabId: string, district: DistrictData): PanelContent {
  const name = DISTRICT_NAMES[district.id];
  // 地区の学校・保育園など・放課後クラブは、通う学校（学区）のタブと同じ形（039 プラン 8）。絵と大きい数字の代わりに head を出す
  const facilityTab = (head: ReactNode): PanelContent => ({ picture: "detail-school", title: null, figure: null, head });
  switch (tabId) {
    case "schools":
      return facilityTab(
        <ChildcareFacilityPanel
          state={district.schools}
          prop="childcare-tab-schools"
          title={`${name}にある学校`}
          unit="校"
          layer="schools"
          notice={NOTICES.schoolDistrict}
        />,
      );
    case "childcare":
      return facilityTab(
        <ChildcareFacilityPanel
          state={district.childcare}
          prop="childcare-tab-nursery"
          title={`${name}にある保育園・幼稚園など`}
          unit="か所"
          layer="childcare"
        />,
      );
    case "clubs":
      return facilityTab(
        <ChildcareFacilityPanel
          state={district.afterSchoolClubs}
          prop="childcare-tab-clubs"
          title={`${name}にある放課後児童クラブ`}
          unit="か所"
          layer="after_school_clubs"
        />,
      );
    default:
      // 通う学校（学区）：町名ごとに通う学校（039 見本）。絵と大きい数字の代わりに、地図の絵・見出し・学校の札を出す
      return {
        picture: "detail-school",
        title: null,
        figure: null,
        head: <SchoolZonePanel state={districtSchoolZones(district)} districtName={DISTRICT_NAMES[district.id]} />,
      };
  }
}

// 上りは豊橋方面、下りは辰野方面（JR飯田線。026）
const DIRECTION_LABELS: Readonly<Record<StationTrips["direction"], string>> = {
  上り: "上り（豊橋方面）",
  下り: "下り（辰野方面）",
};

function transportContent(tabId: string, district: DistrictData, noCar: boolean): PanelContent {
  const notice = noCar ? { title: NOTICES.carFree } : undefined;
  if (tabId === "bus") {
    return {
      picture: "detail-bus",
      title: "地区のバス停",
      figure: countOrMessage(district.busStops, "か所"),
      notice,
      list: <FacilityListing state={district.busStops} label="バス停" />,
    };
  }
  if (tabId === "train") {
    const stations = district.trainStations;
    const departures = trainTrips(district);
    if (stations.status === "none") {
      return { picture: "detail-train", title: "地区の駅", figure: <p className="text-lg font-bold">地区内に駅はありません。</p>, notice };
    }
    const busiest = departures.status === "available" ? busiestStation(departures.value) : null;
    if (stations.status === "available" && departures.status === "available" && busiest) {
      // いちばん本数の多い駅を大きく出し、駅・方面ごとの本数は下の表に出す。運行本数データ（031）は平日だけを数えている
      return {
        picture: "detail-train",
        // どの駅も同じ本数なら、1つの駅を代表のように出さない
        title: `${busiest.tied ? "各駅" : `${busiest.stationName}駅`}を出る電車（${hasServiceTimes(departures.value) ? "1日" : "平日1日"}・特急を除く）`,
        figure: <BigCount count={busiest.trips} unit="本" after={<span className="text-sm">上り・下りの合計</span>} />,
        notice,
        list: <DeparturesTable departures={departures.value} />,
      };
    }
    return {
      picture: "detail-train",
      title: "地区の駅",
      figure: countOrMessage(stations, "か所"),
      notice,
      list: (
        <ListSection title="駅ごとの1日の本数（特急を除く）">
          {departures.status === "available" ? <DeparturesTable departures={departures.value} /> : <DataStateMessage state={departures} />}
        </ListSection>
      ),
    };
  }
  if (tabId === "errands") {
    // 見本の表の形（038）。車0台の注意書きは表の下の注記に並べる
    return {
      picture: "detail-bus",
      title: "バスで行ける場所",
      figure: null,
      head: <ErrandsHead district={district} />,
      list: <ErrandsTable district={district} notice={notice?.title} />,
    };
  }
  // 冬のおでかけ：バス停の名前と時刻は出さず、地区のバス停のうち行き先へ乗りかえなしで行けるバス停の数を出す（036。2026-11-11 まさゆきさん）。
  // 家の近くのバス停からの便は gofreely で調べてもらう
  const outing = district.busOuting;
  return {
    picture: "detail-bus-winter",
    title:
      outing.status === "available"
        ? `${outing.value.destinationPlace}へ乗りかえなしで行けるバスがあるバス停（${outing.value.dayType}）`
        : "冬・車なしのおでかけ",
    figure:
      outing.status === "available" ? (
        <BigCount
          count={outing.value.reachableStopCount}
          unit="か所"
          after={<span className="text-sm">地区のバス停 {outing.value.districtStopCount}か所のうち</span>}
        />
      ) : (
        <DataStateMessage state={outing} />
      ),
    notice,
    list: (
      <>
        {outing.status === "available" && (
          <ListSection title="冬の場面で使ったバス">
            <p>{busReachSentence(district.name, outing.value)}</p>
            <p className="text-xs text-ink-muted">{busReachDateNote(outing.value)}</p>
            <GofreelyPanel />
          </ListSection>
        )}
        {district.trainStations.status !== "none" && (
          <ListSection title="冬の場面で使った電車の便">
            {district.trainOuting.status === "available" ? (
              <TrainOutingDetails outing={district.trainOuting.value} />
            ) : (
              <DataStateMessage state={district.trainOuting} />
            )}
          </ListSection>
        )}
      </>
    ),
  };
}

// 始発・最終は時刻から数えたときだけ出す（運行本数データには時刻がない。031）
function DeparturesTable({ departures }: { departures: readonly StationTripsRow[] }) {
  const withTimes = hasServiceTimes(departures);
  return (
    <table className="w-full text-left text-sm">
      <caption className="sr-only">{withTimes ? "駅・方面ごとの1日の本数と始発・最終" : "駅・方面ごとの平日1日の本数"}</caption>
      <thead className="text-xs text-ink-muted">
        <tr>
          <th scope="col" className="py-1 font-normal">
            駅・方面
          </th>
          <th scope="col" className="py-1 font-normal">
            {withTimes ? "本数" : "本数（平日）"}
          </th>
          {withTimes && (
            <>
              <th scope="col" className="py-1 font-normal">
                始発
              </th>
              <th scope="col" className="py-1 font-normal">
                最終
              </th>
            </>
          )}
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {departures.map((row) => (
          <tr key={`${row.stationName}-${row.direction}`}>
            <th scope="row" className="py-1.5 font-bold">
              {row.stationName}
              <span className="block text-xs font-normal text-ink-muted">{DIRECTION_LABELS[row.direction]}</span>
            </th>
            <td className="py-1.5 font-bold tabular-nums">{row.tripsPerDay}本</td>
            {withTimes && row.firstDeparture !== undefined && row.lastDeparture !== undefined && (
              <>
                <td className="py-1.5 tabular-nums">{formatServiceTime(row.firstDeparture)}</td>
                <td className="py-1.5 tabular-nums">{formatServiceTime(row.lastDeparture)}</td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// 電車のおでかけの行き・帰り・帰りの次の便と、本数（要件 6.3）。バスは名前と時刻を出さない（036）ので使わない
function TrainOutingDetails({ outing }: { outing: Outing }) {
  const trip = (label: string, from: string, to: string, value: Outing["outbound"]) => (
    <>
      <dt className="text-ink-muted">{label}</dt>
      <dd className="mb-1 sm:mb-0">
        <span className="font-bold tabular-nums">
          {formatServiceTime(value.departure)} {from}発 → {formatServiceTime(value.arrival)} {to}着
        </span>
        <span className="ml-2 text-xs text-ink-muted">{value.line}</span>
      </dd>
    </>
  );
  const count = (label: string, value: number) => (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="text-xl font-bold tabular-nums">{value}本</dd>
    </div>
  );
  return (
    <>
      <p className="font-bold">
        {outing.originName} → {outing.destinationName}
      </p>
      <dl className="grid grid-cols-1 gap-x-3 sm:grid-cols-[auto_1fr] sm:gap-y-1 text-sm">
        {trip("行き", outing.originName, outing.destinationName, outing.outbound)}
        {trip("帰り", outing.destinationName, outing.originName, outing.return)}
        {outing.nextReturn ? (
          trip("帰りの次の便", outing.destinationName, outing.originName, outing.nextReturn)
        ) : (
          <>
            <dt className="text-ink-muted">帰りの次の便</dt>
            <dd className="mb-1 sm:mb-0">次の便はありません</dd>
          </>
        )}
      </dl>
      <dl className="flex flex-wrap gap-x-6 gap-y-1">
        {count(`${outing.originName}から${outing.destinationName}へ乗りかえなしで行く電車（1日）`, outing.outboundTripsPerDay)}
        {count("帰りの電車（1日）", outing.returnTripsPerDay)}
        {count(`${outing.originName}を出る電車（行き先を問わず・1日）`, outing.originDeparturesPerDay)}
      </dl>
    </>
  );
}

function populationContent(state: DistrictData["population"]): PanelContent {
  if (state.status !== "available") {
    return { picture: "detail-population", title: "地区の人口", figure: <DataStateMessage state={state} /> };
  }
  const population = state.value;
  const shares = ageShares(population);
  return {
    picture: "detail-population",
    title: `地区の人口（${formatJaDate(population.asOf)}時点）`,
    figure: <BigCount count={population.total} unit="人" />,
    list: shares.length > 0 && (
      <ListSection title="年齢の割合">
        <AgeBar shares={shares} />
        <table className="w-full text-left text-sm">
          <caption className="sr-only">年齢3区分の人数と割合</caption>
          <tbody className="divide-y divide-line">
            {shares.map((share, index) => (
              <tr key={share.label}>
                <th scope="row" className="py-1.5 font-normal">
                  <span aria-hidden="true" className={`mr-2 inline-block size-3 rounded-sm align-middle ${AGE_COLORS[index]}`} />
                  {share.label}
                </th>
                <td className="py-1.5 text-right font-bold tabular-nums">{share.count.toLocaleString("ja-JP")}人</td>
                <td className="py-1.5 text-right tabular-nums">{share.percent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ListSection>
    ),
  };
}

// 年齢3区分の割合の帯。実データの側なので、基本色だけを使う（季節の色は使わない）
const AGE_COLORS = ["bg-primary/40", "bg-primary/70", "bg-primary"] as const;

function AgeBar({ shares }: { shares: ReturnType<typeof ageShares> }) {
  return (
    <div aria-hidden="true" className="flex h-6 w-full overflow-hidden rounded-button">
      {shares.map((share, index) => (
        <div key={share.label} className={AGE_COLORS[index]} style={{ width: `${share.percent}%` }} />
      ))}
    </div>
  );
}

function publicContent(state: DataState<readonly Facility[]>): PanelContent {
  return {
    picture: "detail-public",
    title: "地区の公共施設",
    figure: countOrMessage(state, "か所"),
    notice: DETAIL_NOTICES.public_facilities,
    list:
      state.status === "available" ? (
        <>
          <ul aria-label="種類ごとの数" className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {groupBySubkind(state.value).map((group) => (
              <li key={group.subkind} className="flex items-center justify-between gap-2 rounded-button bg-kinari px-3 py-2 text-sm">
                <span>{group.subkind}</span>
                <span className="font-bold tabular-nums">{group.items.length}</span>
              </li>
            ))}
          </ul>
          <FacilityItems facilities={state.value} label="公共施設" />
        </>
      ) : undefined,
  };
}

function supportContent(tabId: string, programs: readonly SupportProgram[]): PanelContent {
  const category = SUPPORT_CATEGORIES.find((item) => item === tabId);
  const shown = programs.filter((program) => !category || program.category === category);
  return {
    picture: "detail-support",
    title: category ? `${category}の支援制度（飯田市全体）` : "飯田市の支援制度（市全体）",
    figure: programs.length === 0 ? <DataStateMessage state={{ status: "unavailable" }} /> : <BigCount count={shown.length} unit="件" />,
    notice: { title: NOTICES.support },
    list: shown.length > 0 && (
      <ul className="flex flex-col divide-y divide-line print:block">
        {shown.map((program) => (
          <li key={program.name} className="flex break-inside-avoid flex-col items-start gap-1 py-3">
            <span className="rounded-full bg-kinari-deep px-2 py-0.5 text-xs font-bold">{program.category}</span>
            <a
              href={program.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-tap items-center gap-1 font-bold text-primary underline underline-offset-4 hover:no-underline"
            >
              {program.name}
              <span className="sr-only">（飯田市の公式ページが新しいタブで開きます）</span>
              <span aria-hidden="true">↗</span>
            </a>
            <p className="text-sm">{program.summary}</p>
            {/* 紙ではリンクを押せないので、公式ページの URL を書いておく（023） */}
            <span className="hidden break-all text-xs print:block">{program.officialUrl}</span>
            <SourceNote source="飯田市公式サイト（制度のページ）" period="確認日の時点の内容" date={program.checkedOn} />
          </li>
        ))}
      </ul>
    ),
  };
}

function ListSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border-t border-line pt-3">
      <h3 className="break-after-avoid font-bold">{title}</h3>
      {children}
    </section>
  );
}

function FacilityListing({ state, label }: { state: DataState<readonly Facility[]>; label: string }) {
  return state.status === "available" && state.value.length > 0 ? <FacilityItems facilities={state.value} label={label} /> : null;
}

// 施設の一覧（種類ごと）。詳細のページなので、少なければ開いておき、多ければ閉じておく
const OPEN_LIST_LIMIT = 12;

function FacilityItems({ facilities, label }: { facilities: readonly Facility[]; label: string }) {
  // 紙では開いて出す（閉じた一覧は印刷されない。023）
  const printing = usePrintMode();
  if (facilities.length === 0) return null;
  const groups = groupBySubkind(facilities);
  return (
    <details open={printing || facilities.length <= OPEN_LIST_LIMIT} className="group border-t border-line pt-1">
      <summary className="flex break-after-avoid min-h-tap cursor-pointer list-none items-center gap-2 font-bold text-primary [&::-webkit-details-marker]:hidden">
        <span className="flex-1">
          {label}の一覧（{facilities.length}か所）
        </span>
        <span aria-hidden="true" className="transition-transform group-open:rotate-180 print:hidden">
          ⌄
        </span>
      </summary>
      <div className="flex flex-col gap-3 pb-1 print:block print:space-y-3">
        {groups.map((group) => (
          <div key={group.subkind}>
            {groups.length > 1 && (
              <p className="break-after-avoid text-xs font-bold text-ink-muted">
                {group.subkind}（{group.items.length}か所）
              </p>
            )}
            <ul className="flex flex-col divide-y divide-line print:block">
              {group.items.map((facility, index) => (
                <li key={`${facility.name}-${index}`} className="py-1.5 text-sm">
                  <span className="font-bold">{facility.name}</span>
                  {facility.address && <span className="ml-2 text-xs text-ink-muted">{facility.address}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}
