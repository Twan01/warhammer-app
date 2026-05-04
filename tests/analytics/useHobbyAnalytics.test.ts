/**
 * Phase 19 — HOBBY_ANALYTICS_KEY cache-key contract test.
 *
 * Wave 0: stub only (it.skip). Plan 01 flips this to active by removing
 * .skip and importing HOBBY_ANALYTICS_KEY once src/hooks/useHobbyAnalytics.ts
 * is created.
 *
 * The Dashboard HOBBY HEALTH section (Plan 02) and SpendingPage Monthly Trend
 * chart (Plan 02) BOTH consume this key. Forward-compat: future session +
 * spend mutations may invalidate ['hobby-analytics']. If a future refactor
 * renames this key, the hook contract test fails — alerting the developer.
 *
 * Mirrors tests/spending/useSpendingStats.test.ts exactly.
 */
import { describe, it } from "vitest";
// TODO Plan 01: replace this comment with:
//   import { expect } from "vitest";
//   import { HOBBY_ANALYTICS_KEY } from "@/hooks/useHobbyAnalytics";

describe("ANLY-04/05/06/07 HOBBY_ANALYTICS_KEY contract", () => {
  it.skip("equals ['hobby-analytics'] literal — must match any future session/spend invalidation key", () => {});
  it.skip("is a single-element readonly tuple (not a deeper key path)", () => {});
});
