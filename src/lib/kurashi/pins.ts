// くらしの場面の絵の上のピン（028 見本）。風景の中の場所をタップすると、その場所のデータをシートで見せる。
// どのピンを出すかと、絵の上のどこに置くかをここで決める。位置は絵に対する割合（％）で持ち、画面の幅が変わってもずれないようにする
import { hasChildren, type Conditions } from "../conditions/model.ts";
import type { ScenePlan } from "../conditions/scene.ts";
import type { KurashiPictureId } from "../illust/assets.ts";

export type PinId = "school" | "event" | "housing" | "public";

export const PIN_LABELS: Readonly<Record<PinId, string>> = {
  school: "学校",
  event: "地域の行事",
  housing: "住まい",
  public: "公共施設",
};

// x・y はピンの先が指す場所。side は札をピンのどちら側に伸ばすか（絵の右の端では左に伸ばして、はみ出さないようにする）。
// side は同じピンならスマホと PC でそろえる（ピンは1つのボタンで、並びの向きは切りかえない）
export type PinSpot = { x: number; y: number; side: "right" | "left" };

// 場所はまさゆきさんの指示（2026-10-30）：学校＝左中央の校舎、地域の行事（黒田人形奉納上演）＝右上の石段と神社、
// 住まい＝奥の谷の町並み、公共施設＝右中央の公民館
export const PIN_SPOTS: Readonly<Record<KurashiPictureId, Readonly<Record<PinId, PinSpot>>>> = {
  "kurashi-kamisato-spring-wide": {
    school: { x: 26.5, y: 32, side: "right" },
    event: { x: 87, y: 14, side: "left" },
    housing: { x: 57, y: 24, side: "left" },
    public: { x: 78, y: 41, side: "left" },
  },
  "kurashi-kamisato-spring-tall": {
    school: { x: 30, y: 31, side: "right" },
    event: { x: 84, y: 16, side: "left" },
    housing: { x: 48, y: 17.5, side: "left" },
    public: { x: 80, y: 44, side: "left" },
  },
};

// 出すピンと並び（読み上げ・キーボードで移る順）。学校は子どもがいなくてもいつも出す（2026-10-30 まさゆきさん：
// これから子どもを考えている家族もいるため）。子どもなしの春の場面の文（地区の公共施設）は、公共施設のピンに出す
export function pinsFor(plan: ScenePlan, conditions: Pick<Conditions, "children">): PinId[] {
  const pins: PinId[] = ["school", "event", "housing"];
  if (!hasChildren(conditions) && plan.axis === "spring-public-facility") pins.push("public");
  return pins;
}

// 場面の文（ひな形）をどのピンのシートに出すか。春の場面の軸ごとに1つ
export function scenePinFor(plan: ScenePlan): PinId | null {
  switch (plan.axis) {
    case "spring-school":
      return "school";
    case "spring-public-facility":
      return "public";
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
