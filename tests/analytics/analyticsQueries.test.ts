/**
 * Phase 19 — analytics query module SQL contract tests.
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
import { describe, it, expect, beforeEach, vi } from "vitest";

const selectMock = vi.fn();
const executeMock = vi.fn();
vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock, execute: executeMock }),
}));

import { getAnalyticsData } from "@/db/queries/analytics";

beforeEach(() => {
  selectMock.mockReset();
  executeMock.mockReset();
  selectMock.mockResolvedValue([]);
});

describe("analytics queries — getAnalyticsData (ANLY-04/05/06/07)", () => {
  it("calls db.select twice — once for sessions, once for monthlySpend (Promise.all parallel)", async () => {
    await getAnalyticsData();
    expect(selectMock.mock.calls.length).toBe(2);
  });

  it("sessions query selects DISTINCT unit_id, session_date FROM painting_sessions ORDER BY session_date ASC", async () => {
    await getAnalyticsData();
    expect(selectMock.mock.calls[0][0]).toMatch(
      /SELECT DISTINCT unit_id, session_date FROM painting_sessions ORDER BY session_date ASC/
    );
  });

  it("monthlySpend query uses UNION ALL combining units and paints with purchase_price_pence + purchase_date", async () => {
    await getAnalyticsData();
    const sql = selectMock.mock.calls[1][0];
    expect(sql).toMatch(/UNION ALL/);
    expect(sql).toMatch(/FROM units/);
    expect(sql).toMatch(/FROM paints/);
  });

  it("monthlySpend query filters 'WHERE purchase_date IS NOT NULL' for the units source (ANLY-07)", async () => {
    await getAnalyticsData();
    const sql = selectMock.mock.calls[1][0];
    expect(sql).toMatch(/FROM units\s+WHERE purchase_date IS NOT NULL/);
  });

  it("monthlySpend query filters 'WHERE purchase_date IS NOT NULL' for the paints source (ANLY-07)", async () => {
    await getAnalyticsData();
    const sql = selectMock.mock.calls[1][0];
    expect(sql).toMatch(/FROM paints\s+WHERE purchase_date IS NOT NULL/);
  });

  it("monthlySpend query also filters 'AND purchase_price_pence IS NOT NULL' for both sources (avoid NULL pence in SUM)", async () => {
    await getAnalyticsData();
    const sql = selectMock.mock.calls[1][0];
    const matches = sql.match(/AND purchase_price_pence IS NOT NULL/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(2);
  });

  it("monthlySpend query restricts the rolling window via WHERE month >= strftime('%Y-%m', date('now', '-11 months'))", async () => {
    await getAnalyticsData();
    const sql = selectMock.mock.calls[1][0];
    expect(sql).toMatch(/WHERE month >= strftime\('%Y-%m', date\('now', '-11 months'\)\)/);
  });

  it("monthlySpend query GROUPs BY month and ORDERs BY month ASC (matches compute-layer expectation)", async () => {
    await getAnalyticsData();
    const sql = selectMock.mock.calls[1][0];
    expect(sql).toMatch(/GROUP BY month/);
    expect(sql).toMatch(/ORDER BY month ASC/);
  });

  it("returns shape { sessions: {...}[], monthlySpend: {...}[] } so compute function can consume it directly", async () => {
    selectMock.mockResolvedValueOnce([{ unit_id: 1, session_date: "2026-01-01" }]);
    selectMock.mockResolvedValueOnce([{ month: "2026-01", pence: 1500 }]);
    const result = await getAnalyticsData();
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0]).toMatchObject({ unit_id: 1 });
    expect(result.monthlySpend).toHaveLength(1);
    expect(result.monthlySpend[0]).toMatchObject({ pence: 1500 });
  });
});
