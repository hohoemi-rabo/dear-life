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
    widths: [768, 1152, 1536],
    alt: "飯田市を上から見た街並みと山の風景",
  },
  "erabu-kamisato-base": {
    source: "erabu-kamisato-base.png",
    width: 1536,
    height: 1024,
    widths: [768, 1152, 1536],
    alt: "上郷の高台の広場から見た、家並みと南アルプスの風景",
  },
  "erabu-chushin-base": {
    source: "erabu-chushin-base.png",
    width: 1536,
    height: 1024,
    widths: [768, 1152, 1536],
    alt: "中心市街地の高台の広場から見た、ロータリーと町並みと山の風景",
  },
  // 鼎の 02〜04 の背景（2026-11-03 受け取り）。高台のレンガの広場から、交差点と道沿いの店、町並みを見下ろす
  "erabu-kanae-base": {
    source: "erabu-kanae-base.png",
    width: 1536,
    height: 1024,
    widths: [768, 1152, 1536],
    alt: "鼎の高台の広場から見た、交差点と道沿いの店、町並みと山の風景",
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
    widths: [768, 1152, 1412],
    alt: "上郷の高台の広場から見た、学校・駅・川と山の風景",
  },
  // 中心市街地の 05 の背景（2026-11-02 受け取り）。上郷と同じ 16:9 なので同じように切り出す。駅が切れないよう、左を落とす
  "erabu-chushin-priorities": {
    source: "erabu-chushin-priorities.png",
    sourceWidth: 1672,
    sourceHeight: 941,
    crop: { left: 230, top: 0 },
    width: 1412,
    height: 941,
    widths: [768, 1152, 1412],
    alt: "中心市街地の高台の広場から見た、学校・駅・ロータリーと山の風景",
  },
  // 鼎の 05 の背景（2026-11-03 受け取り）。切り出しなしで枠（3:2）に収まる
  "erabu-kanae-priorities": {
    source: "erabu-kanae-priorities.png",
    width: 1536,
    height: 1024,
    widths: [768, 1152, 1536],
    alt: "鼎の広場から見た、バス停と広い道路、学校・店と避難場所の標識、山の風景",
  },
  // くらしの絵の書き出す横幅（2026-11-01 測り直し）：横長の 240・480 は PC の下の季節の絵（約225px）、縦長の 720 は
