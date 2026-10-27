import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { describe, expect, it, vi } from "vitest";
import { HeaderMenu } from "./HeaderMenu";

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));

describe("HeaderMenu", () => {
  it("データについて・はじめから選ぶ へつなぎ、画面を移ったら閉じる", () => {
    vi.mocked(usePathname).mockReturnValue("/kurashi");
    const { container, rerender } = render(<HeaderMenu />);
    expect(screen.getByRole("link", { name: "データについて" })).toHaveAttribute("href", "/about-data");
    expect(screen.getByRole("link", { name: "はじめから選ぶ" })).toHaveAttribute("href", "/erabu");

    const menu = container.querySelector("details") as HTMLDetailsElement;
    menu.open = true;
    vi.mocked(usePathname).mockReturnValue("/about-data");
    rerender(<HeaderMenu />);
    expect(menu.open).toBe(false);
  });
});
