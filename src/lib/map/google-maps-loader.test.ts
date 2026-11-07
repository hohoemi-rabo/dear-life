import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GoogleMapsUnavailableError,
  googleMapsConfig,
  googleMapsScriptUrl,
  loadGoogleMaps,
  onGoogleMapsAuthFailure,
  resetGoogleMapsLoaderForTest,
} from "./google-maps-loader";

type LoaderWindow = Window & { __dearLifeGoogleMapsReady?: () => void; gm_authFailure?: () => void };
const loaderWindow = window as LoaderWindow;
const scripts = () => [...document.head.querySelectorAll<HTMLScriptElement>('script[src^="https://maps.googleapis.com/"]')];

beforeEach(() => {
  resetGoogleMapsLoaderForTest();
});

afterEach(() => {
  for (const script of scripts()) script.remove();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("Google マップの読み込み（032）", () => {
  it("キーと Map ID の両方がそろっていなければ、設定なしとして扱う", () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "key");
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID", "");
    expect(googleMapsConfig()).toBeNull();
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID", "map");
    expect(googleMapsConfig()).toEqual({ apiKey: "key", mapId: "map" });
  });

  it("立体の使える beta の版を、日本語・日本向けで読む", () => {
    const url = new URL(googleMapsScriptUrl("abc"));
    expect(url.searchParams.get("key")).toBe("abc");
    expect(url.searchParams.get("v")).toBe("beta");
    expect(url.searchParams.get("language")).toBe("ja");
    expect(url.searchParams.get("region")).toBe("JP");
  });

  it("何度呼んでも読み込むのは1回だけで、Google の合図で読み込み済みになる", async () => {
    const first = loadGoogleMaps("abc");
    const second = loadGoogleMaps("abc");
    expect(second).toBe(first);
    expect(scripts()).toHaveLength(1);
    loaderWindow.__dearLifeGoogleMapsReady?.();
    await expect(first).resolves.toBeUndefined();
  });

  it("読み込めなければ失敗を返し、次はやり直せる", async () => {
    const failed = loadGoogleMaps("abc");
    scripts()[0].dispatchEvent(new Event("error"));
    await expect(failed).rejects.toMatchObject({ reason: "network" });
    expect(scripts()).toHaveLength(0);
    void loadGoogleMaps("abc");
    expect(scripts()).toHaveLength(1);
  });

  it("待ちすぎたら打ち切る", async () => {
    vi.useFakeTimers();
    const slow = loadGoogleMaps("abc");
    vi.advanceTimersByTime(20000);
    await expect(slow).rejects.toBeInstanceOf(GoogleMapsUnavailableError);
  });

  it("キーが使えないと Google が知らせたら、地図の側に伝える（あとから聞いても伝わる）", () => {
    void loadGoogleMaps("abc");
    const before = vi.fn();
    onGoogleMapsAuthFailure(before);
    loaderWindow.gm_authFailure?.();
    expect(before).toHaveBeenCalledOnce();
    const after = vi.fn();
    onGoogleMapsAuthFailure(after);
    expect(after).toHaveBeenCalledOnce();
  });
});
