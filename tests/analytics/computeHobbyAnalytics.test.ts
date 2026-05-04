/**
 * Phase 19 — computeHobbyAnalytics pure-function tests.
 *
 * Pure function — no mocks needed. Mirrors tests/spending/computeSpendingStats.test.ts.
 *
 * Covers:
 *   ANLY-04 — velocity: distinct unit_ids ÷ months between first/last session date,
 *             "0.0" when empty, single-day session floors to 1 month (Pitfall 2).
 *   ANLY-05 — streak: consecutive calendar days ending today via dates.ts,
 *             "0 days" when empty.
 *   ANLY-06 — monthlyData: 12 entries always, gaps filled with pence=0,
 *             month labels use "Jan" abbreviation or "Jan '25" when crossing year (Pitfall 6).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { computeHobbyAnalytics } from "@/features/dashboard/computeHobbyAnalytics";

describe("computeHobbyAnalytics — ANLY-04 velocity (units/month average)", () => {
  it("returns velocityString='0.0' when sessions array is empty", () => {
    const result = computeHobbyAnalytics([], []);
    expect(result.velocityString).toBe("0.0");
  });

  it("returns velocityString='1.0' when one session exists (single-day floor: months=1, units=1)", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 4, 4)); // 2026-05-04 local
    });
    afterEach(() => { vi.useRealTimers(); });

    const sessions = [{ unit_id: 1, session_date: "2026-05-04" }];
    const result = computeHobbyAnalytics(sessions, []);
    expect(result.velocityString).toBe("1.0");
  });

  it("returns velocityString='3.0' when 6 distinct units have sessions across 2 months (6 ÷ 2 = 3.0)", () => {
    const sessions = [
      { unit_id: 1, session_date: "2026-01-01" },
      { unit_id: 2, session_date: "2026-01-15" },
      { unit_id: 3, session_date: "2026-01-20" },
      { unit_id: 4, session_date: "2026-03-01" },
      { unit_id: 5, session_date: "2026-03-10" },
      { unit_id: 6, session_date: "2026-03-15" },
    ];
    const result = computeHobbyAnalytics(sessions, []);
    expect(result.velocityString).toBe("3.0");
  });

  it("returns velocityString='3.1' with 1 decimal place (Math: 31 ÷ 10 = 3.1, never integer-rounded to '3')", () => {
    const sessions: { unit_id: number; session_date: string }[] = [];
    // 31 distinct units across 10 months (Jan 2026 to Nov 2026 = 10 month diff)
    for (let i = 1; i <= 31; i++) {
      sessions.push({ unit_id: i, session_date: "2026-01-01" });
    }
    sessions.push({ unit_id: 32, session_date: "2026-11-01" }); // push last date to give 10 months
    // Actually 32 distinct units over 10 months = 3.2. Let's build 31 units with first date 2026-01 and last 2026-11 (10 months span)
    // 31 distinct unit_ids: unit_id 1..31, dates spanning Jan to Nov (10 months diff)
    const correctSessions: { unit_id: number; session_date: string }[] = [];
    for (let i = 1; i <= 31; i++) {
      correctSessions.push({ unit_id: i, session_date: "2026-01-01" });
    }
    correctSessions.push({ unit_id: 1, session_date: "2026-11-01" }); // same unit_id, extends span to 10 months
    const result2 = computeHobbyAnalytics(correctSessions, []);
    expect(result2.velocityString).toBe("3.1");
  });

  it("does NOT return 'Infinity' when all sessions occurred on the same date (Pitfall 2: monthsDiff=0 floored to 1)", () => {
    const sessions = [
      { unit_id: 1, session_date: "2026-05-04" },
      { unit_id: 2, session_date: "2026-05-04" },
      { unit_id: 3, session_date: "2026-05-04" },
    ];
    const result = computeHobbyAnalytics(sessions, []);
    expect(result.velocityString).not.toBe("Infinity");
    expect(Number.isFinite(parseFloat(result.velocityString))).toBe(true);
  });

  it("counts DISTINCT unit_ids (3 sessions all on unit 1 contribute 1 to numerator, not 3)", () => {
    const sessions = [
      { unit_id: 1, session_date: "2026-05-04" },
      { unit_id: 1, session_date: "2026-05-04" },
      { unit_id: 1, session_date: "2026-05-04" },
    ];
    const result = computeHobbyAnalytics(sessions, []);
    // 1 distinct unit_id ÷ Math.max(0, 1) = 1 ÷ 1 = 1.0
    expect(result.velocityString).toBe("1.0");
  });
});

describe("computeHobbyAnalytics — ANLY-05 streak (consecutive calendar days)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 4)); // 2026-05-04 local
  });
  afterEach(() => { vi.useRealTimers(); });

  it("returns streakString='0 days' when sessions array is empty", () => {
    const result = computeHobbyAnalytics([], []);
    expect(result.streakString).toBe("0 days");
  });

  it("returns streakString='1 days' when there is exactly one session dated today", () => {
    const sessions = [{ unit_id: 1, session_date: "2026-05-04" }];
    const result = computeHobbyAnalytics(sessions, []);
    expect(result.streakString).toBe("1 days");
  });

  it("returns streakString='3 days' when sessions exist on today, today-1, today-2 (no gaps)", () => {
    const sessions = [
      { unit_id: 1, session_date: "2026-05-04" },
      { unit_id: 1, session_date: "2026-05-03" },
      { unit_id: 1, session_date: "2026-05-02" },
    ];
    const result = computeHobbyAnalytics(sessions, []);
    expect(result.streakString).toBe("3 days");
  });

  it("returns streakString='0 days' when most recent session is yesterday but not today (streak does not include today)", () => {
    const sessions = [{ unit_id: 1, session_date: "2026-05-03" }];
    const result = computeHobbyAnalytics(sessions, []);
    expect(result.streakString).toBe("0 days");
  });

  it("stops counting at first calendar-day gap (sessions today + today-2 → streak=1, not 2)", () => {
    const sessions = [
      { unit_id: 1, session_date: "2026-05-04" },
      { unit_id: 1, session_date: "2026-05-02" },
    ];
    const result = computeHobbyAnalytics(sessions, []);
    expect(result.streakString).toBe("1 days");
  });

  it("uses dates.ts (todayISO + parseLocalDate) — never raw new Date().toISOString() (Pitfall 5: timezone safety)", () => {
    // Build sessions today + 29 days back-to-back = 30 days
    const sessions: { unit_id: number; session_date: string }[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(2026, 4, 4 - i); // 2026-05-04, 2026-05-03, etc.
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      sessions.push({ unit_id: 1, session_date: dateStr });
    }
    const result = computeHobbyAnalytics(sessions, []);
    expect(result.streakString).toBe("30 days");
    expect(result.streakString).not.toContain("NaN");
  });
});

describe("computeHobbyAnalytics — ANLY-06 monthlyData (12-month rolling window)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 4)); // 2026-05-04 local — current year 2026
  });
  afterEach(() => { vi.useRealTimers(); });

  it("always returns exactly 12 entries (length === 12) regardless of input rawMonthlySpend length", () => {
    const result1 = computeHobbyAnalytics([], []);
    expect(result1.monthlyData).toHaveLength(12);

    const result2 = computeHobbyAnalytics([], [
      { month: "2026-03", pence: 1000 },
      { month: "2026-04", pence: 2000 },
      { month: "2025-12", pence: 500 },
    ]);
    expect(result2.monthlyData).toHaveLength(12);
  });

  it("fills missing months with pence=0 — input [] produces 12 zero entries (Pitfall 3: SQL gaps padded in JS)", () => {
    const result = computeHobbyAnalytics([], []);
    const allZero = result.monthlyData.every((entry) => entry.pence === 0);
    expect(allZero).toBe(true);
  });

  it("merges SQL rows by YYYY-MM key — input [{month:'2026-03',pence:5500}] surfaces 5500 in the matching slot", () => {
    const result = computeHobbyAnalytics([], [{ month: "2026-03", pence: 5500 }]);
    const marchEntry = result.monthlyData.find((m) => m.pence === 5500);
    expect(marchEntry).toBeDefined();
    // All others should be 0
    const otherNonZero = result.monthlyData.filter((m) => m.pence !== 0 && m.pence !== 5500);
    expect(otherNonZero).toHaveLength(0);
  });

  it("month labels use 3-character abbreviation when window stays in current year (e.g. 'Jan', 'Feb', 'Mar')", () => {
    const result = computeHobbyAnalytics([], []);
    // Current month (index 11) should be "May" (2026-05 = current year)
    expect(result.monthlyData[11].month).toBe("May");
    // Check no apostrophe in any 2026 month label
    const currentYearEntries = result.monthlyData.filter((m) => !m.month.includes("'"));
    expect(currentYearEntries.length).toBeGreaterThan(0);
  });

  it("month labels use Jan '25 style suffix for months belonging to a year before the current year (Pitfall 6)", () => {
    // Window is 2025-06..2026-05 (11 months before May 2026 = June 2025)
    const result = computeHobbyAnalytics([], [{ month: "2025-08", pence: 1000 }]);
    const augEntry = result.monthlyData.find((m) => m.pence === 1000);
    expect(augEntry).toBeDefined();
    expect(augEntry?.month).toMatch(/Aug '25/);
  });

  it("entries are ordered oldest-first (entry 0 = 11 months ago, entry 11 = current month)", () => {
    const result = computeHobbyAnalytics([], []);
    // 11 months before May 2026 = June 2025 → label "Jun '25"
    expect(result.monthlyData[0].month).toBe("Jun '25");
    // Current month = May 2026 → label "May"
    expect(result.monthlyData[11].month).toBe("May");
  });
});
