"use client";

import { useId, useState, type ReactNode } from "react";
import { DataStateMessage } from "@/components/data/DataStateMessage";
import { GofreelyLink } from "@/components/data/GofreelyLink";
import { SourceNote } from "@/components/ui/SourceNote";
import type { KarteCard } from "@/lib/conditions/labels";
import type {
  DataState,
  DistrictData,
  EvacuationHazard,
  EvacuationSite,
  Facility,
  Outing,
  StationDepartures,
  SupportProgram,
} from "@/lib/data/screen-data";
import { formatJaDate, formatJaDateWithWeekday, formatServiceTime } from "@/lib/format";
import { DETAIL_NOTICES } from "@/lib/karte/details";
import { ageShares, groupBySubkind, HAZARD_LABELS } from "@/lib/karte/facilities";
import { NOTICES } from "@/lib/notices";
import type { PixelAssetId } from "@/lib/pixel/assets";
import { BigCount, DetailFigure, DetailPicture, DetailTabs, NoticeBox, type DetailTabItem } from "./DetailCard";

// 住まい以外の6つの詳細のカード（028。住まいの見本 karte-detail-housing.png と同じ形）。
// 上に絵と大きい数字、注意書き、タブ。タブの下に、そのタブの一覧を出す。出典・対象・確認日は下の「数字の根拠」にまとめる
export type OtherCard = Exclude<KarteCard, "housing">;

export type DetailTab = DetailTabItem & {
  // 「数字の根拠」に出す出典（このタブで使っているデータ）
  states: readonly DataState<unknown>[];
};

const HAZARDS: readonly EvacuationHazard[] = ["flood", "landslide", "earthquake", "large_fire"];
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
          label: "学区",
          icon: "icon-school",
          states: [district.elementarySchoolDistricts, district.juniorHighSchoolDistricts],
        },
        { id: "schools", label: "学校", icon: "icon-school", states: [district.schools] },
        { id: "childcare", label: "保育園など", icon: "icon-family", states: [district.childcare] },
        { id: "clubs", label: "放課後クラブ", icon: "icon-family", states: [district.afterSchoolClubs] },
      ];
    case "transport": {
      const hasStation = district.trainStations.status !== "none";
      const bus: DetailTab = { id: "bus", label: "バス停", icon: "icon-transport", states: [district.busStops] };
      const train: DetailTab = {
        id: "train",
        label: "電車",
        icon: "icon-transport",
        states: hasStation ? [district.trainStations, district.trainDepartures] : [district.trainStations],
      };
      if (!noCar) return [bus, train];
      const outing: DetailTab = {
        id: "outing",
        label: "冬のおでかけ",
        icon: "icon-winter",
        states: hasStation ? [district.busOuting, district.trainOuting] : [district.busOuting],
      };
      return [outing, bus, train];
    }
    case "disaster": {
      const state = district.evacuationSites;
      const all: DetailTab = { id: "all", label: "すべて", icon: "icon-disaster", states: [state] };
      if (state.status !== "available") return [all];
      const sites = state.value;
      // 大規模な火事は、使える場所のある地区だけタブにする（ない地区で「0」のタブを並べない）
      const hazards = HAZARDS.filter((hazard) => hazard !== "large_fire" || sites.some((site) => site.hazards.includes(hazard)));
      return [
        { ...all, count: sites.length },
        ...hazards.map((hazard) => ({
          id: hazard,
          label: HAZARD_LABELS[hazard],
          icon: "icon-disaster" as const,
          count: sites.filter((site) => site.hazards.includes(hazard)).length,
          states: [state],
        })),
      ];
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

type PanelContent = { picture: PixelAssetId; title: string; figure: ReactNode; notice?: { title: string; body?: string }; list?: ReactNode };

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
  const content = panelContent(card, tab.id, { district, supportPrograms, noCar });
  return (
    <section aria-label={CARD_LABELS[card]} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card md:p-5">
      <div id={panelId} role="tabpanel" aria-label={tab.label} className="flex flex-col gap-3">
        <DetailFigure picture={<DetailPicture asset={content.picture} />} title={content.title}>
          {content.figure}
        </DetailFigure>
        {content.notice && <NoticeBox title={content.notice.title} body={content.notice.body} className="md:ml-[9.25rem]" />}
      </div>
      {tabs.length > 1 && (
        <DetailTabs label={`${CARD_LABELS[card]}の見る範囲`} tabs={tabs} selectedId={tab.id} panelId={panelId} onSelect={onTabChange} />
      )}
      {content.list}
    </section>
  );
}

