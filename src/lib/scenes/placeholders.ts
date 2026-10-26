// 場面の文の差し込み部分（{地区名} {保育施設の数} など。要件 6.3）。どの差し込みがどのデータから・どう書くかをここだけで決める。
// 値は「出す」「該当なし」「データ未取得」「この地区には当てはまらない（文ごと出さない）」の4つのどれかで返す
import type { ScenePlan } from "../conditions/scene.ts";
import type { BusOuting, DataState, DistrictData, DistrictEvent, Facility, Outing, SourceInfo } from "../data/screen-data.ts";
import { formatJaDate, formatServiceTime } from "../format.ts";

// 値が出せないときに、画面で何のデータの話かを伝える単位。同じ話題の知らせは場面の中で1つにまとめる
export type SceneTopic =
  | "childcare"
  | "schoolDistricts"
  | "publicFacilities"
  | "evacuation"
  | "events"
  | "population"
  | "busOuting"
  | "trainOuting"
  | "winterRoads";

// 冬・車0台のおでかけの文は、gofreely（1.1）とカルテの交通カードに渡せるよう便そのものも返す
export type TransitRef = { mode: "bus"; outing: BusOuting } | { mode: "train"; outing: Outing };

export type PlaceholderValue =
  | { status: "value"; text: string; source: SourceInfo | null; checkedOn?: string; transit?: TransitRef }
  | { status: "none"; source: SourceInfo | null }
  | { status: "unavailable" }
  // この地区には当てはまらない（例：駅のない伊賀良の電車の文）。文ごと出さず、知らせも出さない
  | { status: "skip" };

export type PlaceholderContext = {
  district: DistrictData;
  plan: ScenePlan;
  // 場面に出す行事（selectSceneEvents の結果）。差し込みにはいちばん目を使う
  events: readonly DistrictEvent[];
};

type Placeholder = {
  // 地区名のようにいつも出せるものは null（知らせの話題にならず、データの文の根拠にもならない）
  topic: SceneTopic | null;
  resolve: (context: PlaceholderContext) => PlaceholderValue;
};

const UNAVAILABLE = { status: "unavailable" } as const;
const SKIP = { status: "skip" } as const;

function fromState<T>(state: DataState<T>, pick: (value: T) => string | null): PlaceholderValue {
  if (state.status === "unavailable") return UNAVAILABLE;
  if (state.status === "none") return { status: "none", source: state.source };
  const text = pick(state.value);
  return text === null ? { status: "none", source: state.source } : { status: "value", text, source: state.source };
}

function count(value: number): string {
  return value.toLocaleString("ja-JP");
}

function countOf<T>(state: DataState<readonly T[]>, match: (item: T) => boolean = () => true): PlaceholderValue {
  return fromState(state, (items) => {
    const n = items.filter(match).length;
    return n > 0 ? count(n) : null;
  });
}

// ---- 「たとえば◯◯」で出す施設の選び方（ランダムにしない） ----
// 一覧は screen_data() が種類・名前の順に固定して返すので、その並びの中で決まりどおりに1つ選ぶ

// 保育施設：認可外・その他（病児保育など）しかない地区でなければ、それ以外から選ぶ
const CHILDCARE_LAST_SUBKINDS = new Set(["認可外保育所", "その他"]);

export function pickChildcareExample(items: readonly Facility[]): Facility | null {
  return items.find((item) => !CHILDCARE_LAST_SUBKINDS.has(item.subkind ?? "")) ?? items[0] ?? null;
}

// 公共施設：地区の行事の拠点になる公民館 → 図書館 → そのほか の順
const PUBLIC_FACILITY_SUBKIND_ORDER = ["公民館", "図書館"];

export function pickPublicFacilityExample(items: readonly Facility[]): Facility | null {
  for (const subkind of PUBLIC_FACILITY_SUBKIND_ORDER) {
    const found = items.find((item) => item.subkind === subkind);
    if (found) return found;
  }
  return items[0] ?? null;
}

// 夏の大雨：洪水と土砂災害の両方に使える避難場所
const isHeavyRainSite = (site: { hazards: readonly string[] }) => site.hazards.includes("flood") && site.hazards.includes("landslide");

function exampleOf<T>(
  state: DataState<readonly T[]>,
  pick: (items: readonly T[]) => T | null,
  field: (item: T) => string | null,
): PlaceholderValue {
  return fromState(state, (items) => {
    const item = pick(items);
    return item === null ? null : field(item);
  });
}

// ---- おでかけ ----

const DAY_TYPE_TEXT: Readonly<Record<BusOuting["dayType"], string>> = { 平日: "平日", 土曜: "土曜日", 日曜: "日曜日" };

