import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createUpdateWatcher, type UpdateWatcher } from "@/lib/pwa/update";

let watcher: UpdateWatcher;
vi.mock("@/lib/pwa/update", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/pwa/update")>()),
  serviceWorkerUpdate: () => watcher,
}));

const { UpdatePrompt } = await import("./UpdatePrompt");

// 古い版が受け持っている画面に、新しい版が待っている状態を作る
function waitingVersion() {
  const container = Object.assign(new EventTarget(), { controller: {} as ServiceWorker });
  const reload = vi.fn();
  watcher = createUpdateWatcher({ container, reload });
  const worker = { postMessage: vi.fn() };
  const registration = Object.assign(new EventTarget(), { waiting: null as typeof worker | null, installing: null });
  render(<UpdatePrompt />);
  act(() => {
    registration.waiting = worker;
    watcher.watch(registration as unknown as ServiceWorkerRegistration);
  });
  return { worker, container, reload };
}

afterEach(() => vi.restoreAllMocks());

describe("UpdatePrompt", () => {
  it("新しい版がなければ何も出さない", () => {
    watcher = createUpdateWatcher({ container: Object.assign(new EventTarget(), { controller: null }), reload: vi.fn() });
    const { container } = render(<UpdatePrompt />);
    expect(container).toBeEmptyDOMElement();
  });

  it("新しい版が届いたらお知らせを出し、「更新する」で入れ替えて読み直す", () => {
    const { worker, container, reload } = waitingVersion();
    expect(screen.getByRole("heading", { name: "新しい版があります" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "更新する" }));
    expect(worker.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
    container.dispatchEvent(new Event("controllerchange"));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("「あとで」はなく、画面全体を覆って後ろの画面を使えなくする（2026-11-18 まさゆきさん）", () => {
    const page = document.createElement("main");
    page.append(Object.assign(document.createElement("button"), { textContent: "後ろのボタン" }));
    document.body.prepend(page);
    waitingVersion();
    expect(screen.queryByRole("button", { name: "あとで" })).not.toBeInTheDocument();
    const dialog = screen.getByRole("alertdialog", { name: "新しい版があります" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(page.inert).toBe(true);
    expect(screen.getByRole("button", { name: "更新する" })).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    page.remove();
  });

  it("待たせているあいだ（お問い合わせを書いているあいだ）は出さず、やめたら出す", () => {
    watcher = createUpdateWatcher({ container: Object.assign(new EventTarget(), { controller: {} as ServiceWorker }), reload: vi.fn() });
    const release = watcher.hold();
    render(<UpdatePrompt />);
    act(() => {
      const registration = Object.assign(new EventTarget(), { waiting: { postMessage: vi.fn() }, installing: null });
      watcher.watch(registration as unknown as ServiceWorkerRegistration);
    });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    act(() => release());
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });
});
