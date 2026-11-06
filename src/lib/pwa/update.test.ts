import { describe, expect, it, vi } from "vitest";
import { checkForUpdateOnReturn, createUpdateWatcher, SKIP_WAITING_MESSAGE } from "./update";

// 偽の Service Worker（入れている途中の版・待っている版）
function fakeWorker(state: ServiceWorkerState = "installing") {
  const target = new EventTarget();
  return Object.assign(target, {
    state,
    postMessage: vi.fn(),
    install() {
      this.state = "installed";
      target.dispatchEvent(new Event("statechange"));
    },
  });
}

function setup({ controlled = true, waiting = null as ReturnType<typeof fakeWorker> | null } = {}) {
  const container = Object.assign(new EventTarget(), { controller: (controlled ? {} : null) as ServiceWorker | null });
  const registration = Object.assign(new EventTarget(), { waiting, installing: null as ReturnType<typeof fakeWorker> | null });
  const reload = vi.fn();
  const watcher = createUpdateWatcher({ container, reload });
  const listener = vi.fn();
  watcher.subscribe(listener);
  watcher.watch(registration as unknown as ServiceWorkerRegistration);
  const arrive = () => {
    const worker = fakeWorker();
    registration.installing = worker;
    registration.dispatchEvent(new Event("updatefound"));
    worker.install();
    return worker;
  };
  return { container, watcher, reload, listener, arrive };
}

describe("createUpdateWatcher", () => {
  it("開いているあいだに新しい版が入り終えたら知らせる", () => {
    const { watcher, listener, arrive } = setup();
    expect(watcher.pending()).toBe(false);
    arrive();
    expect(watcher.pending()).toBe(true);
    expect(listener).toHaveBeenCalled();
  });

  it("開いたときにもう待っている版があれば、すぐ知らせる", () => {
    const { watcher } = setup({ waiting: fakeWorker("installed") });
    expect(watcher.pending()).toBe(true);
  });

  it("はじめて入れたとき（古い版がない）は知らせず、受け持っても読み直さない", () => {
    const { watcher, container, reload, arrive } = setup({ controlled: false });
    arrive();
    expect(watcher.pending()).toBe(false);
    container.controller = {} as ServiceWorker;
    container.dispatchEvent(new Event("controllerchange"));
    expect(reload).not.toHaveBeenCalled();
  });

  it("はじめての版のまま開き続けていても、次の版が届いたら知らせ、更新したら読み直す", () => {
    const { watcher, container, reload, arrive } = setup({ controlled: false });
    arrive();
    container.controller = {} as ServiceWorker;
    container.dispatchEvent(new Event("controllerchange"));
    arrive();
    expect(watcher.pending()).toBe(true);
    watcher.apply();
    container.dispatchEvent(new Event("controllerchange"));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("「更新する」で待っている版に入れ替えを頼み、受け持ったら1回だけ読み直す", () => {
    const { watcher, container, reload, arrive } = setup();
    const worker = arrive();
    watcher.apply();
    expect(worker.postMessage).toHaveBeenCalledWith(SKIP_WAITING_MESSAGE);
    container.dispatchEvent(new Event("controllerchange"));
    container.dispatchEvent(new Event("controllerchange"));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("「あとで」を押した版は出さず、もっと新しい版が届いたらまた出す", () => {
    const { watcher, arrive } = setup();
    arrive();
    watcher.dismiss();
    expect(watcher.pending()).toBe(false);
    arrive();
    expect(watcher.pending()).toBe(true);
  });
});

describe("checkForUpdateOnReturn", () => {
  it("アプリに戻ってきたときだけ新しい版を確かめ、確かめられなくても止まらない", async () => {
    const update = vi.fn(() => Promise.reject(new TypeError("Failed to fetch")));
    let visibility: DocumentVisibilityState = "hidden";
    vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility);
    const stop = checkForUpdateOnReturn({ update } as unknown as ServiceWorkerRegistration);

    document.dispatchEvent(new Event("visibilitychange"));
    expect(update).not.toHaveBeenCalled();
    visibility = "visible";
    document.dispatchEvent(new Event("visibilitychange"));
    expect(update).toHaveBeenCalledTimes(1);

    stop();
    document.dispatchEvent(new Event("visibilitychange"));
    expect(update).toHaveBeenCalledTimes(1);
    vi.restoreAllMocks();
  });
});
