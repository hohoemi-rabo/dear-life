// 場面のひな形の下書き（要件 6.1・6.3・9.5）。scene_templates・scene_sentences の中身はここが正で、
// npm run scenes:sql がマイグレーションにする。直すときもここを直す（Table Editor で直すと、次の書き出しで戻る）。
// 公開は、まさゆきさんが確認した日を reviewed_on に入れて書き出し直す
import type { SceneSentence } from "../data/screen-data.ts";
import type { SceneTemplateDraft } from "./check.ts";

type SentenceOptions = Partial<Omit<SceneSentence, "position" | "kind" | "body">>;

function sentences(...items: [SceneSentence["kind"], string, SentenceOptions?][]): SceneSentence[] {
  return items.map(([kind, body, options = {}], index) => ({
    position: index + 1,
    kind,
    body,
    karte_card: null,
    has_children: null,
    car: null,
    housing: null,
    fallback_body: null,
    source_id: null,
    ...options,
  }));
}

// 冬・買う・古め：古い家の寒さに触れる想定の一文（要件 4章）
const OLD_HOUSE_COLD: [SceneSentence["kind"], string, SentenceOptions] = [
  "想定",
  "古い家では、朝の冷えこみを部屋の中でも感じることがあります。",
  { housing: "買う・古め" },
];

export const SCENE_TEMPLATE_DRAFTS: readonly SceneTemplateDraft[] = [
  {
    season: "春",
    has_children: true,
    car: null,
    housing: null,
    title: "春・子どもあり・入園と入学",
    reviewed_on: "2026-10-27",
    sentences: sentences(
      ["想定", "春、入園と入学の季節です。"],
      ["データ", "{地区名}には、保育園・幼稚園等が{保育施設の数}か所あります。", { karte_card: "子育て・学校" }],
      [
        "データ",
        "たとえば{保育施設名}（{保育施設の住所}）です。",
        { karte_card: "子育て・学校", fallback_body: "たとえば{保育施設名}です。" },
      ],
      [
        "データ",
        "小学校は主に{小学校区}、中学校は主に{中学校区}の学区になります。",
        { karte_card: "子育て・学校", fallback_body: "小学校は主に{小学校区}の学区になります。" },
      ],
      ["想定", "家族で、新しい毎日の準備をします。"],
    ),
  },
  {
    season: "春",
    has_children: false,
    car: null,
    housing: null,
    title: "春・子どもなし・地区の公共施設",
    reviewed_on: "2026-10-27",
    sentences: sentences(
      ["想定", "春、あたたかくなって、地区の中を見てまわります。"],
      ["データ", "{地区名}には、公民館や図書館、公園などの公共施設が{公共施設の数}か所あります。", { karte_card: "公共施設" }],
      [
        "データ",
        "たとえば{公共施設名}（{公共施設の住所}）があります。",
        { karte_card: "公共施設", fallback_body: "たとえば{公共施設名}があります。" },
      ],
      ["想定", "休みの日の過ごし方を、家族で話します。"],
    ),
  },
  {
    season: "夏",
    has_children: null,
    car: null,
    housing: null,
    title: "夏・大雨と避難",
    reviewed_on: "2026-10-27",
    sentences: sentences(
      ["想定", "夏、強い雨が降りつづく日があります。"],
      ["データ", "{地区名}には、市の指定緊急避難場所が{避難場所の数}か所あります。", { karte_card: "防災" }],
      [
        "データ",
        "そのうち洪水と土砂災害の両方に使える場所は{大雨の避難場所の数}か所で、たとえば{大雨の避難場所名}（{大雨の避難場所の住所}）です。",
        {
          karte_card: "防災",
          fallback_body: "そのうち洪水と土砂災害の両方に使える場所は{大雨の避難場所の数}か所で、たとえば{大雨の避難場所名}です。",
        },
      ],
      ["想定", "家族で、避難する場所と道すじを話しておきます。"],
    ),
  },
  {
    season: "秋",
    has_children: null,
    car: null,
    housing: null,
    title: "秋・地区の行事",
    reviewed_on: "2026-10-27",
    sentences: sentences(
      ["想定", "秋、地区の行事の季節です。"],
      ["地区の情報", "{地区名}では、{行事の時期}に{行事名}があります。"],
      [
        "データ",
        "{地区名}に住んでいる人は{人口}人で、そのうち14歳以下は{子どもの人口}人です（{人口の時点}）。",
        { karte_card: "人口", fallback_body: "{地区名}に住んでいる人は{人口}人です（{人口の時点}）。" },
      ],
      ["想定", "家族で、行事の日をカレンダーに書きこみます。"],
    ),
  },
  {
    season: "冬",
    has_children: null,
    car: "車なし",
    housing: null,
    title: "冬・車なし・バスと電車でおでかけ",
    reviewed_on: "2026-10-27",
    sentences: sentences(
      ["想定", "冬の休みの日、車を使わずに出かけます。"],
      [
        "データ",
        "{バスの曜日}、{バスの乗り場}を{バスの発車時刻}に出るバスに乗り、{バスの到着時刻}に{バスの降り場}に着きます。",
        { karte_card: "交通" },
      ],
      [
        "データ",
        "{バスの乗り場}から{バスの降り場}へ乗りかえなしで行くバスは、この日は1日{バスの本数}本です。帰りは{バスの帰りの発車時刻}発、その次の便は{バスの次の便の時刻}発です。",
        {
          karte_card: "交通",
          fallback_body:
            "{バスの乗り場}から{バスの降り場}へ乗りかえなしで行くバスは、この日は1日{バスの本数}本です。帰りは{バスの帰りの発車時刻}発で、そのあとの帰りの便はありません。",
        },
      ],
      // 駅のない地区（伊賀良）では出ない。電車の時刻の出典が公開されるまでは「電車の便：データ未取得」になる（026）
      [
        "データ",
        "電車なら、{電車の乗り場}駅を{電車の発車時刻}に出る{電車の種別}で、{電車の到着時刻}に{電車の降り場}駅に着きます。{電車の降り場}駅へ行く電車は特急を除いて1日{電車の本数}本で、帰りは{電車の帰りの発車時刻}発、その次は{電車の次の便の時刻}発です。",
        {
          karte_card: "交通",
          fallback_body:
            "電車なら、{電車の乗り場}駅を{電車の発車時刻}に出る{電車の種別}で、{電車の到着時刻}に{電車の降り場}駅に着きます。{電車の降り場}駅へ行く電車は特急を除いて1日{電車の本数}本で、帰りは{電車の帰りの発車時刻}発、そのあとの帰りの便はありません。",
        },
      ],
      OLD_HOUSE_COLD,
    ),
  },
  {
    season: "冬",
    has_children: null,
    car: "車あり・未選択",
    housing: null,
    title: "冬・車あり・雪と路面の凍結",
    reviewed_on: "2026-10-27",
    sentences: sentences(
      ["想定", "冬の朝、車で出かけます。"],
      [
        "データ",
        "飯田市では、近年は雪が降っても積もるのは10cmほどですが、ひと冬に2〜3回は雪かきが要るとされています。",
        { source_id: "rakuen_shinshu_iida_sheet" },
      ],
      [
        "データ",
        "朝晩は氷点下になって路面が凍るため、車を持つならスタッドレスタイヤが欠かせないとされています。",
        { source_id: "rakuen_shinshu_iida_sheet" },
      ],
      OLD_HOUSE_COLD,
      ["想定", "出かける前に、車の窓の霜をとかします。"],
    ),
  },
];
