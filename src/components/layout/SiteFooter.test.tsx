import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "./SiteFooter";

describe("SiteFooter", () => {
  it("対象地区・除外した取引・作成者の表記を出し、データについてへつなぐ", () => {
    render(<SiteFooter />);
    expect(screen.getByText("対象地区：上郷・鼎・伊賀良・中心市街地")).toBeInTheDocument();
    expect(screen.getByText(/調停・競売等、関係者間取引、隣地の購入は除いています/)).toBeInTheDocument();
    expect(screen.getByText(/個人が公開データをもとに作成したもの/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "データについて" })).toHaveAttribute("href", "/about-data");
  });
});
