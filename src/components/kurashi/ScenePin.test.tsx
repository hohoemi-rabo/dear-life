import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ScenePin } from "./ScenePin";

// jsdom は CSS の幅の切りかえを見ないので、スマホ（lg 未満）と PC（lg 以上）の指定がどちらも付いていることを確かめる
function renderPin(tallSide: "left" | "right", wideSide: "left" | "right") {
  render(
    <ScenePin
      label="学校"
      icon={null}
      tall={{ x: 20, y: 40, side: tallSide }}
      wide={{ x: 80, y: 40, side: wideSide }}
      active={false}
      onOpen={() => {}}
    />,
  );
  return within(screen.getByRole("button", { name: "学校" })).getByText("学校");
}

describe("ScenePin（045）", () => {
  it("名前の札は、スマホと PC でそれぞれの向きに伸ばす", () => {
    const tag = renderPin("left", "right");
    expect(tag.className).toMatch(/(^|\s)right-full(\s|$)/);
    expect(tag.className).toMatch(/(^|\s)lg:left-full(\s|$)/);
  });

  it("スマホで右・PC で左のときも、それぞれの向きにする", () => {
    const tag = renderPin("right", "left");
    expect(tag.className).toMatch(/(^|\s)left-full(\s|$)/);
    expect(tag.className).toMatch(/(^|\s)lg:right-full(\s|$)/);
  });

  it("読み上げの名前は1つだけで、押すと開くことを伝える", () => {
    renderPin("left", "left");
    const button = screen.getByRole("button", { name: "学校" });
    expect(button).toHaveAttribute("aria-haspopup", "dialog");
    expect(button).toHaveAttribute("aria-expanded", "false");
  });
});