// 幅 375px・密度2倍のスマホ用（960 だと約430KB で、絵が出るまで約8秒かかっていた）
// くらし・上郷・春（2026-10-30 受け取り）。PC は横長、スマホは縦長を出しわける。人は入っていない（家族は重ねる）
  // PC 用は見本どおり見出しを空の上に重ねるので、上の1/4 は空と遠くの雪山だけ（2026-10-30 作り直し）
  "kurashi-kamisato-spring-wide": {
    source: "kurashi-kamisato-spring-wide.png",
    width: 1536,
    height: 1024,
    widths: [240, 480, 960, 1440],
    alt: "桜の咲く上郷の春。山すその公園、校庭のある学校、体育館、公民館、石段の上の神社、駅とバス停、川と橋が見える",
  },
  // スマホ用も見出し・条件の札・季節の切りかえを空の上に重ねるので、上の約3割は空と遠くの雪山だけ（2026-10-30 作り直し。4:5）
  "kurashi-kamisato-spring-tall": {
    source: "kurashi-kamisato-spring-tall.png",
    width: 1122,
    height: 1402,
    widths: [480, 720, 960],
    alt: "桜の咲く上郷の春。山すその公園、校庭のある学校、体育館、公民館、石段の上の神社、駅とバス停、川と橋が見える",
  },
  // くらし・上郷・夏（2026-10-31 受け取り）。春と同じ大きさ・同じ構図で、緑の濃い夏の景色。ピンの場所は春と同じ
  "kurashi-kamisato-summer-wide": {
    source: "kurashi-kamisato-summer-wide.png",
    width: 1536,
    height: 1024,
    widths: [240, 480, 960, 1440],
    alt: "緑の濃い上郷の夏。山すその公園、校庭のある学校、体育館、公民館、石段の上の神社、駅とバス停、川と橋が見える",
  },
  "kurashi-kamisato-summer-tall": {
    source: "kurashi-kamisato-summer-tall.png",
    width: 1122,
    height: 1402,
    widths: [480, 720, 960],
    alt: "緑の濃い上郷の夏。山すその公園、校庭のある学校、体育館、公民館、石段の上の神社、駅とバス停、川と橋が見える",
  },
  // くらし・上郷・秋（2026-11-01 受け取り）。春・夏と同じ大きさ・同じ構図で、紅葉の景色。ピンの場所も同じ
  "kurashi-kamisato-autumn-wide": {
    source: "kurashi-kamisato-autumn-wide.png",
    width: 1536,
    height: 1024,
    widths: [240, 480, 960, 1440],
    alt: "紅葉した上郷の秋。山すその公園、校庭のある学校、体育館、公民館、石段の上の神社、駅とバス停、川と橋が見える",
  },
  "kurashi-kamisato-autumn-tall": {
    source: "kurashi-kamisato-autumn-tall.png",
    width: 1122,
    height: 1402,
    widths: [480, 720, 960],
    alt: "紅葉した上郷の秋。山すその公園、校庭のある学校、体育館、公民館、石段の上の神社、駅とバス停、川と橋が見える",
  },
  // くらし・上郷・冬（2026-11-01 受け取り）。春〜秋と同じ大きさ・同じ構図の雪景色。ピンの場所も同じ
  "kurashi-kamisato-winter-wide": {
    source: "kurashi-kamisato-winter-wide.png",
    width: 1536,
    height: 1024,
    widths: [240, 480, 960, 1440],
    alt: "雪の積もった上郷の冬。山すその公園、校庭のある学校、体育館、公民館、石段の上の神社、駅とバス停、川と橋が見える",
  },
  "kurashi-kamisato-winter-tall": {
    source: "kurashi-kamisato-winter-tall.png",
    width: 1122,
    height: 1402,
    widths: [480, 720, 960],
    alt: "雪の積もった上郷の冬。山すその公園、校庭のある学校、体育館、公民館、石段の上の神社、駅とバス停、川と橋が見える",
  },
  // くらし・中心市街地・春（2026-11-02 受け取り）。人は入っていない（家族は重ねる）。上の約3割が空と遠くの雪山なのは上郷と同じ
  "kurashi-chushin-spring-wide": {
    source: "kurashi-chushin-spring-wide.png",
    width: 1536,
    height: 1024,
    widths: [240, 480, 960, 1440],
    alt: "桜の咲く中心市街地の春。赤い屋根の駅とロータリー、大きな白い建物、アーチ屋根の体育館、時計塔のある学校と校庭、町並み、公園が見える",
  },
  "kurashi-chushin-spring-tall": {
    source: "kurashi-chushin-spring-tall.png",
    width: 1122,
    height: 1402,
    widths: [480, 720, 960],
    alt: "桜の咲く中心市街地の春。赤い屋根の駅とロータリー、大きな白い建物、アーチ屋根の体育館、時計塔のある学校と校庭、町並み、公園が見える",
  },
  // くらし・中心市街地・夏（2026-11-02 受け取り）。春と同じ大きさ・同じ構図で、緑の濃い夏の景色
  "kurashi-chushin-summer-wide": {
    source: "kurashi-chushin-summer-wide.png",
    width: 1536,
    height: 1024,
    widths: [240, 480, 960, 1440],
    alt: "緑の濃い中心市街地の夏。赤い屋根の駅とロータリー、大きな白い建物、アーチ屋根の体育館、時計塔のある学校と校庭、町並み、公園が見える",
  },
  "kurashi-chushin-summer-tall": {
    source: "kurashi-chushin-summer-tall.png",
    width: 1122,
    height: 1402,
    widths: [480, 720, 960],
    alt: "緑の濃い中心市街地の夏。赤い屋根の駅とロータリー、大きな白い建物、アーチ屋根の体育館、時計塔のある学校と校庭、町並み、公園が見える",
  },
  // くらし・中心市街地・秋（2026-11-02 受け取り）。春・夏と同じ大きさ・同じ構図で、紅葉の景色
  "kurashi-chushin-autumn-wide": {
    source: "kurashi-chushin-autumn-wide.png",
    width: 1536,
    height: 1024,
    widths: [240, 480, 960, 1440],
    alt: "紅葉した中心市街地の秋。赤い屋根の駅とロータリー、大きな白い建物、アーチ屋根の体育館、時計塔のある学校と校庭、町並み、公園が見える",
  },
  "kurashi-chushin-autumn-tall": {
    source: "kurashi-chushin-autumn-tall.png",
    width: 1122,
    height: 1402,
    widths: [480, 720, 960],
    alt: "紅葉した中心市街地の秋。赤い屋根の駅とロータリー、大きな白い建物、アーチ屋根の体育館、時計塔のある学校と校庭、町並み、公園が見える",
  },
  // くらし・中心市街地・冬（2026-11-02 受け取り）。春〜秋と同じ大きさ・同じ構図の雪景色
  "kurashi-chushin-winter-wide": {
    source: "kurashi-chushin-winter-wide.png",
    width: 1536,
    height: 1024,
    widths: [240, 480, 960, 1440],
    alt: "雪の積もった中心市街地の冬。赤い屋根の駅とロータリー、大きな白い建物、アーチ屋根の体育館、時計塔のある学校と校庭、町並み、公園が見える",
  },
  "kurashi-chushin-winter-tall": {
    source: "kurashi-chushin-winter-tall.png",
    width: 1122,
    height: 1402,
    widths: [480, 720, 960],
    alt: "雪の積もった中心市街地の冬。赤い屋根の駅とロータリー、大きな白い建物、アーチ屋根の体育館、時計塔のある学校と校庭、町並み、公園が見える",
  },
  "district-kamisato": {
    source: "district-kamisato.png",
    width: 1672,
    height: 941,
    widths: [480],
    alt: "桜の咲く上郷の街並み",
  },
  "district-chushin": {
    source: "district-chushin.png",
    width: 1672,
    height: 941,
    widths: [480],
    alt: "白い花のりんご並木と桜の並木が通る、中心市街地の街並み",
  },
  // くらし・鼎・春（2026-11-03 受け取り）。人は入っていない（家族は手前の歩道に重ねる）。
  // スマホの絵は元が 1072×1467 で枠（1122:1402）より縦長なので、空を上から 127px 落として枠の比に合わせる
  "kurashi-kanae-spring-wide": {
    source: "kurashi-kanae-spring-wide.png",
    width: 1536,
    height: 1024,
    widths: [240, 480, 960, 1440],
    alt: "桜の咲く鼎の春。広い道路と歩道、道沿いの店とバス停、公民館と体育館、時計の校舎と校庭、公園、奥の町並みと小さな駅が見える",
  },
  "kurashi-kanae-spring-tall": {
    source: "kurashi-kanae-spring-tall.png",
    sourceWidth: 1072,
    sourceHeight: 1467,
    crop: { left: 0, top: 127 },
    width: 1072,
    height: 1340,
    widths: [480, 720, 960],
    alt: "桜の咲く鼎の春。広い道路と歩道、道沿いの店とバス停、公民館と体育館、時計の校舎と校庭、公園、奥の町並みと小さな駅が見える",
  },
  // くらし・鼎・夏（2026-11-03 受け取り）。春と同じ構図で、スマホの絵は春と同じ大きさなので同じように空を落とす
  "kurashi-kanae-summer-wide": {
    source: "kurashi-kanae-summer-wide.png",
    width: 1536,
    height: 1024,
    widths: [240, 480, 960, 1440],
    alt: "夏の青空と緑の鼎。ひまわりと花の咲く広い道路と歩道、道沿いの店とバス停、公民館と体育館、時計の校舎と校庭、公園、奥の町並みと小さな駅が見える",
  },
  "kurashi-kanae-summer-tall": {
    source: "kurashi-kanae-summer-tall.png",
    sourceWidth: 1072,
    sourceHeight: 1467,
    crop: { left: 0, top: 127 },
    width: 1072,
    height: 1340,
    widths: [480, 720, 960],
    alt: "夏の青空と緑の鼎。ひまわりと花の咲く広い道路と歩道、道沿いの店とバス停、公民館と体育館、時計の校舎と校庭、公園、奥の町並みと小さな駅が見える",
  },
  // くらし・鼎・秋（2026-11-03 受け取り）。春・夏と同じ構図で、スマホの絵も同じ大きさなので同じように空を落とす
  "kurashi-kanae-autumn-wide": {
    source: "kurashi-kanae-autumn-wide.png",
    width: 1536,
    height: 1024,
    widths: [240, 480, 960, 1440],
    alt: "紅葉の鼎の秋。花の咲く広い道路と歩道、道沿いの店とバス停、公民館と体育館、時計の校舎と校庭、公園、奥の町並みと小さな駅が見える",
  },
  "kurashi-kanae-autumn-tall": {
    source: "kurashi-kanae-autumn-tall.png",
    sourceWidth: 1072,
    sourceHeight: 1467,
    crop: { left: 0, top: 127 },
    width: 1072,
    height: 1340,
    widths: [480, 720, 960],
    alt: "紅葉の鼎の秋。花の咲く広い道路と歩道、道沿いの店とバス停、公民館と体育館、時計の校舎と校庭、公園、奥の町並みと小さな駅が見える",
  },
  // くらし・鼎・冬（2026-11-03 受け取り）。春〜秋と同じ構図で、スマホの絵も同じ大きさなので同じように空を落とす
  "kurashi-kanae-winter-wide": {
    source: "kurashi-kanae-winter-wide.png",
    width: 1536,
    height: 1024,
    widths: [240, 480, 960, 1440],
    alt: "雪の積もった鼎の冬。雪の降る広い道路と歩道、道沿いの店とバス停、公民館と体育館、時計の校舎と校庭、公園、奥の町並みと小さな駅が見える",
  },
  "kurashi-kanae-winter-tall": {
    source: "kurashi-kanae-winter-tall.png",
    sourceWidth: 1072,
    sourceHeight: 1467,
    crop: { left: 0, top: 127 },
    width: 1072,
    height: 1340,
    widths: [480, 720, 960],
    alt: "雪の積もった鼎の冬。雪の降る広い道路と歩道、道沿いの店とバス停、公民館と体育館、時計の校舎と校庭、公園、奥の町並みと小さな駅が見える",
  },
  "district-kanae": {
    source: "district-kanae.png",
    width: 1672,
    height: 941,
    widths: [480],
    alt: "桜の咲く広い道沿いに店が並ぶ、鼎の街並み",
  },
} as const;

