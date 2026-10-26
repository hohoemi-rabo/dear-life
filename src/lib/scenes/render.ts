// 場面の文章を作る（要件 6章・6.3）。ひな形を選び、文ごとの条件で絞り、差し込み部分にデータを入れる。
// 同じ条件・同じデータなら必ず同じ文章になる（ランダムにしない・AI で作らない）
import { planScene, selectSceneSentences, selectSceneTemplate, type ScenePlan, type Season } from "../conditions/scene.ts";
import type { Conditions } from "../conditions/model.ts";
import { KARTE_CARD_LABELS, type KarteCard } from "../conditions/labels.ts";
import type { DistrictData, DistrictEvent, SceneSentence, ScreenData, SourceInfo } from "../data/screen-data.ts";
import { NOTICES } from "../notices.ts";
import {
  PLACEHOLDERS,
  SENTENCE_SOURCE_TOPICS,
  fillPlaceholders,
  isPlaceholderKey,
  placeholdersIn,
  sceneNoticeMessage,
  type PlaceholderContext,
  type SceneTopic,
  type TransitRef,
} from "./placeholders.ts";

export type SceneLine =
  | {
      status: "shown";
      position: number;
      kind: SceneSentence["kind"];
      text: string;
      // データの文：出典の印／地区の情報：確認日（要件 6.4）
      sources: readonly SourceInfo[];
      checkedOn: string | null;
      // 「カルテで確かめる」で移るカード（F-14）
      karteCard: KarteCard | null;
      transit: TransitRef | null;
    }
  // 値が出せない文の代わりの知らせ。同じ話題・同じ状態の知らせは場面の中で1つにまとめる
  | {
      status: "none" | "unavailable";
      position: number;
      topic: SceneTopic;
      message: string;
      karteCard: KarteCard | null;
    };

export type Scene = {
  plan: ScenePlan;
  templateTitle: string;
  lines: readonly SceneLine[];
  // 場面に使ったデータの出典（出てきた順・重複なし）。場面の下に出典と確認日を出す（6.2）
  sources: readonly SourceInfo[];
  // 場面に添える注意書き
  notices: readonly string[];
  // 場面に出す地区の行事（1〜2個。F-13）
  events: readonly DistrictEvent[];
};

const SCENE_NOTICES: Readonly<Record<ScenePlan["axis"], readonly string[]>> = {
  "spring-school": [NOTICES.schoolDistrict],
  "spring-public-facility": [],
  "summer-evacuation": [],
  "autumn-events": [NOTICES.events],
  "winter-transit": [NOTICES.carFree],
  "winter-car": [],
};

const KARTE_CARD_BY_LABEL = new Map(Object.entries(KARTE_CARD_LABELS).map(([card, label]) => [label, card as KarteCard]));

// その季節の地区の行事を、並び順どおりに最大2つ。秋・子どもありは子ども向けを先にする（要件 4章）
export function selectSceneEvents(district: DistrictData, plan: ScenePlan, limit = 2): DistrictEvent[] {
  const seasonal = district.events.filter((event) => event.season === plan.season);
  const ordered = plan.preferChildEvents
    ? [...seasonal.filter((event) => event.isForChildren), ...seasonal.filter((event) => !event.isForChildren)]
    : seasonal;
  return ordered.slice(0, limit);
}

type Evaluated =
  | { status: "shown"; text: string; sources: SourceInfo[]; checkedOn: string | null; transit: TransitRef | null }
  | { status: "none" | "unavailable"; topic: SceneTopic }
  | { status: "skip" };

function topicOf(key: string): SceneTopic | null {
  if (!isPlaceholderKey(key)) throw new Error(`知らない差し込み部分です：{${key}}`);
  return PLACEHOLDERS[key].topic;
}

