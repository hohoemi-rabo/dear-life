import { beforeEach, describe, expect, it } from "vitest";
import { lastViewOf, readLastViewHref, saveLastView } from "./last-view";

beforeEach(() => {
  localStorage.clear();
});

describe("最後に見た画面", () => {
  it("くらし・カルテ・地区くらべ・地図の場所と条件を残し、戻り先にする", () => {
    saveLastView("/karte", "?d=kanae&a=2&k=1&c=0");
    expect(readLastViewHref()).toBe("/karte?d=kanae&a=2&k=1&c=0");
    expect(lastViewOf(readLastViewHref())).toEqual({ href: "/karte?d=kanae&a=2&k=1&c=0", label: "カルテ" });
  });

  it("あとから見た画面で上書きする", () => {
    saveLastView("/kurashi", "?d=igara&s=winter");
    saveLastView("/chizu", "");
    expect(lastViewOf(readLastViewHref())).toEqual({ href: "/chizu", label: "地図" });
  });

  it("えらぶ・入口・データについては残さない", () => {
    for (const path of ["/erabu", "/", "/about-data"]) saveLastView(path, "?q=district");
    expect(readLastViewHref()).toBeNull();
  });

  it("書きかえられた値は使わない", () => {
    localStorage.setItem("dearlife:last-view", "https://example.com/karte");
    expect(readLastViewHref()).toBeNull();
    localStorage.setItem("dearlife:last-view", "/karte?d=<script>");
    expect(readLastViewHref()).toBeNull();
    localStorage.setItem("dearlife:last-view", "//example.com");
    expect(readLastViewHref()).toBeNull();
  });
});
