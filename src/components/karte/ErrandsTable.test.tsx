import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PrintModeProvider } from "@/components/print/PrintMode";
import { karteScreenData } from "@/test/karte-fixture";
import { ErrandsTable } from "./ErrandsTable";

const groups = () => screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent);

describe("ErrandsTable（行ける場所の表。038）", () => {
  it("紙では開閉のボタンに関係なく、学校・駅まで全部出す（023）", () => {
    const district = karteScreenData().districts.kanae;
    render(
      <PrintModeProvider value>
        <ErrandsTable district={district} />
      </PrintModeProvider>,
    );
    expect(groups()).toEqual(["買い物", "病院", "市役所", "学校", "駅", "住む場所の近くから、どう行く？"]);
    expect(screen.getByText("鼎小学校")).toBeInTheDocument();
  });

  it("バスのデータがないときは、まとまりごとにデータ未取得と出し、診療所・高校・駅は出す", () => {
    const district = { ...karteScreenData().districts.kanae, busErrands: { status: "unavailable" } as const };
    render(
      <PrintModeProvider value>
        <ErrandsTable district={district} />
      </PrintModeProvider>,
    );
    const store = screen.getByRole("heading", { name: "買い物" }).closest("section") as HTMLElement;
    expect(within(store).getByText("データ未取得")).toBeInTheDocument();
    expect(screen.getByText("診療所（クリニック）").closest("li")).toHaveTextContent("鼎の中に8か所");
  });

  it("店は2店で切らずに全部出す", () => {
    const district = karteScreenData().districts.kanae;
    if (district.busErrands.status !== "available") throw new Error("鼎の用事の場所がない");
    const errands = district.busErrands.value;
    const extra = { ...errands.find((errand) => errand.kind === "店")!, place: "スーパーマーケットバロー飯田店", officialUrl: "https://example.com/" };
    render(<ErrandsTable district={{ ...district, busErrands: { ...district.busErrands, value: [...errands, extra] } }} />);
    const store = screen.getByRole("heading", { name: "買い物" }).closest("section") as HTMLElement;
    expect(within(store).getAllByRole("listitem")).toHaveLength(3);
    expect(within(store).getByRole("link", { name: /スーパーマーケットバロー飯田店/ })).toBeInTheDocument();
  });
});