// 1つの本文に値を入れる。この地区に当てはまらない値 → 文ごと出さない、データ未取得 → 未取得、該当なし → 該当なし の順に強い
function evaluateBody(body: string, context: PlaceholderContext, fallbackTopic: SceneTopic | null): Evaluated {
  const keys = placeholdersIn(body);
  const resolved = keys.map((key) => {
    if (!isPlaceholderKey(key)) throw new Error(`知らない差し込み部分です：{${key}}`);
    return { key, value: PLACEHOLDERS[key].resolve(context) };
  });
  if (resolved.some(({ value }) => value.status === "skip")) return { status: "skip" };
  for (const status of ["unavailable", "none"] as const) {
    const found = resolved.find(({ value }) => value.status === status);
    if (found) {
      const topic = topicOf(found.key) ?? fallbackTopic;
      if (topic === null) throw new Error(`知らせの話題が決まりません：{${found.key}}`);
      return { status, topic };
    }
  }
  const values = new Map<string, string>();
  const sources: SourceInfo[] = [];
  let checkedOn: string | null = null;
  let transit: TransitRef | null = null;
  for (const { key, value } of resolved) {
    if (value.status !== "value") continue;
    values.set(key, value.text);
    if (value.source && !sources.some((source) => source.id === value.source?.id)) sources.push(value.source);
    checkedOn ??= value.checkedOn ?? null;
    transit ??= value.transit ?? null;
  }
  return { status: "shown", text: fillPlaceholders(body, values), sources, checkedOn, transit };
}

function evaluateSentence(sentence: SceneSentence, context: PlaceholderContext, allSources: readonly SourceInfo[]): Evaluated {
  // 本文に書いた事実の出典が未公開なら、文を出さずに「データ未取得」にする
  let sentenceSource: SourceInfo | null = null;
  let sourceTopic: SceneTopic | null = null;
  if (sentence.source_id !== null) {
    sourceTopic = SENTENCE_SOURCE_TOPICS[sentence.source_id] ?? null;
    if (sourceTopic === null) throw new Error(`文の出典の話題が決まっていません：${sentence.source_id}`);
    sentenceSource = allSources.find((source) => source.id === sentence.source_id) ?? null;
    if (sentenceSource === null) return { status: "unavailable", topic: sourceTopic };
  }

  let result = evaluateBody(sentence.body, context, sourceTopic);
  // 値が「該当なし」のときだけ言いかえを使う。データ未取得は言いかえで隠さない
  if (result.status === "none" && sentence.fallback_body !== null) {
    const fallback = evaluateBody(sentence.fallback_body, context, sourceTopic);
    if (fallback.status !== "skip") result = fallback;
  }
  if (result.status === "shown" && sentenceSource !== null) {
    result = { ...result, sources: [...result.sources, sentenceSource] };
  }
  return result;
}

// 選んだ季節・条件の場面。地区が未選択、またはその季節に公開済みのひな形がないときは null（画面は「準備中」）
export function renderScene(season: Season, conditions: Conditions, data: ScreenData): Scene | null {
  if (conditions.district === null) return null;
  const template = selectSceneTemplate(data.sceneTemplates, season, conditions);
  if (template === null) return null;

  const plan = planScene(season, conditions);
  const district = data.districts[conditions.district];
  const events = selectSceneEvents(district, plan);
  const context: PlaceholderContext = { district, plan, events };

  const lines: SceneLine[] = [];
  for (const sentence of selectSceneSentences(template.sentences, conditions)) {
    const karteCard = sentence.karte_card === null ? null : (KARTE_CARD_BY_LABEL.get(sentence.karte_card) ?? null);
    const result = evaluateSentence(sentence, context, data.sources);
    if (result.status === "skip") continue;
    if (result.status === "shown") {
      lines.push({ position: sentence.position, kind: sentence.kind, karteCard, ...result });
      continue;
    }
    const { status, topic } = result;
    if (lines.some((line) => line.status === status && line.topic === topic)) continue;
    lines.push({ status, position: sentence.position, topic, message: sceneNoticeMessage(topic, status), karteCard });
  }

  const sources: SourceInfo[] = [];
  for (const line of lines) {
    if (line.status !== "shown") continue;
    for (const source of line.sources) if (!sources.some((s) => s.id === source.id)) sources.push(source);
  }

  return { plan, templateTitle: template.title, lines, sources, notices: SCENE_NOTICES[plan.axis], events };
}
