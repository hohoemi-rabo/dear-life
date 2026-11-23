import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { compareCityFixture, compareMetricFixture, sourceFixture } from "@/test/screen-data-fixture";
import { RainWindCard } from "./RainWindCard";

const FLOOD = sourceFixture("mlit_flood_statistics", { publisher: "国土交通省" });
const iidaWithFlood = (value: number) =>
  compareCityFixture("iida", { metrics: { flood_damage_per_person: compareMetricFixture(value, "円", FLOOD, { periodLabel: "2014〜2023年" }) } });

describe("雨と風は、どれくらい？（041・051）", () => {
  it("飯田市の水害被害額が 0 なら「0円（記録なし）」と、記録なしの注意書きを出す", () => {
    render(<RainWindCard iida={iidaWithFlood(0)} />);
    const card = screen.getByText("住まいや店の水害被害額（1人・1年あたり）").parentElement!;
    expect(card).toHaveTextContent("0円（記録なし）");
    expect(screen.getByText(/2014〜2023年の国の統計に、飯田市の住まいや店の水害被害の記録はありません。/)).toBeInTheDocument();
  });

  it("値があれば「記録なし」も注意書きの一文も出さない", () => {
    render(<RainWindCard iida={iidaWithFlood(1200)} />);
    expect(screen.queryByText(/記録なし|記録はありません/)).toBeNull();
    expect(screen.getByText("住まいや店の水害被害額（1人・1年あたり）").parentElement).toHaveTextContent("1,200円");
  });
});
