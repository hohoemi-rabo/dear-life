// わが家の下見プラン（036。はじめの名前は「わが家の下見メモ」。2026-11-10 まさゆきさんの指示で改名。コードの名前は shitami のまま）。カルテやくらしで見たことの中から、現地で自分が確かめたいことだけを選んでおき、
// 下見の日にスマホで見返す。メモの主役は「現地で何を見るか・何を聞くか」で、相場・件数・出典はカルテに置いたままリンクでたどる。
// 確認点・質問は条件によらない一般的なもので、データの値や評価ではない（要件 6章の「想定」にあたる）。
// 距離（近い・徒歩◯分）と評価（便利・おすすめ）の言葉は入れない（場面のひな形と同じ決まり）
import type { KarteCard } from "../conditions/labels.ts";
import { hasChildren, hasNoCar, type Conditions } from "../conditions/model.ts";
import type { PinId } from "../kurashi/pins.ts";

// 並びはメモ欄・印刷で出す順。端末に残すのはこの ID だけ
export const SHITAMI_ITEM_IDS = ["bus-to-town", "walk-around-school", "old-house-questions"] as const;
export type ShitamiItemId = (typeof SHITAMI_ITEM_IDS)[number];

export type ShitamiItem = {
  id: ShitamiItemId;
  title: string;
  // 折りたたんだときも出す、当日にすることの一文（2026-11-10 まさゆきさん：閉じたままでも何をするか分かるように）
  summary: string;
  // 名前の下のひと言（見本「学校の位置と小学校区を地図で確認できます。」）
  lead: string | null;
  // 確認点の箱の見出しと中身（見本の黄色い箱）
  checkTitle: string;
  checks: readonly string[];
  // 箱の下の添え書き
  note: string | null;
  // 「＋ 下見プランに入れる」を置くカルテの詳細
  card: KarteCard;
};

export const SHITAMI_ITEMS: Readonly<Record<ShitamiItemId, ShitamiItem>> = {
  "bus-to-town": {
    id: "bus-to-town",
    title: "バスで街へ行って帰る",
    summary: "停留所まで歩き、行きと帰りの便を確かめる。",
    lead: null,
    checkTitle: "現地で試すこと",
    checks: ["住むあたりのバス停を地図で探す", "gofreely で調べた便に、実際に乗ってみる", "停留所で待つときの場所を見る"],
    note: null,
    card: "transport",
  },
  "walk-around-school": {
    id: "walk-around-school",
    title: "学校のまわりを親子で歩く",
    summary: "歩道が続いているか、どこで道路を渡るかを見る。",
    lead: "学校の位置と小学校区を地図で確認できます。",
    checkTitle: "現地で見ること",
    checks: ["歩道はどこまで続いている？", "道路を渡る場所はどこ？"],
    note: "通う学校は、住む住所が決まってから確認しましょう。",
    card: "childcare",
  },
  "old-house-questions": {
    id: "old-house-questions",
    title: "古めの家で聞くこと",
    summary: "見学のときに、冬の暖房や断熱、修繕のことを聞く。",
    lead: null,
    checkTitle: "見学で聞くこと",
    checks: ["冬はどんな暖房を使っていますか？", "窓や床の断熱工事はしましたか？", "屋根や水まわりはいつ修繕しましたか？"],
    note: null,
    card: "housing",
  },
};

type ItemConditions = Pick<Conditions, "children" | "car" | "housing">;

// 「＋ 下見プランに入れる」を出す条件（2026-11-10 まさゆきさん）。バスは車0台（カルテの「冬のおでかけ」のタブと同じ条件）、
// 学校は子ども1人以上、古めの家は「買う・古め」。一度入れた項目は、あとで条件を変えてもメモに残す
export function canAddShitamiItem(id: ShitamiItemId, conditions: ItemConditions): boolean {
  switch (id) {
    case "bus-to-town":
      return hasNoCar(conditions);
    case "walk-around-school":
      return hasChildren(conditions);
    case "old-house-questions":
      return conditions.housing === "old";
  }
}

const CARD_ITEMS: Partial<Readonly<Record<KarteCard, ShitamiItemId>>> = {
  transport: "bus-to-town",
  childcare: "walk-around-school",
  housing: "old-house-questions",
};

// カルテの詳細で「＋ 下見プランに入れる」を出す項目。条件に合わなければ null
export function shitamiItemForCard(card: KarteCard, conditions: ItemConditions): ShitamiItemId | null {
  const id = CARD_ITEMS[card];
  return id !== undefined && canAddShitamiItem(id, conditions) ? id : null;
}

// くらしのピンの吹き出しで「＋ 下見プランに入れる」を出す項目（見本 shitami-memo-overview-bus.png）。
// バスは冬の「バス・電車」「バス」（伊賀良の「路線バス」）のピン。鼎の「電車」のピンと高速バスには出さない
const PIN_ITEMS: Partial<Readonly<Record<PinId, ShitamiItemId>>> = {
  transit: "bus-to-town",
  bus: "bus-to-town",
  school: "walk-around-school",
  housing: "old-house-questions",
};

export function shitamiItemForPin(pin: PinId, conditions: ItemConditions): ShitamiItemId | null {
  const id = PIN_ITEMS[pin];
  return id !== undefined && canAddShitamiItem(id, conditions) ? id : null;
}

function isShitamiItemId(value: unknown): value is ShitamiItemId {
  return typeof value === "string" && (SHITAMI_ITEM_IDS as readonly string[]).includes(value);
}

// 端末に残した値を読む。端末の保存領域は書きかえられるので、知っている ID だけを決まった並びで残す
export function parseShitamiMemo(raw: string | null): ShitamiItemId[] {
  if (raw === null) return [];
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(value)) return [];
  return SHITAMI_ITEM_IDS.filter((id) => value.some((item: unknown) => isShitamiItemId(item) && item === id));
}

export function serializeShitamiMemo(ids: readonly ShitamiItemId[]): string {
  return JSON.stringify(SHITAMI_ITEM_IDS.filter((id) => ids.includes(id)));
}

// 地区ごとに分けて残す。地区を切りかえても、別の地区のメモは混ざらない
export function shitamiStorageKey(district: string): string {
  return `dearlife:shitami-memo:${district}`;
}

// 下見プランの欄の id。「下見プランを見る」はカルテ一覧のここへ移る（前に作ったリンクが動くよう、名前を変えても id は変えない）
export const SHITAMI_MEMO_ANCHOR = "shitami-memo";
