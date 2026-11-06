import { describe, expect, it } from "vitest";
import { canOpenQuestion, canProceed, nextQuestion, previousQuestion, QUESTIONS, resolveQuestion } from "./questions";

const noDistrict = { district: null, car: null };
const kanae = { district: "kanae", car: null } as const;
const kanaeNoCar = { district: "kanae", car: 0 } as const;

describe("質問の並び", () => {
  it("地区 → 家族 → 家 → 車 → 大切なこと の順で、大切なことだけ飛ばせる", () => {
    expect(QUESTIONS.map((question) => question.stepLabel)).toEqual(["地区", "家族", "家", "車", "大切なこと"]);
    expect(QUESTIONS.filter((question) => question.optional).map((question) => question.id)).toEqual(["priorities"]);
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
    expect(canOpenQuestion("car", kanae)).toBe(true);
    expect(canProceed("district", kanae)).toBe(true);
  });

  it("車を選ぶまでは、大切なことを開けず、次へも押せない。0台でも選べば進める", () => {
    expect(canOpenQuestion("priorities", kanae)).toBe(false);
    expect(canProceed("car", kanae)).toBe(false);
    expect(canOpenQuestion("priorities", kanaeNoCar)).toBe(true);
    expect(canProceed("car", kanaeNoCar)).toBe(true);
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

  it("車がないのに大切なことを指していたら、車に戻す", () => {
    expect(resolveQuestion("priorities", kanae)).toBe("car");
    expect(resolveQuestion("priorities", kanaeNoCar)).toBe("priorities");
  });
});
