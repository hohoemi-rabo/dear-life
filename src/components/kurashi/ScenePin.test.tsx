import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ScenePin } from "./ScenePin";

// 名前の札は PC だけに出すので、向きは PC の絵（wide）の side で決まる。スマホ（tall）の side には左右されない
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
  it("名前の札は PC の向きに伸ばす（右）", () => {
    expect(renderPin("left", "right").className).toMatch(/(^|\s)left-full(\s|$)/);
  });

  it("名前の札は PC の向きに伸ばす（左）", () => {
    expect(renderPin("right", "left").className).toMatch(/(^|\s)right-full(\s|$)/);
  });

  it("読み上げの名前は1つだけで、押すと開くことを伝える", () => {
    renderPin("left", "left");
    const button = screen.getByRole("button", { name: "学校" });
    expect(button).toHaveAttribute("aria-haspopup", "dialog");
    expect(button).toHaveAttribute("aria-expanded", "false");
  });
});
