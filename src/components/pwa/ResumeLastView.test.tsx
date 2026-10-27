import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { saveLastView } from "@/lib/pwa/last-view";
import { ResumeLastView } from "./ResumeLastView";

beforeEach(() => {
  localStorage.clear();
});

describe("ResumeLastView", () => {
  it("前に見た画面へ、そのときの条件のまま戻るボタンを出す", () => {
    saveLastView("/kurashi", "?d=kamisato&s=winter");
    render(<ResumeLastView />);
    expect(screen.getByRole("link", { name: /前に見たくらしの場面にもどる/ })).toHaveAttribute("href", "/kurashi?d=kamisato&s=winter");
  });

  it("まだ何も見ていなければ出さない", () => {
    const { container } = render(<ResumeLastView />);
    expect(container).toBeEmptyDOMElement();
  });
});
