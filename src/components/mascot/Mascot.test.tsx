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

  it("押すと服の色のパレットを出し、選んだ色を端末に残して、パレットを閉じる", async () => {
    const mascot = await renderMascot();
    expect(mascot.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(mascot);
    expect(screen.getByRole("dialog", { name: "ぽてりの服の色" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "青緑" }).getAttribute("aria-pressed")).toBe("true");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "赤" }));
    });
    expect(localStorage.getItem(APRON_COLOR_STORAGE_KEY)).toBe("red");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(mascot);
    // もう一度開くと、選んだ色に印が付いている
    fireEvent.click(mascot);
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

describe("Mascot をさわって動かす（046）", () => {
  beforeEach(() => {
    vi.stubGlobal("Image", LoadedImage);
    localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  // 絵は 400×300px、ぽてりは 20×30px で、足元は絵の (200, 150)（＝50%, 50%）
  function layOut(mascot: HTMLElement) {
    const root = mascot.parentElement!;
    const frame = root.parentElement!;
    const rect = (left: number, top: number, width: number, height: number) =>
      ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) }) as DOMRect;
    vi.spyOn(frame, "getBoundingClientRect").mockReturnValue(rect(0, 0, 400, 300));
    vi.spyOn(root, "getBoundingClientRect").mockReturnValue(rect(190, 120, 20, 30));
    return root;
  }

  async function renderInFrame(motion: "kamisato-sweep-summer" | "kamisato-sweep-autumn" = "kamisato-sweep-summer") {
    let rerender!: (ui: React.ReactElement) => void;
    await act(async () => {
      ({ rerender } = render(
        <figure>
          <Mascot motion={motion} wide={spot} tall={spot} />
        </figure>,
      ));
    });
    const mascot = screen.getByRole("button", { name: /ぽてり/ });
    return { mascot, root: layOut(mascot), rerender };
  }

  const mouse = { pointerId: 1, pointerType: "mouse", isPrimary: true, button: 0 };
  const finger = { pointerId: 2, pointerType: "touch", isPrimary: true, button: 0 };
  const spotOf = (root: HTMLElement) => [root.style.getPropertyValue("--mascot-x"), root.style.getPropertyValue("--mascot-y")];

  it("PC：ドラッグで動かし、離してもパレットは開かない", async () => {
    const { mascot, root } = await renderInFrame();
    fireEvent.pointerDown(mascot, { ...mouse, clientX: 200, clientY: 150 });
    fireEvent.pointerMove(mascot, { ...mouse, clientX: 240, clientY: 180 });
    expect(screen.getByTestId("mascot-body").dataset.lifted).toBe("true");
    fireEvent.pointerUp(mascot, { ...mouse, clientX: 240, clientY: 180 });
    fireEvent.click(mascot);
    expect(spotOf(root)).toEqual(["60%", "60%"]);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByTestId("mascot-body").dataset.lifted).toBeUndefined();
    // 次にさっと押したときは、今までどおりパレットを開く
    fireEvent.pointerDown(mascot, { ...mouse, clientX: 240, clientY: 180 });
    fireEvent.pointerUp(mascot, { ...mouse, clientX: 241, clientY: 180 });
    fireEvent.click(mascot);
    expect(screen.getByRole("dialog", { name: "ぽてりの服の色" })).toBeTruthy();
  });

  it("絵の外には出さない", async () => {
    const { mascot, root } = await renderInFrame();
    fireEvent.pointerDown(mascot, { ...mouse, clientX: 200, clientY: 150 });
    fireEvent.pointerMove(mascot, { ...mouse, clientX: -500, clientY: -500 });
    // 左は体の半分（10px＝2.5%）、上は体の高さ（30px＝10%）だけ内側
    expect(spotOf(root)).toEqual(["2.5%", "10%"]);
    fireEvent.pointerMove(mascot, { ...mouse, clientX: 1000, clientY: 1000 });
    expect(spotOf(root)).toEqual(["97.5%", "100%"]);
  });

  it("絵に重ねた見出しの下にはもぐらせない", async () => {
    const cover = document.createElement("div");
    cover.setAttribute("data-mascot-cover", "");
    document.body.append(cover);
    vi.spyOn(cover, "getBoundingClientRect").mockReturnValue({ bottom: 60 } as DOMRect);
    try {
      const { mascot, root } = await renderInFrame();
      fireEvent.pointerDown(mascot, { ...mouse, clientX: 200, clientY: 150 });
      fireEvent.pointerMove(mascot, { ...mouse, clientX: 200, clientY: -500 });
      // 見出しの下端（60px）＋体の高さ（30px）＝ 90px（30%）
      expect(spotOf(root)).toEqual(["50%", "30%"]);
    } finally {
      cover.remove();
    }
  });

  it("スマホ：押しっぱなしで持ち上げてから動かす。パレットが開いていたら閉じる", async () => {
    vi.useFakeTimers();
    const { mascot, root } = await renderInFrame();
    fireEvent.click(mascot);
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.pointerDown(mascot, { ...finger, clientX: 200, clientY: 150 });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.getByTestId("mascot-body").dataset.lifted).toBe("true");
    expect(screen.queryByRole("dialog")).toBeNull();
    // 持ち上げている間は、指を動かしてもページをスクロールさせない
    const touchMove = new Event("touchmove", { cancelable: true });
    mascot.dispatchEvent(touchMove);
    expect(touchMove.defaultPrevented).toBe(true);
    fireEvent.pointerMove(mascot, { ...finger, clientX: 160, clientY: 120 });
    fireEvent.pointerUp(mascot, { ...finger, clientX: 160, clientY: 120 });
    fireEvent.click(mascot);
    expect(spotOf(root)).toEqual(["40%", "40%"]);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("スマホ：さっと押して離したときはパレットを開く", async () => {
    vi.useFakeTimers();
    const { mascot, root } = await renderInFrame();
    fireEvent.pointerDown(mascot, { ...finger, clientX: 200, clientY: 150 });
    act(() => {
      vi.advanceTimersByTime(150);
    });
    fireEvent.pointerUp(mascot, { ...finger, clientX: 200, clientY: 150 });
    fireEvent.click(mascot);
    expect(screen.getByRole("dialog", { name: "ぽてりの服の色" })).toBeTruthy();
    expect(spotOf(root)).toEqual(["50%", "50%"]);
  });

  it("スマホ：持ち上げる前に指が動いたらスクロールに任せ、ぽてりは動かさない", async () => {
    vi.useFakeTimers();
    const { mascot, root } = await renderInFrame();
    fireEvent.pointerDown(mascot, { ...finger, clientX: 200, clientY: 150 });
    fireEvent.pointerMove(mascot, { ...finger, clientX: 200, clientY: 100 });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.getByTestId("mascot-body").dataset.lifted).toBeUndefined();
    const touchMove = new Event("touchmove", { cancelable: true });
    mascot.dispatchEvent(touchMove);
    expect(touchMove.defaultPrevented).toBe(false);
    fireEvent.pointerMove(mascot, { ...finger, clientX: 200, clientY: 50 });
    expect(spotOf(root)).toEqual(["50%", "50%"]);
  });

  it("季節（動き）を切りかえると、元の場所に戻る", async () => {
    const { mascot, root, rerender } = await renderInFrame();
    fireEvent.pointerDown(mascot, { ...mouse, clientX: 200, clientY: 150 });
    fireEvent.pointerMove(mascot, { ...mouse, clientX: 240, clientY: 180 });
    fireEvent.pointerUp(mascot, { ...mouse, clientX: 240, clientY: 180 });
    expect(spotOf(root)).toEqual(["60%", "60%"]);
    await act(async () => {
      rerender(
        <figure>
          <Mascot motion="kamisato-sweep-autumn" wide={spot} tall={spot} />
        </figure>,
      );
    });
    const after = screen.getByRole("button", { name: /ぽてり/ }).parentElement!;
    expect(spotOf(after)).toEqual(["50%", "50%"]);
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
