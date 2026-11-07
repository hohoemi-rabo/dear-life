import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DEFAULT_CONDITIONS } from "@/lib/conditions/model";
import { ScreenTabBar } from "./ScreenTabBar";

const conditions = { ...DEFAULT_CONDITIONS, district: "kanae" as const, car: 0 as const };

function tabs() {
  return within(screen.getByRole("navigation", { name: "画面の切り替え" }));
}

describe("ScreenTabBar", () => {
  it("今の画面は印だけにし、ほかの画面へは条件と季節を載せたまま移る", () => {
    render(<ScreenTabBar current="kurabe" conditions={conditions} seasonSlug="winter" />);
    expect(tabs().getByText("地区くらべ")).toHaveAttribute("aria-current", "page");
    expect(tabs().queryByRole("link", { name: "地区くらべ" })).toBeNull();
    expect(tabs().getByRole("link", { name: "くらし" })).toHaveAttribute("href", "/kurashi?s=winter&d=kanae&a=2&k=1&h=new&c=0");
    expect(tabs().getByRole("link", { name: "カルテ" })).toHaveAttribute("href", "/karte?s=winter&d=kanae&a=2&k=1&h=new&c=0");
    expect(tabs().getByRole("link", { name: "地図" })).toHaveAttribute("href", "/chizu?s=winter&d=kanae&a=2&k=1&h=new&c=0");
  });

  it("季節がなければ s を付けない", () => {
    render(<ScreenTabBar current="chizu" conditions={conditions} seasonSlug={null} />);
    expect(tabs().getByRole("link", { name: "くらし" })).toHaveAttribute("href", "/kurashi?d=kanae&a=2&k=1&h=new&c=0");
  });

  it("カルテの詳細では「カルテ」を今の画面として示したまま、一覧へ戻るリンクにする", () => {
    render(<ScreenTabBar current="karte" linkCurrent conditions={conditions} seasonSlug="spring" />);
    const karte = tabs().getByRole("link", { name: "カルテ" });
    expect(karte).toHaveAttribute("href", "/karte?s=spring&d=kanae&a=2&k=1&h=new&c=0");
    expect(karte).toHaveAttribute("aria-current", "true");
  });
});
