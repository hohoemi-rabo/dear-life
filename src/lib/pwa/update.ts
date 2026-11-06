// 新しい版の画面が届いたことを知らせ、押されたら入れ替える（030）。
// Service Worker は新しい版を入れ終えても、画面がすべて閉じられるまで待つ（skipWaiting しない。024）。
// スマホ、特にホーム画面から開いたアプリは閉じられないことが多く、古い版が残り続けるので、待っている版があれば
// 「更新する」を出し、押されたときだけ入れ替えて読み直す。勝手には入れ替えない（開いている画面の部品と混ざらないように）

// service-worker.js の message の受け口と同じ値
export const SKIP_WAITING_MESSAGE = { type: "SKIP_WAITING" } as const;

type WaitingWorker = Pick<ServiceWorker, "postMessage">;

type UpdateDeps = {
  container: Pick<ServiceWorkerContainer, "controller" | "addEventListener">;
  reload: () => void;
};

export type UpdateWatcher = ReturnType<typeof createUpdateWatcher>;

export function createUpdateWatcher({ container, reload }: UpdateDeps) {
  let waiting: WaitingWorker | null = null;
  let dismissed: WaitingWorker | null = null;
  let reloading = false;
  const listeners = new Set<() => void>();

  function setWaiting(worker: WaitingWorker | null): void {
    if (worker === waiting) return;
    waiting = worker;
    for (const listener of listeners) listener();
  }

  return {
    // 登録できたら呼ぶ。もう待っている版があればすぐ知らせ、あとで届いた版も知らせる
    watch(registration: ServiceWorkerRegistration): void {
      // はじめて入れたとき（まだ受け持たれていない画面）は、入れ替える古い版がないので知らせない。
      // はじめての版が受け持ったあとも、開いたままなら次の版は知らせる
      let controlled = container.controller !== null;
      if (controlled && registration.waiting) setWaiting(registration.waiting);
      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" && container.controller !== null) setWaiting(installing);
        });
      });
      // 新しい版が受け持ったら読み直す。別のタブで「更新する」が押されたときも、古い版の部品は消されるので読み直す。
      // はじめての版が受け持ったときは、古い部品がないので読み直さない
      container.addEventListener("controllerchange", () => {
        if (!controlled) {
          controlled = true;
          return;
        }
        if (reloading) return;
        reloading = true;
        reload();
      });
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    // 「あとで」を押した版は出さない（もっと新しい版が届いたら、また出す）
    pending(): boolean {
      return waiting !== null && waiting !== dismissed;
    },
    apply(): void {
      waiting?.postMessage(SKIP_WAITING_MESSAGE);
    },
    dismiss(): void {
      dismissed = waiting;
      for (const listener of listeners) listener();
    },
  };
}

let shared: UpdateWatcher | null = null;

// 画面全体で1つだけ使う（登録する側と、お知らせを出す側で同じものを見る）
export function serviceWorkerUpdate(): UpdateWatcher | null {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  shared ??= createUpdateWatcher({ container: navigator.serviceWorker, reload: () => window.location.reload() });
  return shared;
}

// アプリに戻ってきたときに新しい版がないか確かめる。ブラウザは画面を移ったときにしか確かめないので、
// 1つの画面を開いたまま裏に置いておくスマホでは、いつまでも気づかない
export function checkForUpdateOnReturn(registration: Pick<ServiceWorkerRegistration, "update">, doc: Document = document): () => void {
  const onVisible = () => {
    if (doc.visibilityState !== "visible") return;
    // 圏外などで確かめられなくても、今の版でそのまま使える
    registration.update().catch(() => undefined);
  };
  doc.addEventListener("visibilitychange", onVisible);
  return () => doc.removeEventListener("visibilitychange", onVisible);
}
