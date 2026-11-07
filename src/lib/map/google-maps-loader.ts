// Google マップ（Maps JavaScript API）の読み込み（032）。地図の画面を開いたときに1回だけ読み込む。
// キーは画面に出る値で、Google Cloud で使えるサイトと API を制限している（.env.example）。
// 立体（3D Maps）は 2026-11 時点で beta の版でだけ使えるので、平面も同じ版で読む（1ページで版を混ぜられない）
const SCRIPT_URL = "https://maps.googleapis.com/maps/api/js";
const VERSION = "beta";
const CALLBACK = "__dearLifeGoogleMapsReady";
// 回線が遅くても待ちすぎないように。超えたら「表示できませんでした」を出し、一覧で見られるようにする
const LOAD_TIMEOUT_MS = 20000;

export type GoogleMapsFailure = "missing-config" | "network" | "timeout" | "auth";

export class GoogleMapsUnavailableError extends Error {
  constructor(readonly reason: GoogleMapsFailure) {
    super(`Google マップを読み込めませんでした（${reason}）`);
    this.name = "GoogleMapsUnavailableError";
  }
}

export type GoogleMapsConfig = { apiKey: string; mapId: string };

export function googleMapsConfig(): GoogleMapsConfig | null {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;
  return apiKey && mapId ? { apiKey, mapId } : null;
}

type GoogleMapsWindow = Window & {
  [CALLBACK]?: () => void;
  // キーが使えない（制限・請求先・上限）ときに Google が呼ぶ
  gm_authFailure?: () => void;
};

let loading: Promise<void> | null = null;
let authFailed = false;
const authListeners = new Set<() => void>();

export function googleMapsScriptUrl(apiKey: string): string {
  const params = new URLSearchParams({ key: apiKey, v: VERSION, language: "ja", region: "JP", loading: "async", callback: CALLBACK });
  return `${SCRIPT_URL}?${params}`;
}

// 読み込みの途中で失敗したら、次に地図を開いたときにやり直せるように覚えたものを捨てる
export function loadGoogleMaps(apiKey: string): Promise<void> {
  if (loading) return loading;
  const target = window as GoogleMapsWindow;
  loading = new Promise<void>((resolve, reject) => {
    const fail = (reason: GoogleMapsFailure) => {
      window.clearTimeout(timer);
      loading = null;
      script.remove();
      reject(new GoogleMapsUnavailableError(reason));
    };
    const timer = window.setTimeout(() => fail("timeout"), LOAD_TIMEOUT_MS);
    target[CALLBACK] = () => {
      window.clearTimeout(timer);
      resolve();
    };
    target.gm_authFailure = () => {
      authFailed = true;
      for (const listener of authListeners) listener();
    };
    const script = document.createElement("script");
    script.src = googleMapsScriptUrl(apiKey);
    script.async = true;
    script.onerror = () => fail("network");
    document.head.append(script);
  });
  return loading;
}

// キーが使えなかったことを知らせる。読み込みのあとに地図を作ろうとして分かるので、読み込みとは別に受け取る
export function onGoogleMapsAuthFailure(listener: () => void): () => void {
  if (authFailed) listener();
  authListeners.add(listener);
  return () => authListeners.delete(listener);
}

// テスト用。読み込みの状態を最初に戻す
export function resetGoogleMapsLoaderForTest(): void {
  loading = null;
  authFailed = false;
  authListeners.clear();
}
