import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APRON_COLOR_STORAGE_KEY } from "@/lib/mascot/useApronColor";
import { recolorApron } from "@/lib/mascot/recolor";
import { Mascot, MascotCompanion, MascotFigure, paletteSideFor } from "./Mascot";

// 服の色を替えたかを確かめるため、色替えの計算だけを記録に替える（絵の作り方は本物のまま）
vi.mock("@/lib/mascot/recolor", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/mascot/recolor")>()),
  recolorApron: vi.fn(),
}));

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

// jsdom には URL.createObjectURL がないので、色を替えた絵の URL を決まった文字にする
class RecoloredUrl extends URL {
  static override createObjectURL = () => "blob:recolored";
  static override revokeObjectURL = () => {};
}

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
    return screen.getByRole("button", { name: /ぽてり/ });
  }

  it("押すと服の色のパレットを出し、選んだ色を端末に残す", async () => {
    const mascot = await renderMascot();
    expect(mascot.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(mascot);
    expect(screen.getByRole("dialog", { name: "ぽてりの服の色" })).toBeTruthy();
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
    expect(screen.queryByRole("button", { name: /ぽてり/ })).toBeNull();
  });
});

describe("MascotCompanion（043。一人のときに「わが家」に並ぶぽてり）", () => {
  beforeEach(() => {
    vi.stubGlobal("Image", LoadedImage);
    localStorage.clear();
    vi.mocked(recolorApron).mockClear();
    // jsdom には canvas がないので、色を替える道具だけを用意する
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: () => {},
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
      putImageData: () => {},
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => callback(new Blob()));
    vi.stubGlobal("URL", RecoloredUrl);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const colorsUsed = () => vi.mocked(recolorApron).mock.calls.map(([, color]) => color);

  it("押せない（ボタンもパレットもない）。まばたきの絵を出す", async () => {
    await act(async () => {
      render(<MascotCompanion motion="single-blink-summer" className="h-16" />);
    });
    const companion = screen.getByTestId("single-mascot");
    expect(screen.queryByRole("button")).toBeNull();
    expect(companion.querySelector("span")?.className).toContain("animate-mascot-blink");
    expect(companion.querySelector("span")?.style.backgroundImage).toContain("/mascot/single-blink-summer.webp");
  });

  it("ほかの場所で選んだ服の色で出す", async () => {
    localStorage.setItem(APRON_COLOR_STORAGE_KEY, "navy");
    await act(async () => {
      render(<MascotCompanion motion="single-blink-summer" className="h-16" />);
    });
    expect(colorsUsed()).toEqual(["navy"]);
    expect(screen.getByTestId("single-mascot").querySelector("span")?.style.backgroundImage).toContain("blob:recolored");
  });

  it("同じ画面のほかのぽてりで色を変えると、すぐその色になる", async () => {
    await act(async () => {
      render(
        <>
          <MascotFigure motion="kamisato-sweep-summer" className="relative h-9" />
          <MascotCompanion motion="single-blink-summer" className="h-16" />
        </>,
      );
    });
    fireEvent.click(screen.getByRole("button", { name: /ぽてり/ }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "赤" }));
    });
    // 地区のしぐさのぽてりと、並ぶぽてりの両方が赤に替わる
    expect(colorsUsed().filter((color) => color === "red")).toHaveLength(2);
  });
});

describe("paletteSideFor（042）", () => {
  it("パレットは絵の中央の側に開く（左寄りなら右、右寄りなら左）", () => {
    expect(paletteSideFor(11.6, 10.5)).toBe("right");
    expect(paletteSideFor(84.5, 78.5)).toBe("left");
  });
});
