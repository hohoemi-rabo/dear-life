import { act, renderHook } from "@testing-library/react";
import { usePathname, useRouter, useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useConditions } from "./useConditions";

vi.mock("next/navigation", () => ({ usePathname: vi.fn(), useRouter: vi.fn(), useSearchParams: vi.fn() }));

const replace = vi.fn();

function withQuery(query: string) {
  vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams(query) as unknown as ReadonlyURLSearchParams);
}

describe("useConditions", () => {
  beforeEach(() => {
    replace.mockReset();
    vi.mocked(usePathname).mockReturnValue("/kurashi");
    vi.mocked(useRouter).mockReturnValue({ replace } as unknown as ReturnType<typeof useRouter>);
  });

  it("URL パラメータから条件を読む", () => {
    withQuery("d=kanae&k=0&c=0");
    const { result } = renderHook(() => useConditions());
    expect(result.current.conditions).toMatchObject({ district: "kanae", adults: 2, children: 0, car: 0 });
  });

  it("書きかえは履歴を増やさず URL を置きかえ、条件以外のパラメータは残す", () => {
    withQuery("s=冬&d=kanae&a=2&k=1&h=new");
    const { result } = renderHook(() => useConditions());
    act(() => result.current.setConditions({ housing: "old", car: 0 }));
    expect(replace).toHaveBeenCalledWith(`/kurashi?${new URLSearchParams("s=冬&d=kanae&a=2&k=1&h=old&c=0")}`, {
      scroll: false,
    });
  });
});
