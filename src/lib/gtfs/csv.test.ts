import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";

describe("parseCsv", () => {
  it("BOM と CRLF を外し、見出しの名前で値を取り出す", () => {
    expect(parseCsv("﻿stop_id,stop_name\r\n1001_01,飯田駅前\r\n")).toEqual([{ stop_id: "1001_01", stop_name: "飯田駅前" }]);
  });

  it("引用符で囲んだ値のカンマ・改行・二重引用符を読む", () => {
    expect(parseCsv('a,b\n"x,y","1行目\n2行目"\n"say ""hi""",z\n')).toEqual([
      { a: "x,y", b: "1行目\n2行目" },
      { a: 'say "hi"', b: "z" },
    ]);
  });

  it("値の前後の空白を外し、足りない列は空文字にし、空行は読み飛ばす", () => {
    expect(parseCsv("a,b,c\n 1 ,2\n\n3,4,5")).toEqual([
      { a: "1", b: "2", c: "" },
      { a: "3", b: "4", c: "5" },
    ]);
  });

  it("見出しより列が多い行や、閉じていない引用符は読み違えないよう止める", () => {
    expect(() => parseCsv("a,b\n1,2,3\n")).toThrow("2行目");
    expect(() => parseCsv('a\n"open\n')).toThrow("引用符");
  });
});
