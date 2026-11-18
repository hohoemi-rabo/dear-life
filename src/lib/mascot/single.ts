// 一人のときだけ「わが家」に出るぽてり（043。2026-11-18 まさゆきさん）。えらぶの家族で「大人1人・子ども0人」を選んだ人だけが気づく裏技。
// くらしの「わが家」とカルテの「わが家の設定」の、人の絵の横に並べる（「一人じゃないよ」と伝えたいから）。
// 服はくらしで見ている季節（URL の s）のもの。動きはまばたきだけ
import type { Conditions } from "../conditions/model.ts";
import type { Season } from "../conditions/scene.ts";
import type { MascotMotionId } from "./assets.ts";

const SINGLE_MASCOT_MOTIONS: Readonly<Record<Season, MascotMotionId>> = {
  春: "single-blink-spring",
  夏: "single-blink-summer",
  秋: "single-blink-autumn",
  冬: "single-blink-winter",
};

export function isLivingAlone({ adults, children }: Pick<Conditions, "adults" | "children">): boolean {
  return adults === 1 && children === 0;
}

// 一人のときは季節のまばたきの絵、ほかの家族では null（出さない）
export function singleMascotMotion(conditions: Pick<Conditions, "adults" | "children">, season: Season): MascotMotionId | null {
  return isLivingAlone(conditions) ? SINGLE_MASCOT_MOTIONS[season] : null;
}
