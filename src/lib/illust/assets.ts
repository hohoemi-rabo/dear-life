// 生成AIで作った絵（028）の一覧。元の画像は assets/illust/（まさゆきさんが用意）、画面用の WebP は npm run illust が
// public/illust/ に書き出す。ドット絵（src/lib/pixel/、コードで描く）とは別のもの。
// 本当のドットの粒がそろった絵ではないので、整数倍の表示（pixelated）にはせず、ふつうに縮めて出す
import type { Housing, Priority } from "../conditions/labels.ts";
import type { Season } from "../conditions/scene.ts";
import type { DistrictId } from "../town-district/resolve.ts";

export const ILLUST_DIR = "illust";

// 背景・選択肢の絵。widths は書き出す横幅（端末の幅で選ばせる）。width・height は画面に出す絵の大きさ（元の画像の px）。
// crop があるものは、元の画像（sourceWidth×sourceHeight）からその範囲を切り出して書き出す
export const ILLUST_PICTURES = {
  "erabu-iida-overview": {
    source: "erabu-iida-overview.png",
    width: 1536,
    height: 1024,
    widths: [768, 1152],
    alt: "飯田市を上から見た街並みと山の風景",
  },
  "erabu-kamisato-base": {
    source: "erabu-kamisato-base.png",
    width: 1536,
    height: 1024,
    widths: [768, 1152],
    alt: "上郷の高台の広場から見た、家並みと南アルプスの風景",
  },
  // えらぶ 05 だけの背景（2026-10-29 まさゆきさん）。家族が後ろから町を見わたし、学校・駅・避難場所に印を付ける。
  // 元の絵は 16:9 なので、プレビューの枠（3:2）に合わせて切り出す。右の広場の避難場所の標識が入るよう、左を多めに落とす
  "erabu-kamisato-priorities": {
    source: "erabu-kamisato-priorities.png",
    sourceWidth: 1672,
    sourceHeight: 941,
    crop: { left: 220, top: 0 },
    width: 1412,
    height: 941,
    widths: [768, 1152],
    alt: "上郷の高台の広場から見た、学校・駅・川と山の風景",
  },
  // くらし・上郷・春（2026-10-30 受け取り）。PC は横長、スマホは縦長を出しわける。人は入っていない（家族は重ねる）
  // PC 用は見本どおり見出しを空の上に重ねるので、上の1/4 は空と遠くの雪山だけ（2026-10-30 作り直し）
  "kurashi-kamisato-spring-wide": {
    source: "kurashi-kamisato-spring-wide.png",
    width: 1536,
    height: 1024,
    widths: [960, 1440],
    alt: "桜の咲く上郷の春。山すその公園、校庭のある学校、体育館、公民館、石段の上の神社、駅とバス停、川と橋が見える",
  },
  // スマホ用も見出し・条件の札・季節の切りかえを空の上に重ねるので、上の約3割は空と遠くの雪山だけ（2026-10-30 作り直し。4:5）
  "kurashi-kamisato-spring-tall": {
    source: "kurashi-kamisato-spring-tall.png",
    width: 1122,
    height: 1402,
    widths: [480, 960],
    alt: "桜の咲く上郷の春。山すその公園、校庭のある学校、体育館、公民館、石段の上の神社、駅とバス停、川と橋が見える",
  },
  "district-kamisato": {
    source: "district-kamisato.png",
    width: 1672,
    height: 941,
    widths: [480],
    alt: "桜の咲く上郷の街並み",
  },
} as const;

export type IllustPictureId = keyof typeof ILLUST_PICTURES;

// 家族の人物（4地区で使い回す）。大人1人目はお母さん、2人目はお父さん。子ども1人目は赤い服の男の子、2人目はおさげの女の子
// （2026-10-29 まさゆきさん決定）。stand は立つ、joy は出てきたときのよろこぶポーズ、back は右奥を向いた斜め後ろ姿（05 で町を見わたす。2026-10-30 まさゆきさん）。
// くらしでも back で、風景の奥を向いて立つ（2026-10-30 まさゆきさん）
export const PEOPLE = ["father", "mother", "boy", "girl"] as const;
export type Person = (typeof PEOPLE)[number];
export const POSES = ["stand", "joy", "back"] as const;
export type Pose = (typeof POSES)[number];