function busValue(context: PlaceholderContext, pick: (outing: BusOuting) => string | null): PlaceholderValue {
  const state = context.district.busOuting;
  const value = fromState(state, pick);
  return value.status === "value" && state.status === "available" ? { ...value, transit: { mode: "bus", outing: state.value } } : value;
}

// 駅のない地区（出典は公開済みで駅が該当なし）では、電車の文は出さない（026）
function trainValue(context: PlaceholderContext, pick: (outing: Outing) => string | null): PlaceholderValue {
  if (context.district.trainStations.status === "none") return SKIP;
  const state = context.district.trainOuting;
  const value = fromState(state, pick);
  return value.status === "value" && state.status === "available" ? { ...value, transit: { mode: "train", outing: state.value } } : value;
}

// ---- 行事 ----

function eventValue(context: PlaceholderContext, pick: (event: DistrictEvent) => string): PlaceholderValue {
  const [event] = context.events;
  // 行事は手入力で出典の行を持たない。その季節の行事がまだないときは「この季節の行事は準備中です」（F-13）
  if (event === undefined) return { status: "none", source: null };
  return { status: "value", text: pick(event), source: null, checkedOn: event.checkedOn };
}

// 区（分館）ごとに中身が違う行事は、地区全体の行事のように書かない（要件 7.2）
function eventName(event: DistrictEvent): string {
  return event.scope === "区ごと" ? `${event.name}（区によって違います）` : event.name;
}

export const PLACEHOLDERS = {
  地区名: { topic: null, resolve: ({ district }): PlaceholderValue => ({ status: "value", text: district.name, source: null }) },

  // 春・子どもあり
  保育施設の数: { topic: "childcare", resolve: ({ district }) => countOf(district.childcare) },
  保育施設名: { topic: "childcare", resolve: ({ district }) => exampleOf(district.childcare, pickChildcareExample, (f) => f.name) },
  保育施設の住所: { topic: "childcare", resolve: ({ district }) => exampleOf(district.childcare, pickChildcareExample, (f) => f.address) },
  小学校区: {
    topic: "schoolDistricts",
    resolve: ({ district }) => fromState(district.elementarySchoolDistricts, (names) => names.join("・")),
  },
  中学校区: {
    topic: "schoolDistricts",
    resolve: ({ district }) => fromState(district.juniorHighSchoolDistricts, (names) => names.join("・")),
  },

  // 春・子どもなし
  公共施設の数: { topic: "publicFacilities", resolve: ({ district }) => countOf(district.publicFacilities) },
  公共施設名: {
    topic: "publicFacilities",
    resolve: ({ district }) => exampleOf(district.publicFacilities, pickPublicFacilityExample, (f) => f.name),
  },
  公共施設の住所: {
    topic: "publicFacilities",
    resolve: ({ district }) => exampleOf(district.publicFacilities, pickPublicFacilityExample, (f) => f.address),
  },

  // 夏
  避難場所の数: { topic: "evacuation", resolve: ({ district }) => countOf(district.evacuationSites) },
  大雨の避難場所の数: { topic: "evacuation", resolve: ({ district }) => countOf(district.evacuationSites, isHeavyRainSite) },
  大雨の避難場所名: {
    topic: "evacuation",
    resolve: ({ district }) => exampleOf(district.evacuationSites, (sites) => sites.find(isHeavyRainSite) ?? null, (f) => f.name),
  },
  大雨の避難場所の住所: {
    topic: "evacuation",
    resolve: ({ district }) => exampleOf(district.evacuationSites, (sites) => sites.find(isHeavyRainSite) ?? null, (f) => f.address),
  },

  // 秋
  行事名: { topic: "events", resolve: (context) => eventValue(context, eventName) },
  行事の時期: { topic: "events", resolve: (context) => eventValue(context, (event) => event.timingNote) },
  人口: { topic: "population", resolve: ({ district }) => fromState(district.population, (p) => count(p.total)) },
  子どもの人口: {
    topic: "population",
    resolve: ({ district }) => fromState(district.population, (p) => (p.age0to14 === null ? null : count(p.age0to14))),
  },
  人口の時点: { topic: "population", resolve: ({ district }) => fromState(district.population, (p) => `${formatJaDate(p.asOf)}時点`) },

  // 冬・車0台のバス（010）。本数は行き先へ乗りかえなしで行く便の数
  バスの曜日: { topic: "busOuting", resolve: (context) => busValue(context, (o) => DAY_TYPE_TEXT[o.dayType]) },
  バスの乗り場: { topic: "busOuting", resolve: (context) => busValue(context, (o) => o.originName) },
  バスの降り場: { topic: "busOuting", resolve: (context) => busValue(context, (o) => o.destinationName) },
  バスの発車時刻: { topic: "busOuting", resolve: (context) => busValue(context, (o) => formatServiceTime(o.outbound.departure)) },
  バスの到着時刻: { topic: "busOuting", resolve: (context) => busValue(context, (o) => formatServiceTime(o.outbound.arrival)) },
  バスの本数: { topic: "busOuting", resolve: (context) => busValue(context, (o) => count(o.outboundTripsPerDay)) },
  バスの帰りの発車時刻: { topic: "busOuting", resolve: (context) => busValue(context, (o) => formatServiceTime(o.return.departure)) },
  // 次の便がなければ「該当なし」。文の fallback_body（「そのあとの帰りの便はありません」）に切りかわる
  バスの次の便の時刻: {
    topic: "busOuting",
    resolve: (context) => busValue(context, (o) => (o.nextReturn === null ? null : formatServiceTime(o.nextReturn.departure))),
  },

  // 冬・車0台の電車（026）。本数は特急を除いた数
  電車の乗り場: { topic: "trainOuting", resolve: (context) => trainValue(context, (o) => o.originName) },
  電車の降り場: { topic: "trainOuting", resolve: (context) => trainValue(context, (o) => o.destinationName) },
  電車の種別: { topic: "trainOuting", resolve: (context) => trainValue(context, (o) => o.outbound.line) },
  電車の発車時刻: { topic: "trainOuting", resolve: (context) => trainValue(context, (o) => formatServiceTime(o.outbound.departure)) },
  電車の到着時刻: { topic: "trainOuting", resolve: (context) => trainValue(context, (o) => formatServiceTime(o.outbound.arrival)) },
  電車の本数: { topic: "trainOuting", resolve: (context) => trainValue(context, (o) => count(o.outboundTripsPerDay)) },
  電車の帰りの発車時刻: { topic: "trainOuting", resolve: (context) => trainValue(context, (o) => formatServiceTime(o.return.departure)) },
  電車の次の便の時刻: {
    topic: "trainOuting",
    resolve: (context) => trainValue(context, (o) => (o.nextReturn === null ? null : formatServiceTime(o.nextReturn.departure))),
  },
} as const satisfies Record<string, Placeholder>;