export type IllustPictureId = keyof typeof ILLUST_PICTURES;

// 家族の人物（4地区で使い回す）。大人1人目はお母さん、2人目はお父さん。子ども1人目は赤い服の男の子、2人目はおさげの女の子
// （2026-10-29 まさゆきさん決定）、3人目は青い服の男の子（boy2）、4人目は紫の服の女の子（girl2）（2026-10-31 まさゆきさん）。stand は立つ、joy は出てきたときのよろこぶポーズ、back は右奥を向いた斜め後ろ姿（05 で町を見わたす。2026-10-30 まさゆきさん）。
// くらしでも back で、風景の奥を向いて立つ（2026-10-30 まさゆきさん）
export const PEOPLE = ["father", "mother", "boy", "girl", "boy2", "girl2"] as const;
export type Person = (typeof PEOPLE)[number];
// back-summer などは季節ごとの服の斜め後ろ姿（くらしの夏・秋・冬。2026-11-01 まさゆきさん：季節で服を変える）。春は back のまま
// walk はカルテの下の「次は、現地で確かめよう」で、右へ歩く横向きの姿（2026-11-01 受け取り）
export const POSES = ["stand", "joy", "back", "back-summer", "back-autumn", "back-winter", "walk"] as const;
export type Pose = (typeof POSES)[number];

