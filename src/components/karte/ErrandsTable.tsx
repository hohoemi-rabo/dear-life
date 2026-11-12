"use client";

import { useId, useState, type ReactNode } from "react";
import { DataStateMessage } from "@/components/data/DataStateMessage";
import { GofreelyHomePanel } from "@/components/data/GofreelyPanel";
import { usePrintMode } from "@/components/print/PrintMode";
import type { BusErrand, DistrictData } from "@/lib/data/screen-data";
import { formatJaDate, formatJaDateWithWeekday } from "@/lib/format";
import { propSrc, propSrcSet, type PropId } from "@/lib/illust/assets";
import {
  ERRAND_GROUP_LABELS,
  ERRAND_GROUPS,
  errandsOf,
  errandStation,
  FIRST_ERRAND_GROUPS,
  highSchoolNames,
  reachableErrandCount,
  STORES_CHECKED_ON,
  type ErrandGroup,
} from "@/lib/karte/errands";
import { GOFREELY_URL } from "@/lib/site";
import { tripsPerDayRange } from "@/lib/transit/bus-reach";
import { DetailPicture } from "./DetailCard";

// カルテの交通「行ける場所」（036・037。038 で見本 karte-transport-places-pc.png・-open.png の表の形にした。2026-11-12 まさゆきさん）。
// 出す情報は 037 のまま：バス停の名前は出さず、地区のバス停のうち乗りかえなしで行けるバス停の数と、1日の本数の幅（乗るバス停によって違う）。
// 診療所は数だけ、駅はその駅を出る電車の本数、高校は名前だけ。家からの行き方は GoFreely で調べてもらう

const GROUP_PICTURES: Readonly<Record<ErrandGroup, PropId>> = {
  store: "errand-store",
  hospital: "errand-hospital",
  office: "errand-office",
  school: "reply-school",
  station: "errand-station",
};

// PC の表の列：まとまり（絵と名前）／行き先／平日の行きの便／直通で行けるバス停
const GROUP_COLUMNS = "md:grid-cols-[10rem_minmax(0,1fr)]";
const ROW_COLUMNS = "md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]";

// 見出し：バスの絵、線で区切って「バスで行ける場所」と、乗りかえなしで行ける行き先の数。右に GoFreely へのリンク
export function ErrandsHead({ district }: { district: DistrictData }) {
  const state = district.busErrands;
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-5">
      <div className="flex min-w-0 flex-1 gap-3 md:gap-5">
        <DetailPicture asset="detail-bus" />
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 border-l border-line pl-3 md:pl-5">
          <h2 className="text-xl font-extrabold md:text-3xl">バスで行ける場所</h2>
          <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="text-sm md:text-base">{district.name}から乗り換えなしで行ける施設</span>
            {state.status === "available" ? (
              <span className="text-4xl font-extrabold tabular-nums text-gold md:text-5xl">
                {reachableErrandCount(state.value)}
                <span className="ml-0.5 text-xl md:text-2xl">か所</span>
              </span>
            ) : (
              <DataStateMessage state={state} />
            )}
          </p>
        </div>
      </div>
      <a
        href={GOFREELY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-tap items-center gap-1 self-start font-bold text-primary underline underline-offset-4 hover:no-underline md:self-center print:hidden"
      >
        家の近くから調べる
        <span className="sr-only">（GoFreely が新しいタブで開きます）</span>
        <span aria-hidden="true">↗</span>
      </a>
    </div>
  );
}

