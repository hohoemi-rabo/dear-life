import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IllustratedScene, preloadScenePicture } from "./IllustratedScene";

const pictures = { wide: "kurashi-kamisato-summer-wide", tall: "kurashi-kamisato-summer-tall" } as const;

describe("preloadScenePicture（2026-11-01 表示の速さの測り直し）", () => {
  it("風景の絵の先読みは、<picture> と同じ版の候補・表示幅で、スマホ用と PC 用を幅で出しわける", () => {
    function Scene() {
      preloadScenePicture(pictures);
      return <IllustratedScene pictures={pictures} season="夏" label="夏" members={[]} hiddenChildren={0} pins={[]} openPin={null} onOpenPin={() => {}} popover={null} />;
    }
    const { container } = render(<Scene />);
    const links = [...document.head.querySelectorAll<HTMLLinkElement>('link[rel="preload"][as="image"]')];
    const img = container.querySelector("picture img")!;
    const source = container.querySelector("picture source")!;
    const tall = links.find((link) => link.getAttribute("imagesrcset")?.includes("summer-tall"))!;
    const wide = links.find((link) => link.getAttribute("imagesrcset")?.includes("summer-wide"))!;
    expect(tall.getAttribute("imagesrcset")).toBe(img.getAttribute("srcset"));
    expect(tall.getAttribute("imagesizes")).toBe(img.getAttribute("sizes"));
    expect(tall.getAttribute("media")).toBe("(max-width: 1023.98px)");
    expect(wide.getAttribute("imagesrcset")).toBe(source.getAttribute("srcset"));
    expect(wide.getAttribute("imagesizes")).toBe(source.getAttribute("sizes"));
    expect(wide.getAttribute("media")).toBe(source.getAttribute("media"));
  });
});
