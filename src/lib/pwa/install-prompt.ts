// ホーム画面への追加の案内（024・要件 8.2）。Android（Chrome）は beforeinstallprompt を取っておき、自分のボタンから出す。
// iPhone はこのイベントがないので、共有メニューからの手順を出す
type BeforeInstallPromptEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type InstallState = "installed" | "prompt" | "ios" | "none";

let deferred: BeforeInstallPromptEvent | null = null;
let listening = false;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

// 何度呼んでも1回だけ聞く。ブラウザは条件がそろうとすぐに出すので、画面が動き出したらすぐ呼ぶ（RegisterServiceWorker）
export function listenForInstallPrompt(target: Window = window): void {
  if (listening) return;
  listening = true;
  target.addEventListener("beforeinstallprompt", (event) => {
    // ブラウザが自分で出す小さな案内を止め、こちらのボタンだけにする
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    notify();
  });
  target.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}

export function subscribeInstallState(listener: () => void): () => void {
  listenForInstallPrompt();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ホーム画面から開いているとき（display: standalone）は案内しない。iPhone の Safari は navigator.standalone で分かる
export function installState(win: Window = window): InstallState {
  const standalone = win.matchMedia?.("(display-mode: standalone)").matches || (win.navigator as { standalone?: boolean }).standalone === true;
  if (standalone) return "installed";
  if (deferred) return "prompt";
  return isIos(win.navigator.userAgent, win.navigator.maxTouchPoints) ? "ios" : "none";
}

// iPad の Safari は Mac と同じ userAgent を名のるので、タッチできるかで見分ける
export function isIos(userAgent: string, maxTouchPoints: number): boolean {
  return /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
}

// 追加の確認を出す。1つのイベントで1回しか出せないので、出したら捨てる
export async function promptInstall(): Promise<boolean> {
  const event = deferred;
  if (!event) return false;
  deferred = null;
  notify();
  await event.prompt();
  return (await event.userChoice).outcome === "accepted";
}
