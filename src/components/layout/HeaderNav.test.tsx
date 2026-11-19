import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { describe, expect, it, vi } from "vitest";
import { HeaderNav } from "./HeaderNav";

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));

describe("HeaderNav", () => {
  it("トップでは進みぐあいを出さない（データについては出す）", () => {
    vi.mocked(usePathname).mockReturnValue("/");
    render(<HeaderNav />);
    expect(screen.queryByRole("list", { name: "進みぐあい" })).toBeNull();
    expect(screen.getByRole("link", { name: "データについて" })).toHaveAttribute("href", "/about-data");
    // スマホの「≡」メニューは出さない（見本は「ⓘ データ」）
    expect(screen.queryByText("≡")).toBeNull();
    expect(screen.queryByRole("link", { name: "トップ" })).toBeNull();
  });

  it("カルテでは進みぐあいと、トップへ戻るリンクを出す", () => {
    vi.mocked(usePathname).mockReturnValue("/karte");
    render(<HeaderNav />);
    expect(screen.getByRole("list", { name: "進みぐあい" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "トップ" })).toHaveAttribute("href", "/");
  });
});