const SEASONAL_BACK_POSES: Readonly<Record<Season, Pose>> = {
  春: "back",
  夏: "back-summer",
  秋: "back-autumn",
  冬: "back-winter",
};

// 斜め後ろ姿のポーズ。季節がない場面（えらぶ 05）は春の服
export function backPose(season: Season | null = null): Pose {
  return season ? SEASONAL_BACK_POSES[season] : "back";
}

export type SpriteId = `${Person}-${Pose}`;

// シート6の子ども（背 約580px）を、今の子ども（赤い服の男の子 452px・おさげの女の子 419px）と同じくらいの背にする倍率
const SHEET_6_SCALE = 0.78;

// 季節の服の斜め後ろ姿（2026-11-01 受け取り）。季節ごとに2枚あり、並びは季節すべて共通。
// 1枚目は シート5 と同じ並び（お父さん・お母さん・男の子・赤・男の子・黄・女の子・ボブ・女の子・おさげ）、
// 2枚目は 3人目・4人目の子ども（男の子・青・女の子・紫）。服の色は季節で変わるので、人はシートと左からの位置で決める
const SEASONAL_BACK_SHEETS = {
  "back-summer": { name: "summer", label: "夏服" },
  "back-autumn": { name: "autumn", label: "秋の服" },
  "back-winter": { name: "winter", label: "冬服" },
} as const;
const SEASONAL_BACK_INDEX: Readonly<Record<Person, { sheet: 1 | 2; index: number; who: string }>> = {
  father: { sheet: 1, index: 0, who: "お父さん" },
  mother: { sheet: 1, index: 1, who: "お母さん" },
  boy: { sheet: 1, index: 2, who: "男の子" },
  girl: { sheet: 1, index: 5, who: "おさげの女の子" },
  boy2: { sheet: 2, index: 0, who: "3人目の男の子" },
  girl2: { sheet: 2, index: 1, who: "一つ結びの女の子" },
};

