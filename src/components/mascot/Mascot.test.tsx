import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APRON_COLOR_STORAGE_KEY } from "@/lib/mascot/useApronColor";
import { Mascot, paletteSideFor } from "./Mascot";

// jsdom は画像を読まないので、読み終えたことにする（canvas も使えないので、絵は元の色のまま使われる）
class LoadedImage {
  decoding = "";
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 10;
  naturalHeight = 10;
  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

const spot = { x: 50, y: 50, height: 6 };

describe("Mascot（042）", () => {
  beforeEach(() => {
    vi.stubGlobal("Image", LoadedImage);
    localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function renderMascot() {
    await act(async () => {
      render(<Mascot motion="kamisato-sweep-summer" wide={spot} tall={spot} />);
    });
    return screen.getByRole("button", { name: /マスコット/ });
  }

  it("押すと服の色のパレットを出し、選んだ色を端末に残す", async () => {
    const mascot = await renderMascot();
    expect(mascot.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(mascot);
    expect(screen.getByRole("dialog", { name: "服の色" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "青緑" }).getAttribute("aria-pressed")).toBe("true");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "赤" }));
    });
    expect(localStorage.getItem(APRON_COLOR_STORAGE_KEY)).toBe("red");
    expect(screen.getByRole("button", { name: "赤" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("前に選んだ色で出す（くらしで替えた色が、ほかの画面でも同じになる）", async () => {
    localStorage.setItem(APRON_COLOR_STORAGE_KEY, "navy");
    fireEvent.click(await renderMascot());
    expect(screen.getByRole("button", { name: "紺" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("Esc でパレットを閉じ、マスコットに戻る", async () => {
    const mascot = await renderMascot();
    fireEvent.click(mascot);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(mascot);
  });

  it("絵を読めないときは出さない", async () => {
    class FailedImage extends LoadedImage {
      override set src(_value: string) {
        queueMicrotask(() => this.onerror?.());
      }
    }
    vi.stubGlobal("Image", FailedImage);
    await act(async () => {
      render(<Mascot motion="kamisato-sweep-summer" wide={spot} tall={spot} />);
    });
    expect(screen.queryByRole("button", { name: /マスコット/ })).toBeNull();
  });
});

describe("paletteSideFor（042）", () => {
  it("パレットは絵の中央の側に開く（左寄りなら右、右寄りなら左）", () => {
    expect(paletteSideFor(11.6, 10.5)).toBe("right");
    expect(paletteSideFor(84.5, 78.5)).toBe("left");
  });
});
