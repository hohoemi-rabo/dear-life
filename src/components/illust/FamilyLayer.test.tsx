import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FamilyLayer } from "./FamilyLayer";

function spriteSources(container: HTMLElement): string[] {
  return [...container.querySelectorAll("img")].map((img) => img.getAttribute("src") ?? "");
}

describe("FamilyLayer の後ろ姿の服（2026-11-01 まさゆきさん：季節で服を変える）", () => {
  it("くらしの冬は、家族全員が冬服の後ろ姿になる", () => {
    const { container } = render(
      <FamilyLayer members={["father", "boy", "girl2", "mother"]} background="kurashi-kamisato-winter-tall" facing="back" season="冬" />,
    );
    expect(spriteSources(container)).toEqual([
      "/illust/person-father-back-winter.webp",
      "/illust/person-boy-back-winter.webp",
      "/illust/person-girl2-back-winter.webp",
      "/illust/person-mother-back-winter.webp",
    ]);
  });

  it("季節を変えると、同じ人のまま服だけが変わる", () => {
    const { container, rerender } = render(
      <FamilyLayer members={["father", "mother"]} background="kurashi-kamisato-summer-wide" facing="back" season="夏" />,
    );
    expect(spriteSources(container)).toEqual(["/illust/person-father-back-summer.webp", "/illust/person-mother-back-summer.webp"]);
    rerender(<FamilyLayer members={["father", "mother"]} background="kurashi-kamisato-autumn-wide" facing="back" season="秋" />);
    expect(spriteSources(container)).toEqual(["/illust/person-father-back-autumn.webp", "/illust/person-mother-back-autumn.webp"]);
  });

  it("春と、季節のないえらぶ 05 は今の後ろ姿のまま", () => {
    const spring = render(<FamilyLayer members={["boy"]} background="kurashi-kamisato-spring-tall" facing="back" season="春" />);
    expect(spriteSources(spring.container)).toEqual(["/illust/person-boy-back.webp"]);
    const erabu = render(<FamilyLayer members={["boy"]} background="erabu-kamisato-priorities" facing="back" />);
    expect(spriteSources(erabu.container)).toEqual(["/illust/person-boy-back.webp"]);
  });
});
