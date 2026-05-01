/**
 * DASH-07 — Cache-key contract test.
 *
 * The dashboard freshness guarantee depends on DASHBOARD_STATS_KEY being
 * literally `["dashboard-stats"]` (the same key the useUnits mutations
 * invalidate, decision 02-02 in STATE.md). If a future refactor renames
 * this key, this test fails — alerting the developer that they need to
 * also update the invalidations in useUnits.ts.
 *
 * We don't mock the DB or React Query here — that's the job of plan 05-02's
 * page-level tests. This is a pure literal-equality assertion.
 */
import { describe, it, expect } from "vitest";
import { DASHBOARD_STATS_KEY } from "@/hooks/useDashboardStats";

describe("DASH-07 DASHBOARD_STATS_KEY contract", () => {
  it("equals ['dashboard-stats'] literal — must match useUnits invalidation key", () => {
    expect(DASHBOARD_STATS_KEY).toEqual(["dashboard-stats"]);
  });

  it("is a single-element readonly tuple (not a deeper key path)", () => {
    expect(DASHBOARD_STATS_KEY).toHaveLength(1);
    expect(DASHBOARD_STATS_KEY[0]).toBe("dashboard-stats");
  });
});
