/**
 * Phase 19 — HOBBY_ANALYTICS_KEY cache-key contract test.
 *
 * The Dashboard HOBBY HEALTH section (Plan 02) and SpendingPage Monthly Trend
 * chart (Plan 02) both consume this key; future session/spend mutations may
 * invalidate it. If a future refactor renames this key, this test fails —
 * alerting the developer that downstream consumers need updating.
 */
import { describe, it, expect } from "vitest";
import { HOBBY_ANALYTICS_KEY } from "@/hooks/useHobbyAnalytics";

describe("ANLY-04/05/06/07 HOBBY_ANALYTICS_KEY contract", () => {
  it("equals ['hobby-analytics'] literal — must match any future session/spend invalidation key", () => {
    expect(HOBBY_ANALYTICS_KEY).toEqual(["hobby-analytics"]);
  });

  it("is a single-element readonly tuple (not a deeper key path)", () => {
    expect(HOBBY_ANALYTICS_KEY).toHaveLength(1);
    expect(HOBBY_ANALYTICS_KEY[0]).toBe("hobby-analytics");
  });
});