// 季節の後ろ姿は、シートごとに人の大きさが違う（2枚目は大きい・冬の1枚目も少し大きい）ので、倍率を手で決めず、
// 春の同じ人（back）と同じ背の高さにそろえて書き出す（matchHeight）。季節を変えても家族の大きさが変わらないように
type SeasonalBackPose = keyof typeof SEASONAL_BACK_SHEETS;
function seasonalBackSources(): Record<`${Person}-${SeasonalBackPose}`, SpriteSource> {
  const entries = Object.entries(SEASONAL_BACK_SHEETS).flatMap(([pose, { name, label }]) =>
    PEOPLE.map((person) => {
      const { sheet, index, who } = SEASONAL_BACK_INDEX[person];
      const source: SpriteSource = {
        sheet: `characters-back-${name}-${sheet}.png`,
        index,
        alt: `${label}で右奥を向いた後ろ姿の、${who}`,
        matchHeight: spriteId(person, "back"),
      };
      return [spriteId(person, pose as SeasonalBackPose), source] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<`${Person}-${SeasonalBackPose}`, SpriteSource>;
}

type SpriteSource = { sheet: string; index: number; alt: string; scale?: number; matchHeight?: SpriteId };

// 右へ歩く横向きの姿（karte-next-step.png。2026-11-01 受け取り）。2段に4人ずつ並び、index は上の段の左から通し番号。
// 上の段：お父さん・お母さん・男の子・赤・男の子・黄（使わない）、下の段：女の子・ボブ（使わない）・女の子・おさげ・男の子・青・女の子・紫。
// シートの人の大きさがほかと違うので、立つ姿（stand）と同じ背にそろえる
const WALK_INDEX: Readonly<Record<Person, { index: number; who: string }>> = {
  father: { index: 0, who: "緑の上着のお父さん" },
  mother: { index: 1, who: "青いスカートのお母さん" },
  boy: { index: 2, who: "赤い服の男の子" },
  girl: { index: 5, who: "おさげの女の子" },
  boy2: { index: 6, who: "青い服の男の子" },
  girl2: { index: 7, who: "紫の服の女の子" },
};

function walkSources(): Record<`${Person}-walk`, SpriteSource> {
  const entries = PEOPLE.map((person) => {
    const { index, who } = WALK_INDEX[person];
    const source: SpriteSource = { sheet: "karte-next-step.png", index, alt: `右へ歩く、${who}`, matchHeight: spriteId(person, "stand") };
    return [spriteId(person, "walk"), source] as const;
  });
  return Object.fromEntries(entries) as Record<`${Person}-walk`, SpriteSource>;
}

// キャラクターのシートは1枚に2〜6人が並び、人と人のあいだが透明になっている。
// index は「左から何人目か」（0始まり）。並びは assets/illust/README.md。
// scale はシートごとの縮め方の差（SPRITE_SCALE に掛ける）。シート6は人が大きく描かれているので、今の子どもと同じ背にそろえる。
// matchHeight があるものは、その人物と同じ背の高さにそろえる（先に書き出すものを指す）
export const SPRITE_SOURCES: Record<SpriteId, SpriteSource> = {
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
  // 3人目・4人目はよろこぶポーズの絵がないので、正面の絵のまま出てくる（2026-10-31）
  "boy2-stand": { sheet: "characters-sheet-6.png", index: 0, alt: "青い服の男の子", scale: SHEET_6_SCALE },
  "boy2-joy": { sheet: "characters-sheet-6.png", index: 0, alt: "青い服の男の子", scale: SHEET_6_SCALE },
  "boy2-back": { sheet: "characters-sheet-6.png", index: 1, alt: "右奥を向いた後ろ姿の、青い服の男の子", scale: SHEET_6_SCALE },
  "girl2-stand": { sheet: "characters-sheet-6.png", index: 2, alt: "紫の服の女の子", scale: SHEET_6_SCALE },
  "girl2-joy": { sheet: "characters-sheet-6.png", index: 2, alt: "紫の服の女の子", scale: SHEET_6_SCALE },
  "girl2-back": { sheet: "characters-sheet-6.png", index: 3, alt: "右奥を向いた後ろ姿の、紫の服の女の子", scale: SHEET_6_SCALE },
  ...seasonalBackSources(),
  ...walkSources(),
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

// 書き出す横幅。プレビュー（表示はスマホで約330px、PC の 1200px の枠で約780px）と選択肢のカード（約110〜390px）で同じ画像を使い、端末に選ばせる
export const HOUSE_WIDTHS = [320, 640, 960] as const;

export function houseSrc(housing: Housing, width: number): string {
  return `/${ILLUST_DIR}/house-${housing}-${width}.webp`;
}

// 車・バス停などの小物（04 車。2026-10-29 受け取り。4地区で使い回す）。家と同じく、少し透けたところを不透明にそろえ、
// 透明なふちを切り落とす。car.png は1枚に白い車・青い車・横長の駅とバス停が並んでいるので、index（左から何番目か、0始まり）で切り分ける
// reply-school はえらぶ 02 の子育て・学校の返事のカードの絵（2026-10-31 受け取り。カルテなどの学校のドット絵はそのまま）。
// event-* は行事ごとの絵（2026-10-31 受け取り。春の2つ、夏の2つ、秋の2つ・冬の1つ（2026-11-01）の順。EVENT_ILLUSTS で行事の名前から引く）
export const PROPS = [
  "car-white",
  "car-blue",
  "bus-stop",
  "station-wide",
  "reply-school",
  "event-kuroda-ningyo",
  "event-kamisato-aruko",
  "event-ningyo-festa",
  "event-sports-koryu",
  "event-undokai",
  "event-bunkasai",
  "event-winter-sports",
  "event-chushin-ohimachi",
  "event-chushin-terakoya",
  "event-chushin-ningyo-festa",
  "event-chushin-kyohoku-bunkasai",
  "event-chushin-undokai",
  "event-chushin-maruyama-bunkasai",
  "event-chushin-mochitsuki",
  "event-chushin-kakizome",
  "event-kanae-oneday-march",
  "event-kanae-ningyo-festa",
  "event-kanae-petanque",
  "event-kanae-bunkasai",
  "event-kanae-ekiden",
  "event-kanae-winter-sports",
  "karte-header-wide",
  "karte-header-tall",
  "karte-header-chushin-wide",
  "karte-header-chushin-tall",
  "karte-childcare",
  "karte-transport",
  "karte-disaster",
  "karte-population",
  "karte-public",
  "karte-support",
  "karte-check",
  "detail-school",
  "detail-bus",
  "detail-bus-winter",
  "detail-shelter",
  "detail-population",
  "detail-public",
  "detail-support",
  "detail-nursery",
  "detail-afterschool",
  "detail-train",
  "detail-land",
  "pin-snow-road",
] as const;
export type PropId = (typeof PROPS)[number];

// widths を書くと、PROP_WIDTHS の代わりにその横幅で書き出す
export const PROP_SOURCES: Record<PropId, { source: string; index?: number; alt: string; widths?: readonly number[] }> = {
  "car-white": { source: "car.png", index: 0, alt: "白い軽自動車" },
  "car-blue": { source: "car.png", index: 1, alt: "青い軽自動車" },
  "bus-stop": { source: "bus-stop.png", alt: "駅の建物とバス停の標識・待合所" },
  "station-wide": { source: "car.png", index: 2, alt: "横に並んだ駅の建物とバス停の標識・待合所" },
  "reply-school": { source: "reply-school.png", alt: "時計台のある2階建ての校舎と植え込み" },
  "event-kuroda-ningyo": { source: "event-kuroda-ningyo.png", alt: "屋根のある舞台で、黒衣が操る着物姿の人形" },
  "event-kamisato-aruko": { source: "event-kamisato-aruko.png", alt: "リュックを背負って歩く大人と子ども" },
  "event-ningyo-festa": { source: "event-ningyo-festa.png", alt: "うさぎや小人の人形を手に笑う、花の帽子の人たち" },
  "event-sports-koryu": { source: "event-sports-koryu.png", alt: "芝の上でボールを打つ大人と、よろこぶ子ども" },
  "event-undokai": { source: "event-undokai.png", alt: "つるしたパンに口をのばす、体操服の大人と子ども" },
  "event-bunkasai": { source: "event-bunkasai.png", alt: "トランペット・サックス・チューバを吹く3人" },
  "event-winter-sports": { source: "event-winter-sports.png", alt: "体育館で、木の棒を投げてピンを倒す子どもと見守る大人" },
  "event-chushin-ohimachi": { source: "event-chushin-ohimachi.png", alt: "青い法被で拍子木を持って町を歩く小学生たち" },
  "event-chushin-terakoya": { source: "event-chushin-terakoya.png", alt: "お坊さんの話を聞きながら机に向かう子どもたち" },
  "event-chushin-ningyo-festa": { source: "event-chushin-ningyo-festa.png", alt: "キツネ・羊・ひまわり・小鳥の手作りの人形を手に笑う大人と子ども" },
  "event-chushin-kyohoku-bunkasai": { source: "event-chushin-kyohoku-bunkasai.png", alt: "舞台で太鼓をたたき、踊り、歌う人たち" },
  "event-chushin-undokai": { source: "event-chushin-undokai.png", alt: "たすきをかけてバトンを持って走る人たち" },
  "event-chushin-maruyama-bunkasai": { source: "event-chushin-maruyama-bunkasai.png", alt: "舞台で楽器を吹く人たちと、石窯でピザを焼く人たち" },
  "event-chushin-mochitsuki": { source: "event-chushin-mochitsuki.png", alt: "もちをつく大人と子ども、羽根つきとこまで遊ぶ子どもたち" },
  "event-chushin-kakizome": { source: "event-chushin-kakizome.png", alt: "書初めとかるたをする子どもたちとおばあさん" },
  "event-kanae-oneday-march": { source: "event-kanae-oneday-march.png", alt: "帽子とリュックで、道を笑顔で歩く子どもからお年寄りまでの人たち" },
  "event-kanae-ningyo-festa": { source: "event-kanae-ningyo-festa.png", alt: "にんじんとうさぎの人形劇の舞台を、床やいすに座って見る人たち" },
  "event-kanae-petanque": { source: "event-kanae-petanque.png", alt: "外の地面で銀色の球を投げるお年寄りと、まわりで見守る人たち" },
  "event-kanae-bunkasai": { source: "event-kanae-bunkasai.png", alt: "はっぴ姿で太鼓をたたく大人と子どもと、それを見る人たち" },
  "event-kanae-ekiden": { source: "event-kanae-ekiden.png", alt: "道路で赤いたすきをつなぐ駅伝の走者と、沿道で応援する人たち" },
  "event-kanae-winter-sports": { source: "event-kanae-winter-sports.png", alt: "体育館のネットをはさんで、黄色い大きな球を打ち合う人たち" },
  // カルテ（2026-11-01 受け取り。春の絵を4地区で使い回す）。見出しの風景は PC で約500px、スマホで約160px に出す
  "karte-header-wide": {
    source: "karte-header-wide.png",
    alt: "山すその町並みと、川をわたる電車の風景",
    widths: [480, 960],
  },
  "karte-header-tall": { source: "karte-header-tall.png", alt: "山すその町並みと、川をわたる電車の風景" },
  // 中心市街地の見出しの絵（2026-11-03 受け取り）
  "karte-header-chushin-wide": {
    source: "karte-header-chushin-wide.png",
    alt: "赤い屋根の駅とバス、ビルの並ぶ通り、アーチ屋根の建物、時計塔のある学校",
    widths: [480, 960],
  },
  "karte-header-chushin-tall": { source: "karte-header-chushin-tall.png", alt: "赤い屋根の駅とバス、ビルの並ぶ通り、アーチ屋根の建物、時計塔のある学校" },
  "karte-childcare": { source: "karte-childcare.png", alt: "時計台のある校舎の前を、ランドセルで歩く子ども3人" },
  "karte-transport": { source: "karte-transport.png", alt: "停留所に止まる緑のバスと、待つ親子" },
  "karte-disaster": { source: "karte-disaster.png", alt: "「避難所」の看板のある建物" },
  "karte-population": { source: "karte-population.png", alt: "おばあさん・おじいさんと、両親と子どもの家族" },
  "karte-public": { source: "karte-public.png", alt: "すべり台とぶらんこのある公園と、街灯・ベンチ" },
  "karte-support": { source: "karte-support.png", alt: "窓口で、職員に相談する親子" },
  "karte-check": { source: "karte-check.png", alt: "家の前で、メモを持って確かめる人" },
  // カルテの詳細の、大きい数字の左の絵（2026-11-01 受け取り。4地区で使い回す）
  "detail-school": { source: "detail-school.png", alt: "時計台のある校舎" },
  "detail-bus": { source: "detail-bus.png", alt: "緑の帯の路線バス" },
  "detail-bus-winter": { source: "detail-bus-winter.png", alt: "屋根に雪の積もった路線バス" },
  "detail-shelter": { source: "detail-shelter.png", alt: "非常口の印のある避難所の建物" },
  "detail-population": { source: "detail-population.png", alt: "おばあさんと、お父さん・女の子" },
  "detail-public": { source: "detail-public.png", alt: "本の印のある公民館の建物と植え込み" },
  "detail-support": { source: "detail-support.png", alt: "書類と、両手で包んだハート" },
  "detail-nursery": { source: "detail-nursery.png", alt: "オレンジの屋根の保育園と、すべり台で遊ぶ子ども" },
  "detail-afterschool": { source: "detail-afterschool.png", alt: "夕方の部屋で、ランドセルを置いて宿題や遊びをする小学生" },
  "detail-train": { source: "detail-train.png", alt: "緑の帯の銀色の電車" },
  "detail-land": { source: "detail-land.png", alt: "杭とロープで区切った更地" },
  // くらしの冬の「雪の道」のピンの丸の中の絵
  "pin-snow-road": { source: "pin-snow-road.png", alt: "青い雪の結晶" },
};

// 書き出す横幅。プレビュー（車の表示はスマホで約150px、PC で約220px）と選択肢のカード（約110px）・地図のカード（約90px）・
// 返事のカード（約80px）で使い、端末に選ばせる
export const PROP_WIDTHS = [240, 480] as const;

// 行事ごとの絵（行事の名前 district_events.name → 絵）。ここにない行事は、種類ごとのドット絵（EVENT_ART_ASSET）で出す。
// 行事のピンの場所（src/lib/kurashi/pins.ts の EVENT_PINS）と同じく名前で引くので、Table Editor で名前を変えたらここも直す
export const EVENT_ILLUSTS: Readonly<Record<string, PropId>> = {
  黒田人形奉納上演: "event-kuroda-ningyo",
  上郷歩こう会: "event-kamisato-aruko",
  "いいだ人形劇フェスタ 上郷地区公演": "event-ningyo-festa",
  春季スポーツ交流会: "event-sports-koryu",
  上郷地区大運動会: "event-undokai",
  上郷地区文化祭: "event-bunkasai",
  冬季スポーツ交流会: "event-winter-sports",
  // 中心市街地（2026-11-02 受け取り）
  おひまち: "event-chushin-ohimachi",
  子ども寺子屋ひがしの: "event-chushin-terakoya",
  "いいだ人形劇フェスタ 丸山地区公演": "event-chushin-ningyo-festa",
  橋北地区文化祭: "event-chushin-kyohoku-bunkasai",
  東野区民大運動会: "event-chushin-undokai",
  丸山地区文化祭: "event-chushin-maruyama-bunkasai",
  "お正月遊び・もちつき大会": "event-chushin-mochitsuki",
  "書初め・お正月遊び": "event-chushin-kakizome",
  // 鼎（2026-11-03 受け取り）
  ふるさと再発見ワンデーマーチ: "event-kanae-oneday-march",
  "いいだ人形劇フェスタ 鼎地区公演": "event-kanae-ningyo-festa",
  "鼎地区体育祭（ペタンク大会）": "event-kanae-petanque",
  "ふるさと鼎ふれあい広場・文化祭": "event-kanae-bunkasai",
  鼎地区縦断駅伝大会: "event-kanae-ekiden",
  冬季スポーツ大会: "event-kanae-winter-sports",
};

export function eventIllustFor(name: string): PropId | null {
  return Object.hasOwn(EVENT_ILLUSTS, name) ? EVENT_ILLUSTS[name] : null;
}

// カルテの見出しの絵。地区の絵がまだない地区は、今の絵（山すその町並み）を使う
const KARTE_HEADERS: Partial<Record<DistrictId, { wide: PropId; tall: PropId }>> = {
  chushin: { wide: "karte-header-chushin-wide", tall: "karte-header-chushin-tall" },
};

export function karteHeaderFor(district: DistrictId): { wide: PropId; tall: PropId } {
  return KARTE_HEADERS[district] ?? { wide: "karte-header-wide", tall: "karte-header-tall" };
}

export function propSrc(prop: PropId, width: number): string {
  return `/${ILLUST_DIR}/${prop}-${width}.webp`;
}

export function propWidths(prop: PropId): readonly number[] {
  return PROP_SOURCES[prop].widths ?? PROP_WIDTHS;
}

export function propSrcSet(prop: PropId): string {
  return propWidths(prop)
    .map((width) => `${propSrc(prop, width)} ${width}w`)
    .join(", ");
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
  chushin: "district-chushin",
  kanae: "district-kanae",
};

// えらぶ 02〜05 のプレビューの背景。まだない地区は飯田市全体の絵の上に家族を並べる（028 まさゆきさん了承）。
// 05 大切なことだけは、町を見わたす別の背景にする（2026-10-29 まさゆきさん）。05 の背景がない地区は 02〜04 と同じ背景
export type ErabuBaseId =
  | "erabu-kamisato-base"
  | "erabu-kamisato-priorities"
  | "erabu-chushin-base"
  | "erabu-chushin-priorities"
  | "erabu-kanae-base"
  | "erabu-kanae-priorities"
  | "erabu-iida-overview";
export type ErabuScene = "base" | "priorities";

export const ERABU_BASES: Partial<Record<DistrictId, Partial<Record<ErabuScene, ErabuBaseId>>>> = {
  kamisato: { base: "erabu-kamisato-base", priorities: "erabu-kamisato-priorities" },
  chushin: { base: "erabu-chushin-base", priorities: "erabu-chushin-priorities" },
  kanae: { base: "erabu-kanae-base", priorities: "erabu-kanae-priorities" },
};

export function erabuBaseFor(district: DistrictId | null, scene: ErabuScene = "base"): ErabuBaseId {
  const bases = district ? ERABU_BASES[district] : undefined;
  return bases?.[scene] ?? bases?.base ?? "erabu-iida-overview";
}

// くらしの場面の絵（028）。上郷の春・夏・秋・冬。ない地区・季節は今のドット絵の場面（ScenePanel）で出す
export type KurashiPictureId =
  | "kurashi-kamisato-spring-wide"
  | "kurashi-kamisato-spring-tall"
  | "kurashi-kamisato-summer-wide"
  | "kurashi-kamisato-summer-tall"
  | "kurashi-kamisato-autumn-wide"
  | "kurashi-kamisato-autumn-tall"
  | "kurashi-kamisato-winter-wide"
  | "kurashi-kamisato-winter-tall"
  | "kurashi-chushin-spring-wide"
  | "kurashi-chushin-spring-tall"
  | "kurashi-chushin-summer-wide"
  | "kurashi-chushin-summer-tall"
  | "kurashi-chushin-autumn-wide"
  | "kurashi-chushin-autumn-tall"
  | "kurashi-chushin-winter-wide"
  | "kurashi-chushin-winter-tall"
  | "kurashi-kanae-spring-wide"
  | "kurashi-kanae-spring-tall"
  | "kurashi-kanae-summer-wide"
  | "kurashi-kanae-summer-tall"
  | "kurashi-kanae-autumn-wide"
  | "kurashi-kanae-autumn-tall"
  | "kurashi-kanae-winter-wide"
  | "kurashi-kanae-winter-tall";
export type KurashiPictures = { wide: KurashiPictureId; tall: KurashiPictureId };

export const KURASHI_PICTURES: Partial<Record<DistrictId, Partial<Record<Season, KurashiPictures>>>> = {
  kamisato: {
    春: { wide: "kurashi-kamisato-spring-wide", tall: "kurashi-kamisato-spring-tall" },
    夏: { wide: "kurashi-kamisato-summer-wide", tall: "kurashi-kamisato-summer-tall" },
    秋: { wide: "kurashi-kamisato-autumn-wide", tall: "kurashi-kamisato-autumn-tall" },
    冬: { wide: "kurashi-kamisato-winter-wide", tall: "kurashi-kamisato-winter-tall" },
  },
  chushin: {
    春: { wide: "kurashi-chushin-spring-wide", tall: "kurashi-chushin-spring-tall" },
    夏: { wide: "kurashi-chushin-summer-wide", tall: "kurashi-chushin-summer-tall" },
    秋: { wide: "kurashi-chushin-autumn-wide", tall: "kurashi-chushin-autumn-tall" },
    冬: { wide: "kurashi-chushin-winter-wide", tall: "kurashi-chushin-winter-tall" },
  },
  kanae: {
    春: { wide: "kurashi-kanae-spring-wide", tall: "kurashi-kanae-spring-tall" },
    夏: { wide: "kurashi-kanae-summer-wide", tall: "kurashi-kanae-summer-tall" },
    秋: { wide: "kurashi-kanae-autumn-wide", tall: "kurashi-kanae-autumn-tall" },
    冬: { wide: "kurashi-kanae-winter-wide", tall: "kurashi-kanae-winter-tall" },
  },
};

export function kurashiPicturesFor(district: DistrictId, season: Season): KurashiPictures | null {
  return KURASHI_PICTURES[district]?.[season] ?? null;
}
