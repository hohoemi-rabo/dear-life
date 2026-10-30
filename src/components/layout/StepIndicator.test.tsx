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
      "えらぶ",
      "くらしを見る",
      "カルテ",
    ]);
  });

  it.each([
    ["/erabu", "えらぶ"],
    ["/kurashi", "くらしを見る"],
    ["/karte/", "カルテ"],
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
