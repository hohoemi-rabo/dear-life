// えらぶの「わが家のプレビュー」に家族を並べる（028）。選んだ人数から誰を出すかと、背景の上のどこに立たせるかを決める。
// 位置は背景に対する割合（％）で持つ。画面の幅が変わっても、背景と一緒に伸び縮みしてずれないように
import type { Conditions } from "../conditions/model.ts";
import { ILLUST_PICTURES, spriteId, type ErabuBaseId, type KurashiPictureId, type Person, type Pose } from "./assets.ts";
import { SPRITE_SIZES } from "./sprites.ts";

// 大人1人なら選んだ方（お母さん・お父さん。2026-10-31 まさゆきさん：ひとり親の家族も選べるように）、2人ならお父さんとお母さん。子どもは1人目が男の子、2人目が女の子（2026-10-29 まさゆきさん決定）、
// 3人目が青い服の男の子、4人目が紫の服の女の子（2026-10-31 まさゆきさん）。左から お父さん・子ども・お母さん の順に並べる（見本の並び）
const KIDS = ["boy", "girl", "boy2", "girl2"] as const satisfies readonly Person[];

// 絵に出せない子ども（5人目から）の人数。絵の横に「＋N人」の札で出す（2026-10-31 まさゆきさん）
export function hiddenChildren({ children }: Pick<Conditions, "children">): number {
  return Math.max(0, children - KIDS.length);
}

export function familyMembers({ adults, children, parent }: Pick<Conditions, "adults" | "children" | "parent">): Person[] {
  const kids: Person[] = KIDS.slice(0, Math.max(0, Math.min(children, KIDS.length)));
  if (adults >= 2) return ["father", ...kids, "mother"];
  return parent === "father" ? ["father", ...kids] : [...kids, "mother"];
}

// 家族を立たせる背景（えらぶのプレビューと、くらしの場面）
export type FamilyStageId = ErabuBaseId | KurashiPictureId;

// 背景ごとの立ち位置。footY は足もとの高さ、adultHeight はお父さん（立つ）の背の高さ（どちらも背景の高さに対する割合）
const STAGES: Record<FamilyStageId, { footY: number; adultHeight: number; centerX: number }> = {
  // 手前の広場の真ん中に立たせる。04 の車は家族の右奥に置き、家族が手前に少し重なる
  // （2026-10-29 まさゆきさん：家族はいつも真ん中に、もう少し小さく）
  "erabu-kamisato-base": { footY: 94, adultHeight: 32, centerX: 50 },
  // 05 の背景。05 の主役は町（印）なので、家族は広場のいちばん奥（川べりの手前）に小さめに立たせる
  // （2026-10-30 まさゆきさん：キャラを小さく、いちばん奥まで）
  "erabu-kamisato-priorities": { footY: 70, adultHeight: 20, centerX: 50 },
  // 上郷以外の地区の仮の背景。街並みが主役なので少し小さめに
  "erabu-iida-overview": { footY: 95, adultHeight: 28, centerX: 50 },
  // くらし：斜め後ろ姿で、広場の奥（柵の手前）から町を見る（2026-10-30 まさゆきさん：斜めのキャラにして奥に）
  "kurashi-kamisato-spring-wide": { footY: 90, adultHeight: 20, centerX: 40 },
  "kurashi-kamisato-spring-tall": { footY: 95, adultHeight: 15, centerX: 45 },
};

// 隣の人と少し重ねて、家族らしく寄せる（立つポーズの幅に対する割合）
const OVERLAP = 0.12;
// 5人目からは1人ふえるごとに、家族全体を少し小さくし、もう少し重ねる。6人で横幅が4人のときの約1.2倍に収まり、
// 車や家との重なりが増えすぎないように（2026-10-31 子どもを4人まで選べるようにしたとき）
const ROOMY_MEMBERS = 4;
const SHRINK_PER_EXTRA = 0.07;
const OVERLAP_PER_EXTRA = 0.06;

export type Placement = {
  person: Person;
  // 立つポーズの幅で決めた立ち位置の真ん中（％）。ポーズを変えても隣の人が動かないように
  centerX: number;
  footY: number;
  // 背の高さ（背景の高さに対する％）。ポーズごとの幅は、この高さと画像の縦横の比から決まる
  heightPercent: (pose: Pose) => number;
};

export function placeFamily(members: readonly Person[], background: FamilyStageId): Placement[] {
  const stage = STAGES[background];
  const picture = ILLUST_PICTURES[background];
  const reference = SPRITE_SIZES["father-stand"].height;
  const extra = Math.max(0, members.length - ROOMY_MEMBERS);
  const adultHeight = stage.adultHeight * (1 - SHRINK_PER_EXTRA * extra);
  const overlap = OVERLAP + OVERLAP_PER_EXTRA * extra;
  const heightOf = (person: Person, pose: Pose) => (SPRITE_SIZES[spriteId(person, pose)].height / reference) * adultHeight;
  // 横幅（背景の幅に対する％）＝ 高さ（％）× 画像の縦横の比 × 背景の縦横の比
  const widthOf = (person: Person) => {
    const size = SPRITE_SIZES[spriteId(person, "stand")];
    return heightOf(person, "stand") * (size.width / size.height) * (picture.height / picture.width);
  };
  const widths = members.map(widthOf);
  const total = widths.reduce((sum, width, index) => sum + width * (index === 0 ? 1 : 1 - overlap), 0);
  let left = stage.centerX - total / 2;
  return members.map((person, index) => {
    if (index > 0) left -= widths[index] * overlap;
    const centerX = left + widths[index] / 2;
    left += widths[index];
    return { person, centerX, footY: stage.footY, heightPercent: (pose) => heightOf(person, pose) };
  });
}
