import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "./SiteFooter";

describe("SiteFooter", () => {
  it("対象地区と作成者の表記だけを出し、データについてへつなぐ", () => {
    render(<SiteFooter />);
    expect(screen.getByText("対象地区：上郷・鼎・伊賀良・中心市街地")).toBeInTheDocument();
    expect(screen.getByText(/個人が公開データをもとに作成したもの/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "データについて" })).toHaveAttribute("href", "/about-data");
  });
});
