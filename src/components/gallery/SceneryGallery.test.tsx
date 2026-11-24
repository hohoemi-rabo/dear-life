import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GALLERY_SPOTS, type GalleryState } from "@/lib/gallery/gallery";
import { SceneryGallery } from "./SceneryGallery";

const spot = (id: string) => GALLERY_SPOTS.find((item) => item.id === id)!;

function renderGallery(state: GalleryState) {
  const handlers = {
    onTab: vi.fn(),
    onOpenSpot: vi.fn(),
    onBackToList: vi.fn(),
    onMove: vi.fn(),
    onClose: vi.fn(),
  };
  render(<SceneryGallery state={state} {...handlers} />);
  return { dialog: screen.getByRole("dialog"), ...handlers };
}

describe("SceneryGallery：写真一覧（052）", () => {
  it("「すべて」では4地区を出し、写真のない鼎・伊賀良は「準備中です」", () => {
    const { dialog } = renderGallery({ tab: "all", spot: null });
    expect(within(dialog).getByRole("heading", { name: "飯田の風景を見る" })).toBeInTheDocument();
    const section = (name: string) => within(dialog).getByRole("region", { name });
    expect(within(section("上郷")).getAllByRole("button").map((button) => button.textContent)).toEqual(["飯沼神社", "リニアの高架"]);
    expect(within(section("鼎")).getByText("準備中です")).toBeInTheDocument();
    expect(within(section("伊賀良")).getByText("準備中です")).toBeInTheDocument();
    expect(within(section("中心市街地")).getAllByRole("button").map((button) => button.textContent)).toEqual(["飯田駅", "大宮神社", "ロータリー"]);
  });

  it("地区のタブでは、その地区だけを出す", () => {
    const { dialog } = renderGallery({ tab: "chushin", spot: null });
    expect(within(dialog).getByRole("button", { name: "中心市街地", pressed: true })).toBeInTheDocument();
    expect(within(dialog).queryByRole("region", { name: "上郷" })).toBeNull();
    expect(within(dialog).getByRole("region", { name: "中心市街地" })).toBeInTheDocument();
  });

  it("タブを押すと絞り込みを変え、カードを押すとその場所を見比べる", () => {
    const { dialog, onTab, onOpenSpot } = renderGallery({ tab: "all", spot: null });
    fireEvent.click(within(dialog).getByRole("button", { name: "伊賀良" }));
    expect(onTab).toHaveBeenCalledWith("igara");
    fireEvent.click(within(dialog).getByRole("button", { name: "大宮神社" }));
    expect(onOpenSpot).toHaveBeenCalledWith(spot("chushin-shrine"));
  });

  it("× で閉じる", () => {
    const { dialog, onClose } = renderGallery({ tab: "all", spot: null });
    fireEvent.click(within(dialog).getByRole("button", { name: "閉じる" }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("SceneryGallery：見比べる（052）", () => {
  it("地区名・場所の名前・撮った人を出し、はじめは「見比べる」で境目は真ん中", () => {
    const { dialog } = renderGallery({ tab: "all", spot: spot("kamisato-ishidan") });
    expect(within(dialog).getByRole("heading", { name: "上郷の飯沼神社" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "見比べる", pressed: true })).toBeInTheDocument();
    expect(within(dialog).getByRole("group", { name: "上郷の飯沼神社：左がドット絵、右が実際の写真" })).toBeInTheDocument();
    expect(within(dialog).getByRole("slider", { name: "ドット絵と写真の境目" })).toHaveAttribute("aria-valuenow", "50");
    expect(within(dialog).getByText("写真：開発者が撮影（2026年11月）")).toBeInTheDocument();
    expect(within(dialog).getByText(/境目を左右に動かす/)).toBeInTheDocument();
  });

  it("境目はキーボードでも動かせる", () => {
    const { dialog } = renderGallery({ tab: "all", spot: spot("kamisato-ishidan") });
    const slider = within(dialog).getByRole("slider");
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(slider).toHaveAttribute("aria-valuenow", "55");
    fireEvent.keyDown(slider, { key: "PageDown" });
    expect(slider).toHaveAttribute("aria-valuenow", "45");
    fireEvent.keyDown(slider, { key: "Home" });
    expect(slider).toHaveAttribute("aria-valuenow", "0");
    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    expect(slider).toHaveAttribute("aria-valuenow", "0");
    fireEvent.keyDown(slider, { key: "End" });
    expect(slider).toHaveAttribute("aria-valuetext", "ドット絵 100%、写真 0%");
  });

  it("「実際の写真」「ドット絵」に切りかえると、境目を出さずに1枚だけ見せる", () => {
    const { dialog } = renderGallery({ tab: "all", spot: spot("chushin-station") });
    fireEvent.click(within(dialog).getByRole("button", { name: "実際の写真" }));
    expect(within(dialog).getByRole("group", { name: "中心市街地の飯田駅の実際の写真" })).toBeInTheDocument();
    expect(within(dialog).queryByRole("slider")).toBeNull();
    expect(within(dialog).queryByText(/境目を左右に動かす/)).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "ドット絵" }));
    expect(within(dialog).getByRole("group", { name: "中心市街地の飯田駅のドット絵" })).toBeInTheDocument();
  });

  it("前の場所・次の場所は、選んでいるタブの中で回る", () => {
    const { dialog, onMove } = renderGallery({ tab: "kamisato", spot: spot("kamisato-linear") });
    fireEvent.click(within(dialog).getByRole("button", { name: "次の場所（上郷の飯沼神社）" }));
    expect(onMove).toHaveBeenLastCalledWith(spot("kamisato-ishidan"));
    fireEvent.click(within(dialog).getByRole("button", { name: "前の場所（上郷の飯沼神社）" }));
    expect(onMove).toHaveBeenLastCalledWith(spot("kamisato-ishidan"));
  });

  it("「すべて」では地区をまたいで回る", () => {
    const { dialog, onMove } = renderGallery({ tab: "all", spot: spot("kamisato-linear") });
    fireEvent.click(within(dialog).getByRole("button", { name: "次の場所（中心市街地の飯田駅）" }));
    expect(onMove).toHaveBeenCalledWith(spot("chushin-station"));
  });

  it("「← 写真一覧へ」で一覧に戻る", () => {
    const { dialog, onBackToList } = renderGallery({ tab: "all", spot: spot("chushin-roundabout") });
    fireEvent.click(within(dialog).getByRole("button", { name: "写真一覧へ" }));
    expect(onBackToList).toHaveBeenCalled();
  });
});
