/**
 * Phase 19 — analytics query module SQL contract tests.
 *
 * Wave 0: stubs only (it.skip). Plan 01 flips these to active by removing
 * .skip and adding the vi.mock setup once src/db/queries/analytics.ts exists.
 *
 * Mocks getDb() because tauri-plugin-sql IPC cannot run in jsdom.
 * Mirrors tests/foundation/armyListQueries.test.ts.
 *
 * Covers:
 *   ANLY-07 — getAnalyticsData monthly spend SQL must filter
 *             "WHERE purchase_date IS NOT NULL" for BOTH units AND paints in the
 *             UNION ALL subquery — NULL purchase_date rows must NOT be bucketed
 *             to 1970-01 epoch.
 *   ANLY-04/05 — getAnalyticsData also returns sessions = DISTINCT (unit_id, session_date)
 *                ORDER BY session_date ASC for compute layer to derive velocity + streak.
 */
import { describe, it } from "vitest";
// TODO Plan 01: replace this comment with the active mock setup:
//   import { vi, expect, beforeEach } from "vitest";
//   const selectMock = vi.fn();
//   const executeMock = vi.fn();
//   vi.mock("@/db/client", () => ({
//     getDb: async () => ({ select: selectMock, execute: executeMock }),
//   }));
//   import { getAnalyticsData } from "@/db/queries/analytics";
//   beforeEach(() => { selectMock.mockReset(); executeMock.mockReset(); });

describe("analytics queries — getAnalyticsData (ANLY-04/05/06/07)", () => {
  it.skip("calls db.select twice — once for sessions, once for monthlySpend (Promise.all parallel)", () => {});
  it.skip("sessions query selects DISTINCT unit_id, session_date FROM painting_sessions ORDER BY session_date ASC", () => {});
  it.skip("monthlySpend query uses UNION ALL combining units and paints with purchase_price_pence + purchase_date", () => {});
  it.skip("monthlySpend query filters 'WHERE purchase_date IS NOT NULL' for the units source (ANLY-07)", () => {});
  it.skip("monthlySpend query filters 'WHERE purchase_date IS NOT NULL' for the paints source (ANLY-07)", () => {});
  it.skip("monthlySpend query also filters 'AND purchase_price_pence IS NOT NULL' for both sources (avoid NULL pence in SUM)", () => {});
  it.skip("monthlySpend query restricts the rolling window via WHERE month >= strftime('%Y-%m', date('now', '-11 months'))", () => {});
  it.skip("monthlySpend query GROUPs BY month and ORDERs BY month ASC (matches compute-layer expectation)", () => {});
  it.skip("returns shape { sessions: {...}[], monthlySpend: {...}[] } so compute function can consume it directly", () => {});
});
