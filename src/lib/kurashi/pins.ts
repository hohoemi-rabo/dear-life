// くらしの場面の絵の上のピン（028 見本）。風景の中の場所をタップすると、その場所のデータをシートで見せる。
// どのピンを出すかと、絵の上のどこに置くかをここで決める。位置は絵に対する割合（％）で持ち、画面の幅が変わってもずれないようにする
import { hasChildren, type Conditions } from "../conditions/model.ts";
import type { ScenePlan } from "../conditions/scene.ts";
import type { DistrictEvent } from "../data/screen-data.ts";
import type { KurashiPictureId, KurashiPictures } from "../illust/assets.ts";

export type PinId = "school" | "event" | "housing" | "public" | "evacuation" | "population" | "transit" | "snow";

export const PIN_LABELS: Readonly<Record<PinId, string>> = {
  school: "学校",
  event: "地域の行事",
  housing: "住まい",
  public: "公共施設",
  evacuation: "避難場所",
  population: "人口",
  transit: "バス・電車",
  snow: "雪の道",
};

// x・y はピンの先が指す場所。side は札をピンのどちら側に伸ばすか（絵の右の端では左に伸ばして、はみ出さないようにする）。
// side は同じピンならスマホと PC でそろえる（ピンは1つのボタンで、並びの向きは切りかえない）
export type PinSpot = { x: number; y: number; side: "right" | "left" };

// 場所はまさゆきさんの指示（2026-10-30）：学校＝左中央の校舎、地域の行事＝右上の石段と神社、
// 住まい＝奥の谷の町並み、公共施設＝右中央の公民館（2026-10-31 に、同じ公民館の屋根を指す「歩こう会」のピンと重ならないよう、正面を指すように下げた）。
// 避難場所（夏）＝真ん中の体育館の屋根（2026-10-31。上郷の大雨の避難場所の例が上郷小学校体育館のため）。
// 人口（秋）＝奥の谷の町並み（2026-11-01 まさゆきさん、案A）。人口には決まった場所がないので、地区に住む人の暮らす町並みを指す。
// 同じ谷を指す住まいのピンとは、右上にずらして札を反対側（右）に伸ばす。
// バス・電車（冬）＝右下の駅（2026-11-01 まさゆきさん）。雪の道（冬・車あり）＝手前の橋。家族の頭にかからないよう、橋の左寄りを指す。
// 上郷の春・夏・秋・冬の絵は同じ構図なので、場所も同じものを使う。場所の決まっている行事は EVENT_PINS で行事ごとに立てる
const KAMISATO_WIDE: Readonly<Record<PinId, PinSpot>> = {
  school: { x: 27.3, y: 48, side: "right" },
  event: { x: 87, y: 38.5, side: "left" },
  housing: { x: 47, y: 38, side: "left" },
  public: { x: 75, y: 66, side: "left" },
  evacuation: { x: 55, y: 50, side: "right" },
  population: { x: 57, y: 35.5, side: "right" },
  transit: { x: 85, y: 69, side: "left" },
  snow: { x: 26, y: 76, side: "right" },
};
const KAMISATO_TALL: Readonly<Record<PinId, PinSpot>> = {
  school: { x: 27.6, y: 49, side: "right" },
  event: { x: 85, y: 40, side: "left" },
  housing: { x: 51, y: 39.5, side: "left" },
  public: { x: 72, y: 69.5, side: "left" },
  evacuation: { x: 68, y: 51, side: "right" },
  population: { x: 65, y: 41, side: "right" },
  transit: { x: 82, y: 71.5, side: "left" },
  snow: { x: 22, y: 77.5, side: "right" },
};

