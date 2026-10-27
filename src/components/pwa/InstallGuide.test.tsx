import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isIos } from "@/lib/pwa/install-prompt";
import { InstallGuide } from "./InstallGuide";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const ANDROID = "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";

function setDevice(userAgent: string, standalone = false) {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(userAgent);
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: standalone && query === "(display-mode: standalone)" }));
}

// Chrome が出す beforeinstallprompt の代わり
function fireInstallPrompt(outcome: "accepted" | "dismissed" = "accepted") {
  const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
    prompt: vi.fn(() => Promise.resolve()),
    userChoice: Promise.resolve({ outcome }),
  });
  act(() => {
    window.dispatchEvent(event);
  });
  return event;
}

beforeEach(() => {
  setDevice(ANDROID);
});

afterEach(() => {
  // 取っておいた追加の確認を捨てる（次のテストに持ち越さない）
  act(() => {
    window.dispatchEvent(new Event("appinstalled"));
  });
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("InstallGuide", () => {
  it("Android は、ブラウザが追加できると知らせたら追加ボタンを出し、押すと確認を出す", async () => {
    render(<InstallGuide />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    const event = fireInstallPrompt();
    expect(event.defaultPrevented).toBe(true);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "ホーム画面に追加する" })));
    expect(event.prompt).toHaveBeenCalledOnce();
    // 確認は1回しか出せないので、出したらボタンを消す
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("iPhone は共有メニューからの手順を出す", () => {
    setDevice(IPHONE);
    render(<InstallGuide />);
    expect(screen.getByText(/共有ボタン/)).toHaveTextContent("「ホーム画面に追加」を選んでください");
  });

  it("ホーム画面から開いているときは何も出さない", () => {
    setDevice(IPHONE, true);
    const { container } = render(<InstallGuide />);
    expect(container).toBeEmptyDOMElement();
  });

  it("追加できないブラウザ（パソコンなど）では何も出さない", () => {
    const { container } = render(<InstallGuide />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("isIos", () => {
  it("iPad の Safari（Mac を名のる）もタッチできれば iPhone と同じに扱う", () => {
    const mac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
    expect(isIos(mac, 5)).toBe(true);
    expect(isIos(mac, 0)).toBe(false);
    expect(isIos(IPHONE, 5)).toBe(true);
  });
});
