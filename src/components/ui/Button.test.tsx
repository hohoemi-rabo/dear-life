import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button, ButtonLink } from "./Button";

describe("Button", () => {
  it("フォームを送信しないよう、既定で type=button にする", () => {
    render(<Button>次へ</Button>);
    expect(screen.getByRole("button", { name: "次へ" })).toHaveAttribute("type", "button");
  });

  it("ButtonLink はリンクとして出す", () => {
    render(<ButtonLink href="/karte">カルテで確かめる</ButtonLink>);
    expect(screen.getByRole("link", { name: "カルテで確かめる" })).toHaveAttribute("href", "/karte");
  });
});