// 表。はじめは 買い物・病院・市役所 だけを出し、「学校など、ほかの行き先を見る」で 学校・駅 を同じ表の下に続けて出す。紙では全部出す（023）
export function ErrandsTable({ district, notice }: { district: DistrictData; notice?: string }) {
  const printing = usePrintMode();
  const [open, setOpen] = useState(false);
  const moreId = useId();
  const showAll = open || printing;
  const errands = district.busErrands.status === "available" ? district.busErrands.value : [];
  const first = errands[0];
  const group = (id: ErrandGroup) => <ErrandGroupRows key={id} group={id} district={district} />;
  return (
    <div className="flex flex-col gap-3">
      <div>
        <div aria-hidden="true" className={`hidden rounded-button bg-kinari-deep px-4 py-2 text-sm font-bold md:grid md:gap-4 ${GROUP_COLUMNS}`}>
          <span />
          <span className={`grid gap-4 ${ROW_COLUMNS}`}>
            <span>行き先</span>
            <span>{first?.dayType ?? "平日"}の行きの便</span>
            <span>直通で行けるバス停</span>
          </span>
        </div>
        {FIRST_ERRAND_GROUPS.map(group)}
        <div id={moreId}>{showAll && ERRAND_GROUPS.filter((id) => !FIRST_ERRAND_GROUPS.includes(id)).map(group)}</div>
      </div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={moreId}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-tap w-full items-center justify-center gap-2 rounded-button border border-line bg-surface px-3 font-bold text-primary hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary print:hidden"
      >
        {open ? <ChevronUp /> : <ListMark />}
        {open ? "ほかの行き先を閉じる" : "学校など、ほかの行き先を見る"}
      </button>
      <div className="flex flex-col gap-1">
        <p className="flex items-center gap-2 text-sm">
          <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center rounded-full bg-gold text-xs font-bold text-white">
            i
          </span>
          乗るバス停によって便数が変わります。
        </p>
        {notice && <p className="text-sm">{notice}</p>}
        {first && (
          <p className="text-xs text-ink-muted">
            バスは{formatJaDateWithWeekday(first.serviceDate)}の時刻表で数えました。本数は行きの便の数です。
          </p>
        )}
        <p className="text-xs text-ink-muted">
          店の名前と住所は、各店の公式ページで確かめました（{formatJaDate(STORES_CHECKED_ON)}）。地区の人がよく使う店で、住所がほかの地区の店もあります。
        </p>
      </div>
      <GofreelyHomePanel />
    </div>
  );
}

// 1つのまとまり：左に絵と名前、右に行き先ごとの行。スマホでは絵と名前を上に出し、行は「名前／本数／バス停の数」を縦に積む
function ErrandGroupRows({ group, district }: { group: ErrandGroup; district: DistrictData }) {
  const rows = groupRows(group, district);
  if (rows.length === 0) return null;
  const asset = GROUP_PICTURES[group];
  return (
    <section className={`flex break-inside-avoid flex-col gap-1 border-b border-line py-2 md:grid md:items-center md:gap-4 md:px-4 ${GROUP_COLUMNS}`}>
      <h3 className="flex items-center gap-2 font-bold md:text-lg">
        {/* eslint-disable-next-line @next/next/no-img-element -- 静的書き出しなので WebP をそのまま出す */}
        <img
          src={propSrc(asset, 240)}
          srcSet={propSrcSet(asset)}
          sizes="96px"
          alt=""
          draggable={false}
          className="h-10 w-14 shrink-0 select-none object-contain md:h-16 md:w-20"
        />
        {ERRAND_GROUP_LABELS[group]}
      </h3>
      <ul className="flex flex-col divide-y divide-line">{rows}</ul>
    </section>
  );
}

function groupRows(group: ErrandGroup, district: DistrictData): ReactNode[] {
  const state = district.busErrands;
  const busRows =
    group === "station"
      ? []
      : state.status === "available"
        ? errandsOf(state.value, group).map((errand) => <BusErrandRow key={errand.place} errand={errand} districtName={district.name} />)
        : [<Row key="missing" name={ERRAND_GROUP_LABELS[group]} wide={<DataStateMessage state={state} />} />];
  switch (group) {
    case "hospital":
      return [...busRows, <ClinicRow key="clinic" district={district} />];
    case "school": {
      const names = highSchoolNames(district);
      if (names === null) return busRows;
      return [
        ...busRows,
        <Row key="high" name="近くの高校（紹介）" wide={names.length > 0 ? names.join("・") : `${district.name}の中に高校はありません。`} />,
      ];
    }
    case "station":
      return [<StationRow key="station" district={district} />];
    default:
      return busRows;
  }
}

// 行：行き先の名前と、2つの欄（便・バス停）。wide を渡すと、2つの欄をまたいで1つの文を出す
function Row({ name, trips, stops, wide, note }: { name: ReactNode; trips?: ReactNode; stops?: ReactNode; wide?: ReactNode; note?: ReactNode }) {
  return (
    <li className={`flex break-inside-avoid flex-col gap-0.5 py-2 md:grid md:min-h-14 md:items-center md:gap-x-4 md:py-1 ${ROW_COLUMNS}`}>
      <div className="font-bold md:font-normal">{name}</div>
      {wide !== undefined ? (
        <div className="text-sm md:col-span-2">{wide}</div>
      ) : (
        <>
          <Cell label="平日の行きの便">{trips}</Cell>
          <Cell label="直通で行けるバス停">{stops}</Cell>
        </>
      )}
      {note && <p className="text-xs text-ink-muted md:col-span-3">{note}</p>}
    </li>
  );
}

