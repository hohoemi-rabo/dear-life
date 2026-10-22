import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SourceNote } from "./SourceNote";

describe("SourceNote", () => {
  it("出典・対象・確認日を出す", () => {
    render(<SourceNote source="国土交通省 不動産情報ライブラリ" period="2021年1Q〜2026年1Q" date="2026-10-21" />);
    expect(screen.getByText("国土交通省 不動産情報ライブラリ")).toBeInTheDocument();
    expect(screen.getByText("2021年1Q〜2026年1Q")).toBeInTheDocument();
    expect(screen.getByText("確認日")).toBeInTheDocument();
    expect(screen.getByText("2026年10月21日")).toHaveAttribute("dateTime", "2026-10-21");
  });

  it("自動で取ったデータは取得日として出せる", () => {
    render(<SourceNote source="出典" period="2026年度" date="2026-10-22" dateKind="取得日" />);
    expect(screen.getByText("取得日")).toBeInTheDocument();
  });
});
