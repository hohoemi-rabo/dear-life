import { describe, expect, it } from "vitest";
import { canOpenQuestion, canProceed, nextQuestion, previousQuestion, QUESTIONS, resolveQuestion } from "./questions";

const noDistrict = { district: null };
const kanae = { district: "kanae" } as const;

describe("質問の並び", () => {
  it("地区 → 家族 → 家 → 車 → 大切なこと の順で、車と大切なことだけ飛ばせる", () => {
    expect(QUESTIONS.map((question) => question.stepLabel)).toEqual(["地区", "家族", "家", "車", "大切なこと"]);
    expect(QUESTIONS.filter((question) => question.optional).map((question) => question.id)).toEqual(["car", "priorities"]);
  });

  it("前後の質問をたどれ、端では null", () => {
    expect(previousQuestion("district")).toBeNull();
    expect(nextQuestion("district")).toBe("family");
    expect(previousQuestion("car")).toBe("housing");
    expect(nextQuestion("priorities")).toBeNull();
  });
});

describe("進めるかどうか", () => {
  it("地区を選ぶまでは、地区より後ろを開けず、次へも押せない", () => {
    expect(canOpenQuestion("district", noDistrict)).toBe(true);
    expect(canOpenQuestion("family", noDistrict)).toBe(false);
    expect(canProceed("district", noDistrict)).toBe(false);
    expect(canOpenQuestion("priorities", kanae)).toBe(true);
    expect(canProceed("district", kanae)).toBe(true);
  });

  it("家族・家は初期値があるので、いつでも次へ進める", () => {
    expect(canProceed("family", kanae)).toBe(true);
    expect(canProceed("housing", kanae)).toBe(true);
  });
});

describe("resolveQuestion（URL の q）", () => {
  it("知らない値・空は最初の質問にする", () => {
    expect(resolveQuestion(null, kanae)).toBe("district");
    expect(resolveQuestion("unknown", kanae)).toBe("district");
  });

  it("地区がないのに後ろの質問を指していたら、地区に戻す", () => {
    expect(resolveQuestion("car", noDistrict)).toBe("district");
    expect(resolveQuestion("car", kanae)).toBe("car");
  });
});
