import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { placeInSlot } from "@/lib/pixel/scenes";
import { PixelScene } from "./PixelScene";

describe("PixelScene", () => {
  const layers = [placeInSlot("bg-spring", "full"), placeInSlot("family-a2-c1", "family")];

  it("場面全体を1枚の絵として、部品の代替テキストをつないで読ませる", () => {
    render(<PixelScene layers={layers} />);
    expect(screen.getByRole("img")).toHaveAccessibleName(
      "春の景色。雪の残る山と盆地の家並み、満開の桜と、草地のあいだの道。大人2人と子ども1人の家族",
    );
  });

  it("部品を前に書いた順に重ね、場面に対する割合で置く", () => {
    const { container } = render(<PixelScene layers={layers} />);
    const images = container.querySelectorAll("img");
    expect(Array.from(images, (image) => image.getAttribute("src"))).toEqual(["/pixel/bg-spring.png", "/pixel/family-a2-c1.png"]);
    // 家族（36×21）は (58, 64) に置く
    expect(images[1].style.left).toBe(`${(58 / 160) * 100}%`);
    expect(images[1].style.top).toBe(`${(64 / 90) * 100}%`);
    expect(images[1].style.width).toBe(`${(36 / 160) * 100}%`);
    for (const image of images) expect(image).toHaveClass("pixelated");
  });
});
