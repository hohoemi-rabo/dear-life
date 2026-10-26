import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { SceneSentence } from "@/lib/data/screen-data";
import { checkSentence, checkTemplates, type SceneTemplateDraft } from "./check";
import { SCENE_TEMPLATE_DRAFTS } from "./drafts";
import { buildSceneTemplatesSql } from "./sql";

function sentence(kind: SceneSentence["kind"], body: string, extra: Partial<SceneSentence> = {}): SceneSentence {
  return {
    position: 1,
    kind,
    body,
    karte_card: null,
    has_children: null,
    car: null,
    housing: null,
    fallback_body: null,
    source_id: null,
    ...extra,
  };
}

describe("checkSentence", () => {
  it.each([
    ["数字", "朝7時に出かけます。", /数字/],
    ["全角の数字", "朝７時に出かけます。", /数字/],
    ["差し込み", "{地区名}を歩きます。", /差し込み部分/],
    ["施設の名前", "家族で上郷公民館へ行きます。", /施設の名前/],
    ["評価", "便利な地区です。", /評価/],
    ["距離", "家から近い場所です。", /距離/],
  ])("想定の文に%sを入れない", (_, body, problem) => {
    expect(checkSentence(sentence("想定", body)).join("\n")).toMatch(problem);
  });

  it("行事を「義務」「負担」などと評価しない", () => {
    expect(checkSentence(sentence("地区の情報", "{行事名}は負担が重い行事です。")).join("\n")).toMatch(/評価/);
  });

  it("データの文の距離の書き方も止める", () => {
    expect(checkSentence(sentence("データ", "{保育施設名}まで歩いて{保育施設の数}分です。")).join("\n")).toMatch(/距離/);
  });

  it("知らない差し込み部分・データのないデータの文・行事のない地区の情報の文を止める", () => {
    expect(checkSentence(sentence("データ", "{施設名}があります。")).join("\n")).toMatch(/知らない差し込み部分 \{施設名\}/);
    expect(checkSentence(sentence("データ", "{地区名}の冬です。")).join("\n")).toMatch(/データの差し込みも出典もない/);
    expect(checkSentence(sentence("地区の情報", "{地区名}の秋です。")).join("\n")).toMatch(/行事の差し込みがない/);
  });

  it("本文に書いた事実は、話題の決まった出典があればデータの文にできる", () => {
    expect(checkSentence(sentence("データ", "路面が凍ります。", { source_id: "rakuen_shinshu_iida_sheet" }))).toEqual([]);
    expect(checkSentence(sentence("データ", "路面が凍ります。", { source_id: "unknown" })).join("\n")).toMatch(/話題が決まっていない/);
  });
});

describe("checkTemplates", () => {
  it("下書きのひな形は、全条件の組み合わせ（駅のある地区・ない地区とも）で4季節とも1つに決まり、3〜5文になる", () => {
    expect(checkTemplates(SCENE_TEMPLATE_DRAFTS)).toEqual([]);
  });

  it("ひな形がない季節・同じ細かさで2つ合うひな形・文の数の過不足を見つける", () => {
    const base = SCENE_TEMPLATE_DRAFTS.filter((t) => t.season !== "夏");
    expect(checkTemplates(base).join("\n")).toMatch(/夏（.*）：ひな形がない/);

    const summer = SCENE_TEMPLATE_DRAFTS.find((t) => t.season === "夏") as SceneTemplateDraft;
    const ambiguous = [...base, { ...summer, has_children: true }, { ...summer, car: "車なし" as const }];
    expect(checkTemplates(ambiguous).join("\n")).toMatch(/1つに決まりません/);

    const short = [...base, { ...summer, sentences: summer.sentences.slice(0, 2) }];
    expect(checkTemplates(short).join("\n")).toMatch(/文が2文になる/);
  });
});

describe("ひな形のマイグレーション（npm run scenes:sql）", () => {
  it("決まりに合わないひな形は書き出さない", () => {
    const [first, ...rest] = SCENE_TEMPLATE_DRAFTS;
    const broken = { ...first, sentences: [sentence("想定", "朝7時です。"), ...first.sentences.slice(1)] };
    expect(() => buildSceneTemplatesSql([broken, ...rest])).toThrow(/数字/);
  });

  it("いちばん新しいマイグレーションが drafts.ts と同じ中身になっている（直したら npm run scenes:sql を動かす）", () => {
    const dir = join(__dirname, "../../../supabase/migrations");
    const latest = readdirSync(dir)
      .filter((file) => file.endsWith("_scene_templates_data.sql"))
      .sort()
      .at(-1);
    expect(latest).toBeDefined();
    expect(readFileSync(join(dir, latest as string), "utf8")).toBe(buildSceneTemplatesSql(SCENE_TEMPLATE_DRAFTS));
  });
});
