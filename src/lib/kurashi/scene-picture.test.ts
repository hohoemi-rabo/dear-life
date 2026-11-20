import { afterEach, describe, expect, it } from "vitest";
import { kurashiPicturesFor } from "../illust/assets.ts";
import { scenePicturePreloads, scenePicturePreloadScript, TALL_MEDIA, WIDE_MEDIA } from "./scene-picture.ts";

function runAt(search: string) {
  window.history.replaceState({}, "", `/kurashi${search}`);
  new Function(scenePicturePreloadScript())();
  return [...document.head.querySelectorAll<HTMLLinkElement>('link[rel="preload"][as="image"]')];
}

afterEach(() => {
  document.head.querySelectorAll('link[rel="preload"]').forEach((link) => link.remove());
});

describe("scenePicturePreloadScript", () => {
  it("URL の地区と季節の絵を、縦長と横長の2つ先読みする（画面の <picture> と同じ指定）", () => {
    const links = runAt("?d=kanae&a=2&k=1&s=winter");
    const expected = scenePicturePreloads(kurashiPicturesFor("kanae", "冬"));
    expect(links.map((link) => link.getAttribute("imagesrcset"))).toEqual(expected.map((spec) => spec.srcSet));
    expect(links.map((link) => link.getAttribute("imagesizes"))).toEqual(expected.map((spec) => spec.sizes));
    expect(links.map((link) => link.media)).toEqual([TALL_MEDIA, WIDE_MEDIA]);
    expect(links.every((link) => link.getAttribute("fetchpriority") === "high")).toBe(true);
  });

  it("季節がない・知らない値なら春の絵（画面の parseSeason と同じ）", () => {
    const spring = scenePicturePreloads(kurashiPicturesFor("igara", "春")).map((spec) => spec.srcSet);
    expect(runAt("?d=igara").map((link) => link.getAttribute("imagesrcset"))).toEqual(spring);
    document.head.querySelectorAll('link[rel="preload"]').forEach((link) => link.remove());
    expect(runAt("?d=igara&s=rainy").map((link) => link.getAttribute("imagesrcset"))).toEqual(spring);
  });

  it("地区がない・知らない値なら何も読まない", () => {
    expect(runAt("?s=summer")).toHaveLength(0);
    expect(runAt("?d=tokyo&s=summer")).toHaveLength(0);
  });
});