export type PlaceholderKey = keyof typeof PLACEHOLDERS;

export function isPlaceholderKey(key: string): key is PlaceholderKey {
  return Object.hasOwn(PLACEHOLDERS, key);
}

const PLACEHOLDER_PATTERN = /\{([^{}]*)\}/g;

// 本文の差し込み部分を、出てくる順に返す（同じものは1つ）
export function placeholdersIn(body: string): string[] {
  return [...new Set([...body.matchAll(PLACEHOLDER_PATTERN)].map((match) => match[1]))];
}

export function fillPlaceholders(body: string, values: ReadonlyMap<string, string>): string {
  return body.replace(PLACEHOLDER_PATTERN, (_, key: string) => {
    const value = values.get(key);
    if (value === undefined) throw new Error(`差し込みの値がありません：{${key}}`);
    return value;
  });
}

// 本文に書いた事実の出典（scene_sentences.source_id）と、その話題
export const SENTENCE_SOURCE_TOPICS: Readonly<Record<string, SceneTopic>> = {
  rakuen_shinshu_iida_sheet: "winterRoads",
};

// 値が出せないときの知らせ（画面にそのまま出す）。「該当なし」と「データ未取得」を区別する（F-09）
export const SCENE_TOPIC_LABELS: Readonly<Record<SceneTopic, string>> = {
  childcare: "保育園・幼稚園等",
  schoolDistricts: "学区",
  publicFacilities: "公共施設",
  evacuation: "避難場所",
  events: "地区の行事",
  population: "地区の人口",
  busOuting: "バスの便",
  trainOuting: "電車の便",
  winterRoads: "冬の道路のようす",
};

const NONE_MESSAGES: Partial<Record<SceneTopic, string>> = {
  events: "この季節の行事は準備中です",
  busOuting: "この条件で使えるバスの便は見つかりませんでした",
  trainOuting: "この条件で使える電車の便は見つかりませんでした",
};

export function sceneNoticeMessage(topic: SceneTopic, status: "none" | "unavailable"): string {
  if (status === "unavailable") return `${SCENE_TOPIC_LABELS[topic]}：データ未取得`;
  return NONE_MESSAGES[topic] ?? `${SCENE_TOPIC_LABELS[topic]}：該当なし`;
}
