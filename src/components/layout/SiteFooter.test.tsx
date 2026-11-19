import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { describe, expect, it, vi } from "vitest";
import { SiteFooter } from "./SiteFooter";

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));

describe("SiteFooter", () => {
  it("対象地区と作成者の表記だけを出し、データについてへつなぐ", () => {
    vi.mocked(usePathname).mockReturnValue("/karte");
    render(<SiteFooter />);
    expect(screen.getByText("対象地区：上郷・鼎・伊賀良・中心市街地")).toBeInTheDocument();
    expect(screen.getByText(/個人が公開データをもとに作成したもの/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "データについて" })).toHaveAttribute("href", "/about-data");
    expect(screen.getByRole("link", { name: "トップへ" })).toHaveAttribute("href", "/");
  });

  it("トップでは「トップへ」を出さない", () => {
    vi.mocked(usePathname).mockReturnValue("/");
    render(<SiteFooter />);
    expect(screen.queryByRole("link", { name: "トップへ" })).toBeNull();
  });
});
