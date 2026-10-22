import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { describe, expect, it, vi } from "vitest";
import { StepIndicator } from "./StepIndicator";

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));

function currentStep() {
  return screen.getAllByRole("listitem").find((item) => item.getAttribute("aria-current") === "step");
}

describe("StepIndicator", () => {
  it("3つのステップを順に出す", () => {
    vi.mocked(usePathname).mockReturnValue("/");
    render(<StepIndicator />);
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "01えらぶ",
      "02くらしを見る",
      "03カルテ",
    ]);
  });

  it.each([
    ["/erabu", "01えらぶ"],
    ["/kurashi", "02くらしを見る"],
    ["/karte/", "03カルテ"],
  ])("%s では %s を今のステップにする", (pathname, expected) => {
    vi.mocked(usePathname).mockReturnValue(pathname);
    render(<StepIndicator />);
    expect(currentStep()).toHaveTextContent(expected);
  });

  it.each(["/", "/about-data", "/karteX"])("%s では今のステップを示さない", (pathname) => {
    vi.mocked(usePathname).mockReturnValue(pathname);
    render(<StepIndicator />);
    expect(currentStep()).toBeUndefined();
  });
});
