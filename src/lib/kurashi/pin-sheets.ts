// くらしのピンを押したときのシートの中身（028）。どのデータを見出しにし、場面のどの文・出典をシートに出すかをここで決める。
// 見出しの数が出せないときは、見出しは数なしにして「該当なし／データ未取得」を出し分ける（F-09）
import type { KarteCard } from "../conditions/labels.ts";
import { HOUSING_LABELS } from "../conditions/labels.ts";
import type { Conditions } from "../conditions/model.ts";
import type { ScenePlan, Season } from "../conditions/scene.ts";
import type { DataState, DistrictData, DistrictEvent, Facility, MarketStat, SourceInfo } from "../data/screen-data.ts";
import { formatQuarterRange } from "../format.ts";
import { NOTICES } from "../notices.ts";
import type { Scene, SceneLine } from "../scenes/render.ts";
import { sceneNoticeMessage } from "../scenes/placeholders.ts";
import { scenePinFor, type PinId } from "./pins.ts";

type MissingState = Exclude<DataState<unknown>, { status: "available" }>;

// 出典と、出典の対象期間の代わりに出す期間（相場は集計の対象期間）
export type SheetSource = { source: SourceInfo; period?: string };

export type PinSheet = {
  id: PinId;
  title: string;
  // 見出しの数が出せないときの状態
  missing: MissingState | null;
  // 小さな絵の横のひと言（見本）
  intro: string;
  lines: readonly SceneLine[];
  notices: readonly string[];
  sources: readonly SheetSource[];
  // 「確かめる」ボタンで移るカルテのカード。行事はカルテにカードがないので null
  karteCard: KarteCard | null;
  action: string | null;
  market: { state: DataState<MarketStat> | null; alwaysFew: boolean } | null;
  events: readonly DistrictEvent[] | null;
};

type Input = {
  pin: PinId;
  season: Season;
  plan: ScenePlan;
  conditions: Conditions;
  district: DistrictData;
  scene: Scene | null;
  events: readonly DistrictEvent[];
};

function countOf<T>(state: DataState<readonly T[]>, match: (item: T) => boolean = () => true): DataState<number> {
  if (state.status !== "available") return state;
  const count = state.value.filter(match).length;
  return count > 0 ? { status: "available", value: count, source: state.source } : { status: "none", source: state.source };
}

const isElementarySchool = (facility: Facility) => facility.subkind === "小学校";

function sourcesOf(...states: DataState<unknown>[]): SourceInfo[] {
  return states.flatMap((state) => (state.status === "unavailable" ? [] : [state.source]));
}

// 出典は出てきた順に、同じものは1つにまとめる
function uniqueSources(sources: readonly SheetSource[]): SheetSource[] {
  return sources.filter((item, index) => sources.findIndex(({ source }) => source.id === item.source.id) === index);
}

// 見出しの「上郷の小学校は1校」。数が出せないときは「上郷の小学校」にして、下で該当なし／データ未取得を出す
function countTitle(state: DataState<number>, base: string, unit: string): { title: string; missing: MissingState | null } {
  return state.status === "available" ? { title: `${base}は${state.value}${unit}`, missing: null } : { title: base, missing: state };
}

// 場面の文はその場面の軸のピンにだけ出す（春：子どもあり＝学校、子どもなし＝公共施設。夏：避難場所。秋：人口。冬：車0台＝バス・電車、車あり＝雪の道）
function sceneParts(input: Input): { lines: readonly SceneLine[]; notices: readonly string[]; sources: SheetSource[] } {
  const target = scenePinFor(input.plan);
  if (input.scene && target === "transit" && (input.pin === "bus" || input.pin === "train")) {
    // バスと電車のピンが分かれている絵では、それぞれの便の文だけを出す。想定の文はどちらにも出す
    const pin = input.pin;
    const lines = input.scene.lines.filter((line) => belongsToTransitPin(line, pin));
    const sources = lines.flatMap((line) => (line.status === "shown" ? line.sources.map((source) => ({ source })) : []));
    return { lines, notices: input.scene.notices, sources };
  }
  if (!input.scene || target !== input.pin) return { lines: [], notices: [], sources: [] };
  return {
    lines: input.scene.lines,
    notices: input.scene.notices,
    sources: input.scene.sources.map((source) => ({ source })),
  };
}

