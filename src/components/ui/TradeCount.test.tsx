import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TradeCount } from "./TradeCount";

describe("TradeCount", () => {
  it("件数によらず「取引〇件・参考値」と出す", () => {
    for (const count of [6, 42, 1313]) {
      const { container, unmount } = render(<TradeCount count={count} />);
      expect(container).toHaveTextContent(`取引${count.toLocaleString("ja-JP")}件・参考値`);
      expect(container).not.toHaveTextContent(/件数じゅうぶん|参考になる件数|件数少なめ/);
      unmount();
    }
  });
});