export type SpriteId = `${Person}-${Pose}`;

// キャラクターのシートは1枚に4〜6人が並び、人と人のあいだが透明になっている。
// index は「左から何人目か」（0始まり）。並びは assets/illust/README.md
export const SPRITE_SOURCES: Record<SpriteId, { sheet: string; index: number; alt: string }> = {
  "father-stand": { sheet: "characters-sheet-1.png", index: 0, alt: "緑の上着のお父さん" },
  "father-joy": { sheet: "characters-sheet-2.png", index: 0, alt: "手を振る、緑の上着のお父さん" },
  "mother-stand": { sheet: "characters-sheet-1.png", index: 1, alt: "青いスカートのお母さん" },
  "mother-joy": { sheet: "characters-sheet-2.png", index: 3, alt: "手を広げる、青いスカートのお母さん" },
  "boy-stand": { sheet: "characters-sheet-1.png", index: 2, alt: "赤い服の男の子" },
  "boy-joy": { sheet: "characters-sheet-2.png", index: 1, alt: "跳ねる、赤い服の男の子" },
  "girl-stand": { sheet: "characters-sheet-1.png", index: 5, alt: "手を振る、おさげの女の子" },
  "girl-joy": { sheet: "characters-sheet-2.png", index: 2, alt: "手を振って歩く、おさげの女の子" },
  "father-back": { sheet: "characters-sheet-5.png", index: 0, alt: "右奥を向いた後ろ姿の、緑の上着のお父さん" },
  "mother-back": { sheet: "characters-sheet-5.png", index: 1, alt: "右奥を向いた後ろ姿の、青いスカートのお母さん" },
  "boy-back": { sheet: "characters-sheet-5.png", index: 2, alt: "右奥を向いた後ろ姿の、赤い服の男の子" },
  "girl-back": { sheet: "characters-sheet-5.png", index: 5, alt: "右奥を向いた後ろ姿の、おさげの女の子" },
};

// シートの大きさのまま切り出すと大きすぎるので、全員同じ倍率で縮める（大人と子どもの背の比を保つため）
export const SPRITE_SCALE = 0.5;

export function spriteId(person: Person, pose: Pose): SpriteId {
  return `${person}-${pose}`;
}

// 家（4地区で使い回す。2026-10-29 受け取り）。透過 PNG で、家のまわりの暗いもやは見た目だけで本当は透明。
// 家そのものもほんの少し透けているので、書き出すときに不透明にそろえ、透明なふちを切り落とす
export const HOUSE_SOURCES: Record<Housing, { source: string; alt: string }> = {
  new: { source: "house-new.png", alt: "白い壁に瓦屋根の、新しめの2階建ての家" },
  old: { source: "house-old.png", alt: "木の格子戸とベランダのある、古めの2階建ての家" },
  rent: { source: "house-rent.png", alt: "外階段のある2階建てのアパート" },
};

// 書き出す横幅。プレビュー（表示は最大で約330px）と選択肢のカード（約110px）で同じ画像を使い、端末に選ばせる
export const HOUSE_WIDTHS = [320, 640] as const;

export function houseSrc(housing: Housing, width: number): string {
  return `/${ILLUST_DIR}/house-${housing}-${width}.webp`;
}

// 車・バス停などの小物（04 車。2026-10-29 受け取り。4地区で使い回す）。家と同じく、少し透けたところを不透明にそろえ、
// 透明なふちを切り落とす。car.png は1枚に白い車・青い車・横長の駅とバス停が並んでいるので、index（左から何番目か、0始まり）で切り分ける
export const PROPS = ["car-white", "car-blue", "bus-stop", "station-wide"] as const;
export type PropId = (typeof PROPS)[number];

export const PROP_SOURCES: Record<PropId, { source: string; index?: number; alt: string }> = {
  "car-white": { source: "car.png", index: 0, alt: "白い軽自動車" },
  "car-blue": { source: "car.png", index: 1, alt: "青い軽自動車" },
  "bus-stop": { source: "bus-stop.png", alt: "駅の建物とバス停の標識・待合所" },
  "station-wide": { source: "car.png", index: 2, alt: "横に並んだ駅の建物とバス停の標識・待合所" },
};