function belongsToTransitPin(line: SceneLine, pin: "bus" | "train"): boolean {
  if (line.status === "shown") {
    if (line.kind === "想定") return true;
    return (line.transit?.mode ?? "bus") === pin;
  }
  return (line.topic === "trainOuting" ? "train" : "bus") === pin;
}

// 子どもなしのときの学校のピン：場面の文（子育て・学校）は出ないので、主な学区だけを1文で出す
function schoolDistrictLine(district: DistrictData): SceneLine {
  const state = district.elementarySchoolDistricts;
  if (state.status !== "available") {
    return { status: state.status, position: 1, topic: "schoolDistricts", message: sceneNoticeMessage("schoolDistricts", state.status), karteCard: "childcare" };
  }
  return {
    status: "shown",
    position: 1,
    kind: "データ",
    text: `小学校は主に${state.value.join("・")}の学区になります。`,
    sources: [state.source],
    checkedOn: null,
    karteCard: "childcare",
    transit: null,
  };
}

export function pinSheet(input: Input): PinSheet {
  const { pin, district, conditions } = input;
  const base = { id: pin, notices: [] as readonly string[], market: null, events: null };
  switch (pin) {
    case "school": {
      const count = countOf(district.schools, isElementarySchool);
      const scene = sceneParts(input);
      const lines = scene.lines.length > 0 ? scene.lines : [schoolDistrictLine(district)];
      const lineSources = scene.lines.length > 0 ? scene.sources : sourcesOf(district.elementarySchoolDistricts).map((source) => ({ source }));
      return {
        ...base,
        ...countTitle(count, `${district.name}の小学校`, "校"),
        intro: "主な学区や学校の場所を、カルテと地図で確かめられます。",
        lines,
        notices: scene.lines.length > 0 ? scene.notices : [NOTICES.schoolDistrict],
        sources: uniqueSources([...sourcesOf(count).map((source) => ({ source })), ...lineSources]),
        karteCard: "childcare",
        action: "学区と場所を確かめる",
      };
    }
    case "public": {
      const count = countOf(district.publicFacilities);
      const scene = sceneParts(input);
      return {
        ...base,
        ...countTitle(count, `${district.name}の公共施設`, "か所"),
        intro: "公民館や図書館、公園などの場所を、カルテと地図で確かめられます。",
        lines: scene.lines,
        notices: scene.notices,
        sources: uniqueSources([...sourcesOf(count).map((source) => ({ source })), ...scene.sources]),
        karteCard: "public_facilities",
        action: "公共施設を確かめる",
      };
    }
    case "evacuation": {
      const count = countOf(district.evacuationSites);
      const scene = sceneParts(input);
      return {
        ...base,
        ...countTitle(count, `${district.name}の避難場所`, "か所"),
        intro: "大雨や地震のときに逃げる場所を、カルテと地図で確かめられます。",
        lines: scene.lines,
        notices: scene.notices,
        sources: uniqueSources([...sourcesOf(count).map((source) => ({ source })), ...scene.sources]),
        karteCard: "disaster",
        action: "避難場所を確かめる",
      };
    }
    case "population": {
      // 見出しは「上郷に住んでいる人は13,524人」。人口は1つの値なので、数が出せないときは「上郷に住んでいる人」にする
      const state = district.population;
      const subject = `${district.name}に住んでいる人`;
      const heading =
        state.status === "available"
          ? { title: `${subject}は${state.value.total.toLocaleString("ja-JP")}人`, missing: null }
          : { title: subject, missing: state };
      const scene = sceneParts(input);
      return {
        ...base,
        ...heading,
        intro: "地区の人口と年齢の構成を、カルテで確かめられます。",
        lines: scene.lines,
        notices: scene.notices,
        sources: uniqueSources([...sourcesOf(state).map((source) => ({ source })), ...scene.sources]),
        karteCard: "population",
        action: "人口を確かめる",
      };
    }
    case "transit": {
      // 冬は車があってもいつも出す。場面の文（本物のバスと電車の便）は車0台のときだけ
      const count = countOf(district.busStops);
      const scene = sceneParts(input);
      return {
        ...base,
        ...countTitle(count, `${district.name}のバス停`, "か所"),
        intro: "バス停や駅の場所と、バス・電車の便を、カルテと地図で確かめられます。",
        lines: scene.lines,
        notices: scene.notices,
        sources: uniqueSources([...sourcesOf(count).map((source) => ({ source })), ...scene.sources]),
        karteCard: "transport",
        action: "バスと電車を確かめる",
      };
    }
    case "bus": {
      const count = countOf(district.busStops);
      const scene = sceneParts(input);
      return {
        ...base,
        ...countTitle(count, `${district.name}のバス停`, "か所"),
        intro: "バス停の場所とバスの便を、カルテと地図で確かめられます。",
        lines: scene.lines,
        notices: scene.notices,
        sources: uniqueSources([...sourcesOf(count).map((source) => ({ source })), ...scene.sources]),
        karteCard: "transport",
        action: "バスを確かめる",
      };
    }
    case "train": {
      const count = countOf(district.trainStations);
      const scene = sceneParts(input);
      return {
        ...base,
        ...countTitle(count, `${district.name}の駅`, "か所"),
        intro: "駅の場所と電車の便を、カルテと地図で確かめられます。",
        lines: scene.lines,
        notices: scene.notices,
        sources: uniqueSources([...sourcesOf(count).map((source) => ({ source })), ...scene.sources]),
        karteCard: "transport",
        action: "電車を確かめる",
      };
    }
    case "snow": {
      // 雪と凍結は数のデータがないので、見出しは場面の文の要点にする（車ありのときだけ立つピン）
      const scene = sceneParts(input);
      return {
        ...base,
        title: "冬の朝は、路面が凍ります",
        missing: null,
        intro: "車で出かける冬の朝のようすです。バスや電車の便は、カルテの交通で確かめられます。",
        lines: scene.lines,
        notices: scene.notices,
        sources: uniqueSources(scene.sources),
        karteCard: "transport",
        action: "交通を確かめる",
      };
    }
    case "event":
      // 行事は手で集めた情報なので、出典の代わりに行事ごとの資料と確認日を出す（EventsPanel と同じ。要件 7.1・7.2）
      return {
        ...base,
        title: `${district.name}の${input.season}の行事`,
        missing: null,
        intro: "地区で毎年行われている行事です。",
        lines: [],
        // 行事の注意書きは、行事の一覧の下に出すクレジット（EVENTS_CREDIT）に入っている
        sources: [],
        karteCard: null,
        action: null,
        events: input.events,
      };
    case "housing": {
      const housing = conditions.housing;
      const state = housing === "rent" ? null : district.market[housing === "new" ? "house_built_within_20y" : "house_built_over_20y"];
      const title =
        housing === "rent" ? "借りるときの家賃" : `${district.name}の中古戸建て（${housing === "new" ? "築20年以内" : "築21年以上"}）`;
      return {
        ...base,
        title,
        missing: null,
        intro: housing === "rent" ? "借りるときの家賃の目安です。" : `「${HOUSING_LABELS[housing]}」で探すときの、過去の取引の参考値です。`,
        lines: [],
        sources:
          state && state.status !== "unavailable"
            ? [
                {
                  source: state.source,
                  period: state.status === "available" ? formatQuarterRange(state.value.periodFrom, state.value.periodTo) : undefined,
                },
              ]
            : [],
        karteCard: "housing",
        action: "住まいの相場を確かめる",
        // 新しめ（築20年以内）は件数によらず「件数少なめ・参考程度」を付ける（えらぶ 03 と同じ）
        market: { state, alwaysFew: housing === "new" },
      };
    }
  }
}
