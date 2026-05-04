/**
 * Phase 14 — SPENDING_STATS_KEY cache-key contract test (Wave 0 stub).
 *
 * STATUS: skipped. Plan 14-03 will:
 *   1. Create src/hooks/useSpendingStats.ts exporting `SPENDING_STATS_KEY = ["spending-stats"]`
 *      and `useSpendingStats()` per 14-RESEARCH.md §Pattern 3.
 *   2. Plan 14-02 will add `qc.invalidateQueries({ queryKey: ["spending-stats"] })` to
 *      useCreateUnit/useUpdateUnit/useDeleteUnit AND useCreatePaint/useUpdatePaint/useDeletePaint.
 *   3. Replace `describe.skip` below with `describe`.
 *   4. Add real assertions matching tests/dashboard/useDashboardStats.test.ts verbatim
 *      but for SPENDING_STATS_KEY.
 *
 * The Spending page freshness guarantee depends on SPENDING_STATS_KEY being literally
 * `["spending-stats"]` (the same key both useUnits AND usePaints mutations will invalidate).
 * If a future refactor renames this key, this test fails — alerting the developer that
 * they need to also update the invalidations in useUnits.ts and usePaints.ts.
 */
import { describe, it } from "vitest";

describe.skip("SPEND-03/04 SPENDING_STATS_KEY contract", () => {
  it("equals ['spending-stats'] literal — must match useUnits + usePaints invalidation key", () => {
    // Plan 14-03 will:
    //   - import { SPENDING_STATS_KEY } from "@/hooks/useSpendingStats";
    //   - expect(SPENDING_STATS_KEY).toEqual(["spending-stats"]);
  });

  it("is a single-element readonly tuple (not a deeper key path)", () => {
    // Plan 14-03 will:
    //   - expect(SPENDING_STATS_KEY).toHaveLength(1);
    //   - expect(SPENDING_STATS_KEY[0]).toBe("spending-stats");
  });
});
