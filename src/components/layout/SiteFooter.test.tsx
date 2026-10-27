import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "./SiteFooter";

describe("SiteFooter", () => {
  it("対象地区・除外した取引・API のクレジット・作成者の表記を出し、データについてへつなぐ", () => {
    render(<SiteFooter />);
    expect(screen.getByText("対象地区：上郷・鼎・伊賀良・中心市街地")).toBeInTheDocument();
    expect(screen.getByText(/調停・競売等、関係者間取引、隣地の購入は除いています/)).toBeInTheDocument();
    expect(screen.getByText(/個人が公開データをもとに作成したもの/)).toBeInTheDocument();
    // 不動産情報ライブラリ API 利用約款 第7条の文言を、一字も変えずに全画面に出す
    expect(
      screen.getByText("このサービスは、国土交通省の不動産情報ライブラリのAPI機能を使用していますが、提供情報の最新性、正確性、完全性等が保証されたものではありません"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "データについて" })).toHaveAttribute("href", "/about-data");
  });
});
