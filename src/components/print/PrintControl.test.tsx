import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PrintControl } from "./PrintControl";
import { usePrintMode } from "./PrintMode";

const OPTIONS = [
  { id: "summary", label: "まとめ" },
  { id: "housing", label: "住まい" },
  { id: "transport", label: "交通" },
] as const;
type Id = (typeof OPTIONS)[number]["id"];

function Document({ items }: { items: readonly Id[] }) {
  const printing = usePrintMode();
  return (
    <p data-testid="printed">
      {items.join(",")}
      {printing && "（印刷用）"}
    </p>
  );
}

function open(initial: readonly Id[] = ["summary", "housing", "transport"], shortcut: readonly Id[] = ["summary"]) {
  render(<PrintControl options={OPTIONS} initial={initial} shortcut={shortcut} renderDocument={(items) => <Document items={items} />} />);
  fireEvent.click(screen.getByRole("button", { name: "印刷する" }));
  return within(screen.getByRole("dialog"));
}

const printed = () => document.querySelector("[data-print-document]");

let print: ReturnType<typeof vi.fn>;
beforeEach(() => {
  print = vi.fn();
  window.print = print as unknown as typeof window.print;
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("PrintControl（023）", () => {
  it("窓を開くと、initial にチェックが入っている", () => {
    const sheet = open(["housing"]);
    expect(sheet.getByRole("checkbox", { name: "住まい" })).toBeChecked();
    expect(sheet.getByRole("checkbox", { name: "まとめ" })).not.toBeChecked();
    expect(sheet.getByRole("checkbox", { name: "交通" })).not.toBeChecked();
    // 絵を先に読み込むため、窓を開いているあいだからチェックしているものの中身を作っておく
    expect(screen.getByTestId("printed")).toHaveTextContent("housing");
  });

  it("チェックしたものを、選択肢の並びで body の直下に作ってから印刷を呼ぶ", async () => {
    const sheet = open(["transport"]);
    fireEvent.click(sheet.getByRole("checkbox", { name: "まとめ" }));
    await act(async () => {
      fireEvent.click(sheet.getByRole("button", { name: "印刷する" }));
    });
    expect(print).toHaveBeenCalledTimes(1);
    expect(printed()?.parentElement).toBe(document.body);
    expect(screen.getByTestId("printed")).toHaveTextContent("summary,transport（印刷用）");
  });

  it("何も選んでいないと印刷できない。「すべて選ぶ」「すべて外す」で切りかえる", () => {
    const sheet = open(["summary", "housing", "transport"]);
    fireEvent.click(sheet.getByRole("button", { name: "すべて外す" }));
    expect(sheet.getAllByRole("checkbox").every((box) => !(box as HTMLInputElement).checked)).toBe(true);
    expect(sheet.getByRole("button", { name: "印刷する" })).toBeDisabled();
    fireEvent.click(sheet.getByRole("button", { name: "すべて選ぶ" }));
    expect(sheet.getAllByRole("checkbox").every((box) => (box as HTMLInputElement).checked)).toBe(true);
    expect(sheet.getByRole("button", { name: "印刷する" })).toBeEnabled();
  });

  it("印刷は「印刷する」を押したその場で呼ぶ（Safari は時間をおいた印刷を無視する）", () => {
    const sheet = open(["housing"]);
    act(() => {
      fireEvent.click(sheet.getByRole("button", { name: "印刷する" }));
    });
    expect(print).toHaveBeenCalledTimes(1);
  });

  it("ブラウザのメニューから印刷したときは、shortcut を出す", () => {
    render(<PrintControl options={OPTIONS} initial={["housing"]} shortcut={["summary"]} renderDocument={(items) => <Document items={items} />} />);
    expect(printed()).toBeNull();
    act(() => {
      window.dispatchEvent(new Event("beforeprint"));
    });
    expect(screen.getByTestId("printed")).toHaveTextContent("summary");
  });

  it("窓から印刷したあとは、ブラウザの印刷の前に選んだものを上書きしない", async () => {
    const sheet = open(["housing"]);
    await act(async () => {
      fireEvent.click(sheet.getByRole("button", { name: "印刷する" }));
    });
    act(() => {
      window.dispatchEvent(new Event("beforeprint"));
    });
    expect(screen.getByTestId("printed")).toHaveTextContent("housing");
  });

  describe("iPhone のホーム画面のアプリ", () => {
    afterEach(() => {
      delete (window.navigator as Navigator & { standalone?: boolean }).standalone;
      delete (window.navigator as { clipboard?: unknown }).clipboard;
    });

    it("印刷の窓の代わりに、Safari で開く案内を出し、印刷は呼ばない", () => {
      Object.defineProperty(window.navigator, "standalone", { value: true, configurable: true });
      render(<PrintControl options={OPTIONS} initial={["housing"]} shortcut={["summary"]} renderDocument={(items) => <Document items={items} />} />);
      fireEvent.click(screen.getByRole("button", { name: "印刷する" }));
      const sheet = within(screen.getByRole("dialog"));
      expect(sheet.getByRole("heading", { name: "Safari で開いて印刷してください" })).toBeInTheDocument();
      expect(sheet.queryByRole("link")).toBeNull();
      expect(sheet.queryAllByRole("checkbox")).toHaveLength(0);
      expect(print).not.toHaveBeenCalled();
    });

    it("URL をコピーすると、ボタンとその下の両方で、コピーできたことが分かる", async () => {
      Object.defineProperty(window.navigator, "standalone", { value: true, configurable: true });
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(window.navigator, "clipboard", { value: { writeText }, configurable: true });
      render(<PrintControl options={OPTIONS} initial={["housing"]} shortcut={["summary"]} renderDocument={(items) => <Document items={items} />} />);
      fireEvent.click(screen.getByRole("button", { name: "印刷する" }));
      const sheet = within(screen.getByRole("dialog"));
      await act(async () => {
        fireEvent.click(sheet.getByRole("button", { name: "この画面の URL をコピーする" }));
      });
      expect(writeText).toHaveBeenCalledWith(window.location.href);
      expect(sheet.getByRole("button", { name: /コピーしました/ })).toBeInTheDocument();
      expect(sheet.getByRole("status")).toHaveTextContent("URL をコピーしましたSafari のアドレス欄に貼りつけて開いてください。");
    });

    it("コピーできなかったときは、長押しでコピーできるよう URL をそのまま出す", async () => {
      Object.defineProperty(window.navigator, "standalone", { value: true, configurable: true });
      Object.defineProperty(window.navigator, "clipboard", { value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) }, configurable: true });
      render(<PrintControl options={OPTIONS} initial={["housing"]} shortcut={["summary"]} renderDocument={(items) => <Document items={items} />} />);
      fireEvent.click(screen.getByRole("button", { name: "印刷する" }));
      const sheet = within(screen.getByRole("dialog"));
      await act(async () => {
        fireEvent.click(sheet.getByRole("button", { name: "この画面の URL をコピーする" }));
      });
      expect(sheet.getByRole("status")).toHaveTextContent("コピーできませんでした。");
      expect(sheet.getByRole("status")).toHaveTextContent(window.location.href);
    });

    it("目印がない（Android・PC・Safari のブラウザ）ときは、ふだんの印刷の窓を出す", () => {
      const sheet = open(["housing"]);
      expect(sheet.getAllByRole("checkbox")).toHaveLength(3);
    });
  });
});
