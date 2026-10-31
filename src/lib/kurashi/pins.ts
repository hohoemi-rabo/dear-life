// くらしの場面の絵の上のピン（028 見本）。風景の中の場所をタップすると、その場所のデータをシートで見せる。
// どのピンを出すかと、絵の上のどこに置くかをここで決める。位置は絵に対する割合（％）で持ち、画面の幅が変わってもずれないようにする
import { hasChildren, type Conditions } from "../conditions/model.ts";
import type { ScenePlan } from "../conditions/scene.ts";
import type { DistrictEvent } from "../data/screen-data.ts";
import type { KurashiPictureId, KurashiPictures } from "../illust/assets.ts";

export type PinId = "school" | "event" | "housing" | "public" | "evacuation";

export const PIN_LABELS: Readonly<Record<PinId, string>> = {
  school: "学校",
  event: "地域の行事",
  housing: "住まい",
  public: "公共施設",
  evacuation: "避難場所",
};

// x・y はピンの先が指す場所。side は札をピンのどちら側に伸ばすか（絵の右の端では左に伸ばして、はみ出さないようにする）。
// side は同じピンならスマホと PC でそろえる（ピンは1つのボタンで、並びの向きは切りかえない）
export type PinSpot = { x: number; y: number; side: "right" | "left" };

// 場所はまさゆきさんの指示（2026-10-30）：学校＝左中央の校舎、地域の行事＝右上の石段と神社、
// 住まい＝奥の谷の町並み、公共施設＝右中央の公民館（2026-10-31 に、同じ公民館の屋根を指す「歩こう会」のピンと重ならないよう、正面を指すように下げた）。
// 避難場所（夏）＝真ん中の体育館の屋根（2026-10-31。上郷の大雨の避難場所の例が上郷小学校体育館のため）。
// 上郷の春と夏の絵は同じ構図なので、場所も同じものを使う。場所の決まっている行事は EVENT_PINS で行事ごとに立てる
const KAMISATO_WIDE: Readonly<Record<PinId, PinSpot>> = {
  school: { x: 27.3, y: 48, side: "right" },
  event: { x: 87, y: 38.5, side: "left" },
  housing: { x: 47, y: 38, side: "left" },
  public: { x: 75, y: 66, side: "left" },
  evacuation: { x: 55, y: 50, side: "right" },
};
const KAMISATO_TALL: Readonly<Record<PinId, PinSpot>> = {
  school: { x: 27.6, y: 49, side: "right" },
  event: { x: 85, y: 40, side: "left" },
  housing: { x: 51, y: 39.5, side: "left" },
  public: { x: 72, y: 69.5, side: "left" },
  evacuation: { x: 68, y: 51, side: "right" },
};

export const PIN_SPOTS: Readonly<Record<KurashiPictureId, Readonly<Record<PinId, PinSpot>>>> = {
  "kurashi-kamisato-spring-wide": KAMISATO_WIDE,
  "kurashi-kamisato-spring-tall": KAMISATO_TALL,
  "kurashi-kamisato-summer-wide": KAMISATO_WIDE,
  "kurashi-kamisato-summer-tall": KAMISATO_TALL,
};

// 行事ごとの場所（2026-10-31 まさゆきさん：行事は行われる場所にピンを立てる）。キーは行事の名前（district_events.name）。
// 絵は地区ごとなので、名前が同じでもほかの地区の行事とは混ざらない。label はピンの札の短い名前。
// ここにない行事（名前を Table Editor で変えたときも）は、PIN_SPOTS の event（「地域の行事」）のピンにまとめる
export const EVENT_PINS: Readonly<Record<string, { label: string; spots: Partial<Record<KurashiPictureId, PinSpot>> }>> = {
  // 下黒田諏訪神社（右上の石段と神社）
  黒田人形奉納上演: {
    label: "黒田人形",
    spots: {
      "kurashi-kamisato-spring-wide": { x: 87, y: 38.5, side: "left" },
      "kurashi-kamisato-spring-tall": { x: 85, y: 40, side: "left" },
    },
  },
  // 分館ごとに歩く（右中央の公民館）。公民館の屋根を指す。公共施設のピン（同じ公民館の正面）とは上下・左右をずらして札を重ねない
  上郷歩こう会: {
    label: "歩こう会",
    spots: {
      "kurashi-kamisato-spring-wide": { x: 82, y: 58.5, side: "left" },
      "kurashi-kamisato-spring-tall": { x: 80, y: 60.5, side: "left" },
    },
  },
  // 夏（2026-10-31 まさゆきさん）。会場は地区内の複数か所なので、代表して右中央の公民館（春の歩こう会と同じ屋根）に立てる
  "いいだ人形劇フェスタ 上郷地区公演": {
    label: "人形劇",
    spots: {
      "kurashi-kamisato-summer-wide": { x: 82, y: 58.5, side: "left" },
      "kurashi-kamisato-summer-tall": { x: 80, y: 60.5, side: "left" },
    },
  },
  // 夏（2026-10-31 まさゆきさん）。真ん中の体育館。屋根を指す避難場所のピンと重ならないよう、正面を指して札を左に伸ばす
  春季スポーツ交流会: {
    label: "スポーツ",
    spots: {
      "kurashi-kamisato-summer-wide": { x: 50, y: 56, side: "left" },
      "kurashi-kamisato-summer-tall": { x: 54, y: 58.5, side: "left" },
    },
  },
};