// スマホでは欄の名前を値の前に出す（表の見出しの行は PC だけ）。中身がなければ何も出さない
function Cell({ label, children }: { label: string; children: ReactNode }) {
  if (children === undefined || children === null) return <div className="hidden md:block" />;
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <span className="text-xs text-ink-muted md:sr-only">{label}</span>
      {children}
    </div>
  );
}

function BusErrandRow({ errand, districtName }: { errand: BusErrand; districtName: string }) {
  const name =
    errand.officialUrl === null ? (
      errand.place
    ) : (
      <a
        href={errand.officialUrl}
        target="_blank"
        rel="noopener noreferrer"
        // 名前が折り返しても ↗ だけが次の行に回らないよう、文の流れのまま置き、↗ の前に改行させない文字（U+2060）を入れる
        className="inline-block py-2.5 text-primary underline underline-offset-4 hover:no-underline"
      >
        {errand.place}
        <span aria-hidden="true">{"⁠ ↗"}</span>
        <span className="sr-only">（店の公式ページが新しいタブで開きます）</span>
      </a>
    );
  if (!errand.hasStop) return <Row name={name} wide="そばにバス停がないため、バスでは数えていません" />;
  const trips =
    errand.reachableStopCount > 0 && errand.minTripsPerDay !== null && errand.maxTripsPerDay !== null
      ? tripsPerDayRange(errand.minTripsPerDay, errand.maxTripsPerDay)
      : null;
  return (
    <Row
      name={name}
      trips={
        trips === null ? (
          <span className="text-sm">乗りかえなしで行けるバスはありません</span>
        ) : (
          <span className="text-lg font-extrabold tabular-nums">{trips}</span>
        )
      }
      stops={
        <span className="tabular-nums">
          <span className="sr-only">{districtName}のバス停</span>
          {errand.districtStopCount}か所中<span className="text-lg font-extrabold">{errand.reachableStopCount}</span>か所
        </span>
      }
    />
  );
}

function ClinicRow({ district }: { district: DistrictData }) {
  const state = district.clinicCount;
  const name = "診療所（クリニック）";
  if (state.status !== "available") return <Row name={name} wide={<DataStateMessage state={state} />} />;
  return (
    <Row
      name={name}
      trips={
        <span>
          {district.name}の中に<span className="text-lg font-extrabold tabular-nums">{state.value.count}</span>か所
        </span>
      }
      stops={null}
      note={`国の医療機関の一覧（${formatJaDate(state.value.asOf)}時点）で、住所が${district.name}の診療所を数えました。歯科は入っていません。`}
    />
  );
}

function StationRow({ district }: { district: DistrictData }) {
  const station = errandStation(district);
  if (station.status === "none") return <Row name="地区内に駅はありません。" wide={null} />;
  const name = `${station.stationName}駅`;
  if (station.status === "missing") return <Row name={name} wide={<DataStateMessage state={station.state} />} />;
  return (
    <Row
      name={name}
      trips={
        <span className="flex flex-col">
          <span>
            電車 <span className="text-lg font-extrabold tabular-nums">{station.total}本／日</span>
          </span>
          <span className="text-xs text-ink-muted">
            上り（豊橋方面）{station.up}本・下り（辰野方面）{station.down}本（{station.withTimes ? "" : "平日・"}特急を除く）
          </span>
        </span>
      }
      stops={null}
    />
  );
}

function ListMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="currentColor">
      <rect x="2" y="4" width="2.5" height="2.5" rx="0.5" />
      <rect x="2" y="8.75" width="2.5" height="2.5" rx="0.5" />
      <rect x="2" y="13.5" width="2.5" height="2.5" rx="0.5" />
      <rect x="6.5" y="4.5" width="11.5" height="1.6" rx="0.8" />
      <rect x="6.5" y="9.2" width="11.5" height="1.6" rx="0.8" />
      <rect x="6.5" y="13.9" width="11.5" height="1.6" rx="0.8" />
    </svg>
  );
}

function ChevronUp() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 12.5 10 7l5.5 5.5" />
    </svg>
  );
}