// 書き出す横幅。プレビュー（車の表示は最大で約150px）と選択肢のカード（約110px）・地図のカード（約90px）で使い、端末に選ばせる
export const PROP_WIDTHS = [240, 480] as const;

export function propSrc(prop: PropId, width: number): string {
  return `/${ILLUST_DIR}/${prop}-${width}.webp`;
}

export function propSrcSet(prop: PropId): string {
  return PROP_WIDTHS.map((width) => `${propSrc(prop, width)} ${width}w`).join(", ");
}

// 大切にしたいことの絵（05。2026-10-29 受け取り。4地区で使い回す）。選択肢のカードとプレビューの印で使う。
// priority-icons.png に左から 家・校舎・バス・非常口の印・3人 が並んでいるので、小物と同じく透明な列で切り分ける
export const PRIORITY_ICON_SOURCE = "priority-icons.png";
export const PRIORITY_ICON_INDEX: Record<Priority, number> = {
  housing: 0,
  childcare: 1,
  transport: 2,
  disaster: 3,
  population: 4,
};

// 書き出す横幅。選択肢のカード（約56px）とプレビューの印（約40px）で使い、端末に選ばせる
export const PRIORITY_ICON_WIDTHS = [128, 256] as const;

export function priorityIconSrc(priority: Priority, width: number): string {
  return `/${ILLUST_DIR}/priority-${priority}-${width}.webp`;
}

export function priorityIconSrcSet(priority: Priority): string {
  return PRIORITY_ICON_WIDTHS.map((width) => `${priorityIconSrc(priority, width)} ${width}w`).join(", ");
}

export function illustPictureSrc(id: IllustPictureId, width: number): string {
  return `/${ILLUST_DIR}/${id}-${width}.webp`;
}

export function spriteSrc(id: SpriteId): string {
  return `/${ILLUST_DIR}/person-${id}.webp`;
}

// 地区の選択肢の絵。まず上郷だけ（028。ほかの3地区は用意できるまで今のドット絵）
export const DISTRICT_PICTURES: Partial<Record<DistrictId, IllustPictureId>> = {
  kamisato: "district-kamisato",
};

// えらぶ 02〜05 のプレビューの背景。まだない地区は飯田市全体の絵の上に家族を並べる（028 まさゆきさん了承）。
// 05 大切なことだけは、町を見わたす別の背景にする（2026-10-29 まさゆきさん）。05 の背景がない地区は 02〜04 と同じ背景
export type ErabuBaseId = "erabu-kamisato-base" | "erabu-kamisato-priorities" | "erabu-iida-overview";
export type ErabuScene = "base" | "priorities";

export const ERABU_BASES: Partial<Record<DistrictId, Partial<Record<ErabuScene, ErabuBaseId>>>> = {
  kamisato: { base: "erabu-kamisato-base", priorities: "erabu-kamisato-priorities" },
};

export function erabuBaseFor(district: DistrictId | null, scene: ErabuScene = "base"): ErabuBaseId {
  const bases = district ? ERABU_BASES[district] : undefined;
  return bases?.[scene] ?? bases?.base ?? "erabu-iida-overview";
}

// くらしの場面の絵（028）。まず上郷・春だけ。ない地区・季節は今のドット絵の場面（ScenePanel）で出す
export type KurashiPictureId = "kurashi-kamisato-spring-wide" | "kurashi-kamisato-spring-tall";
export type KurashiPictures = { wide: KurashiPictureId; tall: KurashiPictureId };

export const KURASHI_PICTURES: Partial<Record<DistrictId, Partial<Record<Season, KurashiPictures>>>> = {
  kamisato: { 春: { wide: "kurashi-kamisato-spring-wide", tall: "kurashi-kamisato-spring-tall" } },
};

export function kurashiPicturesFor(district: DistrictId, season: Season): KurashiPictures | null {
  return KURASHI_PICTURES[district]?.[season] ?? null;
}
