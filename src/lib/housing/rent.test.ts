import { describe, expect, it } from "vitest";
import { formatRentManYen, rentBreakdown, renterSharePercent } from "./rent";

describe("formatRentManYen", () => {
  it("推計値なので万円の小数1桁までにする", () => {
    expect(formatRentManYen(50043)).toBe("約5.0万円");
    expect(formatRentManYen(51671)).toBe("約5.2万円");
    expect(formatRentManYen(43392)).toBe("約4.3万円");
  });

  it("0以下は渡せない", () => {
    expect(() => formatRentManYen(0)).toThrow(RangeError);
  });
});

describe("rentBreakdown", () => {
  it("推計できた建て方だけを決まった順に並べる", () => {
    expect(
      rentBreakdown({ asOf: "2023-10-01", all: 50043, detached: 51671, apartmentWooden: null, apartmentNonWooden: 51483 }).map(
        (row) => row.label,
      ),
    ).toEqual(["一戸建", "共同住宅（木造以外）"]);
  });
});

describe("renterSharePercent", () => {
  it("住宅に住む世帯のうち民営借家の割合を整数の%にする", () => {
    expect(renterSharePercent({ asOf: "2020-10-01", householdsInHousing: 5550, ownerOccupied: 3599, privateRented: 1697 })).toBe(31);
  });

  it("世帯が0なら0%", () => {
    expect(renterSharePercent({ asOf: "2020-10-01", householdsInHousing: 0, ownerOccupied: 0, privateRented: 0 })).toBe(0);
  });
});