function panelContent(
  card: OtherCard,
  tabId: string,
  { district, supportPrograms, noCar }: { district: DistrictData; supportPrograms: readonly SupportProgram[]; noCar: boolean },
): PanelContent {
  switch (card) {
    case "childcare":
      return childcareContent(tabId, district);
    case "transport":
      return transportContent(tabId, district, noCar);
    case "disaster":
      return disasterContent(tabId, district.evacuationSites);
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

// 「小学校1・中学校1・高等学校3」のような種類ごとの数（種類が2つ以上のときだけ）
function SubkindBreakdown({ facilities }: { facilities: readonly Facility[] }) {
  const groups = groupBySubkind(facilities);
  if (groups.length < 2) return null;
  return <span className="text-sm">{groups.map((group) => `${group.subkind}${group.items.length}`).join("・")}</span>;
}

function childcareContent(tabId: string, district: DistrictData): PanelContent {
  const notice = { title: NOTICES.schoolDistrict };
  switch (tabId) {
    case "schools":
      return {
        picture: "facility-school",
        title: "地区にある学校",
        figure: countOrMessage(district.schools, "校", (schools) => <SubkindBreakdown facilities={schools} />),
        notice,
        list: <FacilityListing state={district.schools} label="学校" />,
      };
    case "childcare":
      return {
        picture: "facility-nursery",
        title: "地区にある保育園・幼稚園など",
        figure: countOrMessage(district.childcare, "か所", (items) => <SubkindBreakdown facilities={items} />),
        list: <FacilityListing state={district.childcare} label="保育園・幼稚園など" />,
      };
    case "clubs":
      return {
        picture: "facility-nursery",
        title: "地区にある放課後児童クラブ",
        figure: countOrMessage(district.afterSchoolClubs, "か所"),
        list: <FacilityListing state={district.afterSchoolClubs} label="放課後児童クラブ" />,
      };
    default:
      return {
        picture: "facility-school",
        title: "主な小学校区・中学校区",
        figure: (
          <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1">
            <SchoolDistrictRow label="小学校" state={district.elementarySchoolDistricts} />
            <SchoolDistrictRow label="中学校" state={district.juniorHighSchoolDistricts} />
          </dl>
        ),
        notice,
      };
  }
}

function SchoolDistrictRow({ label, state }: { label: string; state: DataState<readonly string[]> }) {
  return (
    <>
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-2xl font-extrabold md:text-3xl">
        {state.status === "available" ? state.value.join("・") : <DataStateMessage state={state} />}
      </dd>
    </>
  );
}

// 上りは豊橋方面、下りは辰野方面（JR飯田線。026）
const DIRECTION_LABELS: Readonly<Record<StationDepartures["direction"], string>> = {
  上り: "上り（豊橋方面）",
  下り: "下り（辰野方面）",
};

function transportContent(tabId: string, district: DistrictData, noCar: boolean): PanelContent {
  const notice = noCar ? { title: NOTICES.carFree } : undefined;
  if (tabId === "bus") {
    return {
      picture: "vehicle-bus",
      title: "地区のバス停",
      figure: countOrMessage(district.busStops, "か所"),
      notice,
      list: <FacilityListing state={district.busStops} label="バス停" />,
    };
  }
  if (tabId === "train") {
    const stations = district.trainStations;
    const departures = district.trainDepartures;
    if (stations.status === "none") {
      return { picture: "vehicle-train", title: "地区の駅", figure: <p className="text-lg font-bold">地区内に駅はありません。</p>, notice };
    }
    if (stations.status === "available" && departures.status === "available" && departures.value.length > 0) {
      // いちばん本数の多い駅を大きく出し、駅・方面ごとの本数は下の表に出す
      const busiest = busiestStation(departures.value);
      return {
        picture: "vehicle-train",
        title: `${busiest.stationName}駅を出る電車（1日・特急を除く）`,
        figure: <BigCount count={busiest.trips} unit="本" after={<span className="text-sm">上り・下りの合計</span>} />,
        notice,
        list: <DeparturesTable departures={departures.value} />,
      };
    }
    return {
      picture: "vehicle-train",
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
  const outing = district.busOuting;
  return {
    picture: "vehicle-bus",
    title:
      outing.status === "available"
        ? `${outing.value.originName}から${outing.value.destinationName}へ乗りかえなしで行くバス（1日）`
        : "冬・車なしのおでかけ",
    figure:
      outing.status === "available" ? (
        <BigCount count={outing.value.outboundTripsPerDay} unit="本" after={<span className="text-sm">帰り {outing.value.returnTripsPerDay}本</span>} />
      ) : (
        <DataStateMessage state={outing} />
      ),
    notice,
    list: (
      <>
        {outing.status === "available" && (
          <ListSection title="冬の場面で使ったバスの便">
            <p className="text-xs text-ink-muted">{formatJaDateWithWeekday(outing.value.serviceDate)}の時刻表</p>
            <OutingDetails outing={outing.value} mode="バス" countsShownAbove />
            <GofreelyLink outing={outing.value} className="self-start" />
          </ListSection>
        )}
        {district.trainStations.status !== "none" && (
          <ListSection title="冬の場面で使った電車の便">
            {district.trainOuting.status === "available" ? (
              <OutingDetails outing={district.trainOuting.value} mode="電車" />
            ) : (
              <DataStateMessage state={district.trainOuting} />
            )}
          </ListSection>
        )}
      </>
    ),
  };
}

function busiestStation(departures: readonly StationDepartures[]): { stationName: string; trips: number } {
  const totals = new Map<string, number>();
  for (const row of departures) totals.set(row.stationName, (totals.get(row.stationName) ?? 0) + row.tripsPerDay);
  const [stationName, trips] = [...totals].reduce((best, entry) => (entry[1] > best[1] ? entry : best));
  return { stationName, trips };
}

function DeparturesTable({ departures }: { departures: readonly StationDepartures[] }) {
  return (
    <table className="w-full text-left text-sm">
      <caption className="sr-only">駅・方面ごとの1日の本数と始発・最終</caption>
      <thead className="text-xs text-ink-muted">
        <tr>
          <th scope="col" className="py-1 font-normal">
            駅・方面
          </th>
          <th scope="col" className="py-1 font-normal">
            本数
          </th>
          <th scope="col" className="py-1 font-normal">
            始発
          </th>
          <th scope="col" className="py-1 font-normal">
            最終
          </th>
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
            <td className="py-1.5 tabular-nums">{formatServiceTime(row.firstDeparture)}</td>
            <td className="py-1.5 tabular-nums">{formatServiceTime(row.lastDeparture)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// 行き・帰り・帰りの次の便と、本数（要件 6.3）。行き・帰りの本数を上の大きい数字で出したときは、残りの本数だけを出す
function OutingDetails({ outing, mode, countsShownAbove = false }: { outing: Outing; mode: "バス" | "電車"; countsShownAbove?: boolean }) {
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
        {!countsShownAbove && (
          <>
            {count(`${outing.originName}から${outing.destinationName}へ乗りかえなしで行く${mode}（1日）`, outing.outboundTripsPerDay)}
            {count(`帰りの${mode}（1日）`, outing.returnTripsPerDay)}
          </>
        )}
        {count(`${outing.originName}を出る${mode}（行き先を問わず・1日）`, outing.originDeparturesPerDay)}
      </dl>
    </>
  );
}

function disasterContent(tabId: string, state: DataState<readonly EvacuationSite[]>): PanelContent {
  const hazard = HAZARDS.find((item) => item === tabId);
  const sites = state.status === "available" ? state.value.filter((site) => !hazard || site.hazards.includes(hazard)) : [];
  return {
    picture: "facility-shelter",
    title: hazard ? `${HAZARD_LABELS[hazard]}のときに使える指定緊急避難場所` : "地区の指定緊急避難場所",
    figure: state.status === "available" ? <BigCount count={sites.length} unit="か所" /> : <DataStateMessage state={state} />,
    notice: DETAIL_NOTICES.disaster,
    list:
      state.status === "available" ? (
        <FacilityItems
          facilities={sites}
          label="避難場所"
          extra={(site) =>
            site.hazards.length > 0 && (
              <span className="mt-0.5 block text-xs text-ink-muted">使える災害：{site.hazards.map((item) => HAZARD_LABELS[item]).join("・")}</span>
            )
          }
        />
      ) : undefined,
  };
}

function populationContent(state: DistrictData["population"]): PanelContent {
  if (state.status !== "available") {
    return { picture: "icon-population", title: "地区の人口", figure: <DataStateMessage state={state} /> };
  }
  const population = state.value;
  const shares = ageShares(population);
  return {
    picture: "icon-population",
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
    picture: "facility-public",
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
    picture: "icon-support",
    title: category ? `${category}の支援制度（飯田市全体）` : "飯田市の支援制度（市全体）",
    figure: programs.length === 0 ? <DataStateMessage state={{ status: "unavailable" }} /> : <BigCount count={shown.length} unit="件" />,
    notice: { title: NOTICES.support },
    list: shown.length > 0 && (
      <ul className="flex flex-col divide-y divide-line">
        {shown.map((program) => (
          <li key={program.name} className="flex flex-col items-start gap-1 py-3">
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
      <h3 className="font-bold">{title}</h3>
      {children}
    </section>
  );
}

function FacilityListing({ state, label }: { state: DataState<readonly Facility[]>; label: string }) {
  return state.status === "available" && state.value.length > 0 ? <FacilityItems facilities={state.value} label={label} /> : null;
}

// 施設の一覧（種類ごと）。詳細のページなので、少なければ開いておき、多ければ閉じておく
const OPEN_LIST_LIMIT = 12;

function FacilityItems<T extends Facility>({
  facilities,
  label,
  extra,
}: {
  facilities: readonly T[];
  label: string;
  extra?: (facility: T) => ReactNode;
}) {
  if (facilities.length === 0) return null;
  const groups = groupBySubkind(facilities);
  return (
    <details open={facilities.length <= OPEN_LIST_LIMIT} className="group border-t border-line pt-1">
      <summary className="flex min-h-tap cursor-pointer list-none items-center gap-2 font-bold text-primary [&::-webkit-details-marker]:hidden">
        <span className="flex-1">
          {label}の一覧（{facilities.length}か所）
        </span>
        <span aria-hidden="true" className="transition-transform group-open:rotate-180">
          ⌄
        </span>
      </summary>
      <div className="flex flex-col gap-3 pb-1">
        {groups.map((group) => (
          <div key={group.subkind}>
            {groups.length > 1 && (
              <p className="text-xs font-bold text-ink-muted">
                {group.subkind}（{group.items.length}か所）
              </p>
            )}
            <ul className="flex flex-col divide-y divide-line">
              {group.items.map((facility, index) => (
                <li key={`${facility.name}-${index}`} className="py-1.5 text-sm">
                  <span className="font-bold">{facility.name}</span>
                  {facility.address && <span className="ml-2 text-xs text-ink-muted">{facility.address}</span>}
                  {extra?.(facility)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}
