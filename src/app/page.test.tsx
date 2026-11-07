import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import Home from "./page";

beforeEach(() => {
  localStorage.clear();
});

describe("トップ", () => {
  it("えらぶとデータについてへのリンクを出す", () => {
    render(<Home />);
    expect(screen.getByRole("link", { name: /わが家の暮らしをつくる/ })).toHaveAttribute("href", "/erabu");
    // スマホと PC で置き場所が違うので2つある（片方は CSS で隠す）
    for (const link of screen.getAllByRole("link", { name: /データと表現について/ })) {
      expect(link).toHaveAttribute("href", "/about-data");
    }
  });

  it("4地区のカードから、その地区を選んだえらぶへ移れる", () => {
    render(<Home />);
    const cards = within(screen.getByRole("region", { name: /どのまちで、暮らしてみる/ })).getAllByRole("link");
    expect(cards.map((card) => [card.textContent?.replace("→", ""), card.getAttribute("href")])).toEqual([
      ["上郷", "/erabu?d=kamisato"],
      ["鼎", "/erabu?d=kanae"],
      ["伊賀良", "/erabu?d=igara"],
      ["中心市街地", "/erabu?d=chushin"],
    ]);
  });

  it("季節の札は押せない（ボタンにしない）", () => {
    render(<Home />);
    expect(screen.getByText("春夏秋冬を のぞける").closest("a, button")).toBeNull();
  });

  it("前に見た画面がなければ「つづきから」を出さない", () => {
    render(<Home />);
    expect(screen.queryByText(/前に見た暮らしのつづきから/)).toBeNull();
  });
});
