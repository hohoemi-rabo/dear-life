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
    // 開いただけでは印刷用の中身を作らない
    expect(printed()).toBeNull();
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
});
