/**
 * SPEND-03/04 — Cache-key contract test.
 *
 * The Spending page freshness guarantee depends on SPENDING_STATS_KEY being literally
 * `["spending-stats"]` — the same key all 6 mutation hooks (3 unit + 3 paint) invalidate.
 * If a future refactor renames this key, this test fails — alerting the developer that
 * they need to also update the invalidations in useUnits.ts and usePaints.ts.
 */
import { describe, it, expect } from "vitest";
import { SPENDING_STATS_KEY } from "@/hooks/useSpendingStats";

describe("SPEND-03/04 SPENDING_STATS_KEY contract", () => {
  it("equals ['spending-stats'] literal — must match useUnits + usePaints invalidation key", () => {
    expect(SPENDING_STATS_KEY).toEqual(["spending-stats"]);
  });

  it("is a single-element readonly tuple (not a deeper key path)", () => {
    expect(SPENDING_STATS_KEY).toHaveLength(1);
    expect(SPENDING_STATS_KEY[0]).toBe("spending-stats");
  });
});
