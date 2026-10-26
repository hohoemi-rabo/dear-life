import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CountBadge } from "./CountBadge";

describe("CountBadge", () => {
  it("件数と件数ラベルを一緒に出す", () => {
    render(<CountBadge count={39} />);
    expect(screen.getByText("39件")).toBeInTheDocument();
    expect(screen.getByText("件数じゅうぶん")).toBeInTheDocument();
  });

  it("件数が少ないときは参考程度と出す", () => {
    render(<CountBadge count={8} />);
    expect(screen.getByText("件数少なめ・参考程度")).toBeInTheDocument();
  });
});

describe("CountBadge（alwaysFew）", () => {
  it("件数が多くても「件数少なめ・参考程度」にする", () => {
    render(<CountBadge count={12} alwaysFew />);
    expect(screen.getByText("12件")).toBeInTheDocument();
    expect(screen.getByText("件数少なめ・参考程度")).toBeInTheDocument();
  });
});