// 中心市街地（2026-11-02 まさゆきさんと決めた案）：バス・電車＝左の赤い屋根の駅、学校＝右奥の時計塔の校舎、
// 避難場所＝真ん中のアーチ屋根の建物、公共施設＝アーチ屋根の左の白い大きな建物（飯田駅の近くの建物が実際に公共施設で公民館でもある）、
// 住まい＝右寄りの家並み、雪の道＝手前の柵のすぐ奥の道路。人口は上郷と同じく奥の町並み
const CHUSHIN_WIDE: Readonly<Record<PinId, PinSpot>> = {
  school: { x: 87.5, y: 36, side: "left" },
  event: { x: 54, y: 60, side: "right" },
  housing: { x: 76, y: 53, side: "left" },
  public: { x: 42, y: 50, side: "right" },
  evacuation: { x: 59, y: 45.5, side: "right" },
  population: { x: 45.5, y: 33.5, side: "right" },
  transit: { x: 17.5, y: 47, side: "right" },
  snow: { x: 62, y: 73, side: "right" },
};
const CHUSHIN_TALL: Readonly<Record<PinId, PinSpot>> = {
  school: { x: 84, y: 40, side: "left" },
  event: { x: 57, y: 65, side: "right" },
  housing: { x: 84, y: 59, side: "left" },
  public: { x: 47, y: 50, side: "right" },
  evacuation: { x: 64.5, y: 50, side: "right" },
  population: { x: 40, y: 38.5, side: "right" },
  transit: { x: 19, y: 49, side: "right" },
  snow: { x: 61, y: 75, side: "right" },
};