// 絵の上に立てるピン1本。kind はシートの中身の種類、key はピンごとに分かれる名前（行事は行事ごと）。
// 行事のピンは、そのピンの行事だけをシートに出す
export type ScenePinSpec = {
  key: string;
  kind: PinId;
  label: string;
  tall: PinSpot;
  wide: PinSpot;
  events: readonly DistrictEvent[] | null;
};

// 下の「春の楽しみ」のカードから開く、その季節の行事すべてのシート。絵の上にはピンを立てない
export const ALL_EVENTS_KEY = "events";

function pinOf(kind: PinId, pictures: KurashiPictures, events: readonly DistrictEvent[] | null = null): ScenePinSpec {
  return { key: kind, kind, label: PIN_LABELS[kind], tall: PIN_SPOTS[pictures.tall][kind], wide: PIN_SPOTS[pictures.wide][kind], events };
}

// 行事のピン：場所の決まっている行事は1つずつ、それ以外は「地域の行事」に1本にまとめる（行事がまだないときも「準備中」を出すため1本立てる）
function eventPins(pictures: KurashiPictures, events: readonly DistrictEvent[]): ScenePinSpec[] {
  const placed: ScenePinSpec[] = [];
  const rest: DistrictEvent[] = [];
  for (const event of events) {
    const pin = Object.hasOwn(EVENT_PINS, event.name) ? EVENT_PINS[event.name] : undefined;
    const tall = pin?.spots[pictures.tall];
    const wide = pin?.spots[pictures.wide];
    if (pin && tall && wide) placed.push({ key: `event-${event.name}`, kind: "event", label: pin.label, tall, wide, events: [event] });
    else rest.push(event);
  }
  return rest.length > 0 || placed.length === 0 ? [...placed, pinOf("event", pictures, rest)] : placed;
}

// 出すピンと並び（読み上げ・キーボードで移る順）。学校は子どもがいなくてもいつも出す（2026-10-30 まさゆきさん：
// これから子どもを考えている家族もいるため）。子どもなしの春の場面の文（地区の公共施設）は、公共施設のピンに出す
export function scenePins(
  plan: ScenePlan,
  conditions: Pick<Conditions, "children">,
  pictures: KurashiPictures,
  events: readonly DistrictEvent[],
): ScenePinSpec[] {
  // 夏の場面（大雨と避難）の文は避難場所のピンに出す
  const evacuation = plan.axis === "summer-evacuation" ? [pinOf("evacuation", pictures)] : [];
  const pins = [pinOf("school", pictures), ...evacuation, ...eventPins(pictures, events), pinOf("housing", pictures)];
  if (!hasChildren(conditions) && plan.axis === "spring-public-facility") pins.push(pinOf("public", pictures));
  return pins;
}

// 開いているピン。「春の楽しみ」から開いたときは、行事すべてを最初の行事のピンの場所（吹き出し・小さな絵）で出す
export function openPinSpec(pins: readonly ScenePinSpec[], key: string | null, events: readonly DistrictEvent[]): ScenePinSpec | null {
  if (key === null) return null;
  if (key !== ALL_EVENTS_KEY) return pins.find((pin) => pin.key === key) ?? null;
  const first = pins.find((pin) => pin.kind === "event");
  return first ? { ...first, key: ALL_EVENTS_KEY, label: PIN_LABELS.event, events } : null;
}

// 場面の文（ひな形）をどのピンのシートに出すか。絵のある場面の軸ごとに1つ
export function scenePinFor(plan: ScenePlan): PinId | null {
  switch (plan.axis) {
    case "spring-school":
      return "school";
    case "spring-public-facility":
      return "public";
    case "summer-evacuation":
      return "evacuation";
    default:
      return null;
  }
}

// シートの小さな絵：横長の絵から、ピンの場所のまわりを拡大して切り出す（新しい絵を頼まない。計画のとおり）。
// 絵の幅を枠の幅の scale 倍にしたとき、場所 (x, y)％ が枠の真ん中に来る background-position を返す。
// 枠の縦横の比（frameAspect＝幅÷高さ）が絵（pictureAspect）より横長なら、縦はそのぶん大きく拡大される
export function thumbnailPosition(
  spot: Pick<PinSpot, "x" | "y">,
  scale: number,
  frameAspect: number,
  pictureAspect: number,
): { x: number; y: number } {
  const center = (percent: number, zoom: number) => Math.min(100, Math.max(0, (((percent / 100) * zoom - 0.5) / (zoom - 1)) * 100));
  return { x: center(spot.x, scale), y: center(spot.y, (scale * frameAspect) / pictureAspect) };
}
