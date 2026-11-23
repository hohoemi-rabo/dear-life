import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isPlayable, PHOTO_SPOT_TIMING, PHOTO_SPOTS } from "@/lib/illust/photo-spots";
import { PhotoSpotLayer } from "./PhotoSpotLayer";

const MARKER = "上郷の神社の石段：絵が本物の写真に変わる動画を見る";
const DIALOG = "上郷の神社の石段：絵が本物の写真に変わる動画";
const PREPARING = "鼎の通り沿いの店：絵が本物の写真に変わる動画（準備中）";

let play: ReturnType<typeof vi.fn<() => Promise<void>>>;

beforeEach(() => {
  vi.useFakeTimers();
  // jsdom は動画を流せないので、流し始めと止めるところだけまねる
  play = vi.fn<() => Promise<void>>(() => Promise.resolve());
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(play);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const openPlayer = () => {
  fireEvent.click(screen.getByRole("button", { name: MARKER }));
  return screen.getByRole("dialog", { name: DIALOG });
};

const video = (dialog: HTMLElement) => dialog.querySelector("video") as HTMLVideoElement;

describe("PhotoSpotLayer：絵が写真に変わる動画（050）", () => {
  it("絵の上に、押せる場所の目印を出す", () => {
    render(<PhotoSpotLayer />);
    expect(screen.getAllByRole("button")).toHaveLength(PHOTO_SPOTS.length);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("目印を押すと窓が開き、ドット絵がふわっと出てから動画を流す", async () => {
    render(<PhotoSpotLayer />);
    const dialog = openPlayer();
    expect(video(dialog)).toHaveAttribute("poster", "/video/kamisato-ishidan-poster.webp");
    expect(video(dialog).muted).toBe(true);
    expect(play).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(PHOTO_SPOT_TIMING.introMs);
    });
    expect(play).toHaveBeenCalledTimes(1);
  });

  it("動画が終わったら、すぐではなく、ひと呼吸おいてから閉じる", async () => {
    render(<PhotoSpotLayer />);
    const dialog = openPlayer();
    await act(async () => {
      vi.advanceTimersByTime(PHOTO_SPOT_TIMING.introMs);
    });
    fireEvent.ended(video(dialog));
    await act(async () => {
      vi.advanceTimersByTime(PHOTO_SPOT_TIMING.holdMs - 1);
    });
    expect(screen.getByRole("dialog", { name: DIALOG })).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(1 + PHOTO_SPOT_TIMING.closeMs);
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("動画の途中でも、窓を押せば閉じる", async () => {
    render(<PhotoSpotLayer />);
    const dialog = openPlayer();
    await act(async () => {
      vi.advanceTimersByTime(PHOTO_SPOT_TIMING.introMs);
    });
    fireEvent.click(video(dialog));
    await act(async () => {
      vi.advanceTimersByTime(PHOTO_SPOT_TIMING.closeMs);
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("ふわっと出ているあいだに閉じたら、動画は流さない", async () => {
    render(<PhotoSpotLayer />);
    const dialog = openPlayer();
    fireEvent.click(dialog);
    await act(async () => {
      vi.advanceTimersByTime(PHOTO_SPOT_TIMING.introMs);
    });
    expect(play).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("動画を読み込めなかったら、絵のまま断りを出し、自動では閉じない", async () => {
    render(<PhotoSpotLayer />);
    const dialog = openPlayer();
    fireEvent.error(video(dialog));
    expect(dialog).toHaveTextContent("動画を読み込めませんでした");
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByRole("dialog", { name: DIALOG })).toBeInTheDocument();
  });

  it("流し始めをブラウザが止めたときも、断りを出す", async () => {
    play.mockImplementation(() => Promise.reject(new DOMException("blocked", "NotAllowedError")));
    render(<PhotoSpotLayer />);
    const dialog = openPlayer();
    await act(async () => {
      vi.advanceTimersByTime(PHOTO_SPOT_TIMING.introMs);
    });
    expect(dialog).toHaveTextContent("動画を読み込めませんでした");
  });

  it("上郷と中心市街地は動画、鼎と伊賀良は準備中にする", () => {
    const districts = (playable: boolean) => [...new Set(PHOTO_SPOTS.filter((spot) => isPlayable(spot) === playable).map((spot) => spot.district))];
    expect(PHOTO_SPOTS.filter(isPlayable).map((spot) => spot.id)).toEqual(["kamisato-ishidan", "kamisato-linear", "chushin-station", "chushin-shrine", "chushin-roundabout"]);
    expect(districts(false)).toEqual(["kanae", "igara"]);
  });

  it("準備中の場所を押すと、窓は開かず「準備中です」を約2秒出して消す", async () => {
    render(<PhotoSpotLayer />);
    fireEvent.click(screen.getByRole("button", { name: PREPARING }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("準備中です");
    await act(async () => {
      vi.advanceTimersByTime(PHOTO_SPOT_TIMING.preparingMs - 1);
    });
    expect(screen.getByRole("status")).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("準備中の吹き出しを出しているあいだに押し直すと、そこから約2秒出す", async () => {
    render(<PhotoSpotLayer />);
    const marker = screen.getByRole("button", { name: PREPARING });
    fireEvent.click(marker);
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });
    fireEvent.click(marker);
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });
    expect(screen.getByRole("status")).toHaveTextContent("準備中です");
  });

  it("AI でつないだ映像であることを書く", () => {
    render(<PhotoSpotLayer />);
    expect(openPlayer()).toHaveTextContent("Google の AI（Omni）でつないだ映像です。");
  });
});