export const PIN_SPOTS: Readonly<Record<KurashiPictureId, Readonly<Record<PinId, PinSpot>>>> = {
  "kurashi-kamisato-spring-wide": KAMISATO_WIDE,
  "kurashi-kamisato-spring-tall": KAMISATO_TALL,
  "kurashi-kamisato-summer-wide": KAMISATO_WIDE,
  "kurashi-kamisato-summer-tall": KAMISATO_TALL,
  "kurashi-kamisato-autumn-wide": KAMISATO_WIDE,
  "kurashi-kamisato-autumn-tall": KAMISATO_TALL,
  "kurashi-kamisato-winter-wide": KAMISATO_WIDE,
  "kurashi-kamisato-winter-tall": KAMISATO_TALL,
  "kurashi-chushin-spring-wide": CHUSHIN_WIDE,
  "kurashi-chushin-spring-tall": CHUSHIN_TALL,
  "kurashi-chushin-summer-wide": CHUSHIN_WIDE,
  "kurashi-chushin-summer-tall": CHUSHIN_TALL,
  "kurashi-chushin-autumn-wide": CHUSHIN_WIDE,
  "kurashi-chushin-autumn-tall": CHUSHIN_TALL,
  "kurashi-chushin-winter-wide": CHUSHIN_WIDE,
  "kurashi-chushin-winter-tall": CHUSHIN_TALL,
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
      "kurashi-kamisato-summer-wide": { x: 47.5, y: 57, side: "left" },
      "kurashi-kamisato-summer-tall": { x: 54, y: 58.5, side: "left" },
    },
  },
  // 秋（2026-11-01 まさゆきさん）。左中央の小学校の校庭。校舎を指す学校のピンと重ならないよう、校庭のまん中を指す
  上郷地区大運動会: {
    label: "大運動会",
    spots: {
      "kurashi-kamisato-autumn-wide": { x: 30.5, y: 63.5, side: "right" },
      "kurashi-kamisato-autumn-tall": { x: 33, y: 62.5, side: "right" },
    },
  },
  // 秋（2026-11-01 まさゆきさん）。右中央の公民館（春の歩こう会・夏の人形劇と同じ屋根）
  上郷地区文化祭: {
    label: "文化祭",
    spots: {
      "kurashi-kamisato-autumn-wide": { x: 82, y: 58.5, side: "left" },
      "kurashi-kamisato-autumn-tall": { x: 80, y: 60.5, side: "left" },
    },
  },
  // 冬（2026-11-01 まさゆきさん）。真ん中の体育館の正面（夏の春季スポーツ交流会と同じ場所）
  冬季スポーツ交流会: {
    label: "スポーツ",
    spots: {
      "kurashi-kamisato-winter-wide": { x: 47.5, y: 57, side: "left" },
      "kurashi-kamisato-winter-tall": { x: 54, y: 58.5, side: "left" },
    },
  },
  // 中心市街地の行事は、実際の場所ではなく絵の中の近い種類の場所に立てる（2026-11-02 まさゆきさん）。元の地区名はシートに出す。
  // 春（橋南）。小学生が防火標語を読み上げて町を歩く行事なので、真ん中の道路を指す（2026-11-03 まさゆきさん）。ロータリーから奥へのびる道。札は右の住まいの札を避けて左に伸ばす
  おひまち: {
    label: "おひまち",
    spots: {
      "kurashi-chushin-spring-wide": { x: 44, y: 60, side: "left" },
      "kurashi-chushin-spring-tall": { x: 47, y: 60.5, side: "left" },
    },
  },
  // 春（東野）。白い大きな建物（公民館）の左側。右側を指す公共施設のピンとは札を反対に伸ばして重ねない
  子ども寺子屋ひがしの: {
    label: "寺子屋",
    spots: {
      "kurashi-chushin-spring-wide": { x: 34, y: 50, side: "left" },
      "kurashi-chushin-spring-tall": { x: 33, y: 50, side: "left" },
    },
  },
  // 夏（丸山）。人形劇は公民館でする行事なので白い大きな建物の正面。札は、右のアーチ屋根の避難場所のピンにかからないよう左に伸ばす
  "いいだ人形劇フェスタ 丸山地区公演": {
    label: "人形劇",
    spots: {
      "kurashi-chushin-summer-wide": { x: 42, y: 52, side: "left" },
      "kurashi-chushin-summer-tall": { x: 42, y: 55, side: "left" },
    },
  },
  // 夏（橋北）。同じ白い大きな建物の屋根。人形劇のピンとは上下にずらして札を重ねない
  橋北地区文化祭: {
    label: "文化祭",
    spots: {
      "kurashi-chushin-summer-wide": { x: 34, y: 45, side: "left" },
      "kurashi-chushin-summer-tall": { x: 33, y: 45, side: "left" },
    },
  },
  // 秋（東野）。右奥の校庭。校舎を指す学校のピンと重ならないよう、スマホは校庭の左下の端を指す
  東野区民大運動会: {
    label: "大運動会",
    spots: {
      "kurashi-chushin-autumn-wide": { x: 83, y: 44, side: "left" },
      "kurashi-chushin-autumn-tall": { x: 72, y: 47, side: "left" },
    },
  },
  // 秋（丸山）。白い大きな建物の正面（夏の人形劇と同じ場所）
  丸山地区文化祭: {
    label: "文化祭",
    spots: {
      "kurashi-chushin-autumn-wide": { x: 42, y: 52, side: "left" },
      "kurashi-chushin-autumn-tall": { x: 42, y: 55, side: "left" },
    },
  },
  // 冬（丸山）。もちつきは外でもする行事なので、右手前の公園
  "お正月遊び・もちつき大会": {
    label: "もちつき",
    spots: {
      "kurashi-chushin-winter-wide": { x: 88, y: 66, side: "left" },
      "kurashi-chushin-winter-tall": { x: 92, y: 70, side: "left" },
    },
  },
  // 冬（橋北）。白い大きな建物の正面。札は、駅のピンの札にかからないよう低めに、左へ伸ばす
  "書初め・お正月遊び": {
    label: "書初め",
    spots: {
      "kurashi-chushin-winter-wide": { x: 42, y: 52, side: "left" },
      "kurashi-chushin-winter-tall": { x: 46, y: 56.5, side: "left" },
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
  // 夏の場面（大雨と避難）の文は避難場所のピンに、秋の場面（地区の行事）の文は人口のピンに出す。
  // 冬は駅・バス停のピンを車があってもいつも出し（2026-11-01 まさゆきさん）、車0台の場面の文（バスと電車の便）をそこに出す。
  // 車ありの場面の文（雪と路面の凍結）は雪の道のピンに出す
  const isWinter = plan.axis === "winter-transit" || plan.axis === "winter-car";
  const evacuation = plan.axis === "summer-evacuation" ? [pinOf("evacuation", pictures)] : [];
  const transit = isWinter ? [pinOf("transit", pictures)] : [];
  const population = plan.axis === "autumn-events" ? [pinOf("population", pictures)] : [];
  const snow = plan.axis === "winter-car" ? [pinOf("snow", pictures)] : [];
  const pins = [
    pinOf("school", pictures),
    ...evacuation,
    ...transit,
    ...eventPins(pictures, events),
    pinOf("housing", pictures),
    ...population,
    ...snow,
  ];
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
    case "autumn-events":
      return "population";
    case "winter-transit":
      return "transit";
    case "winter-car":
      return "snow";
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
