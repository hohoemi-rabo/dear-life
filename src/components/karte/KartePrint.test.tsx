import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_CONDITIONS } from "@/lib/conditions/model";
import { screenDataFixture } from "@/test/screen-data-fixture";
import { KartePrintButton, loadKartePrintDocument } from "./KartePrint";

vi.mock("@/lib/data/load-screen-data", () => {
  const data = Promise.resolve(screenDataFixture());
  return { loadScreenData: () => data, clearScreenDataCache: () => {} };
});

vi.mock("next/navigation", () => {
  const params = new URLSearchParams("d=kamisato");
  return { usePathname: () => "/karte", useRouter: () => ({ push: () => {}, replace: () => {} }), useSearchParams: () => params };
});

const conditions = { ...DEFAULT_CONDITIONS, district: "kamisato" } as const;

describe("KartePrintButton（044）", () => {
  it("印刷用の中身はあとから読む。届くまで窓の「印刷する」は押せず、届いたら押せる", async () => {
    render(<KartePrintButton conditions={conditions} current={null} />);
    // ボタンは最初から出ている（中身を待たない）
    fireEvent.click(screen.getByRole("button", { name: "印刷する" }));
    const sheet = within(screen.getByRole("dialog"));
    expect(sheet.getByRole("button", { name: "準備しています" })).toBeDisabled();

    await act(async () => {
      await loadKartePrintDocument();
    });
    expect(sheet.getByRole("button", { name: "印刷する" })).toBeEnabled();
  });
});
