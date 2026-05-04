/**
 * Phase 19 — computeHobbyAnalytics pure-function tests.
 *
 * Wave 0: stubs only (it.skip). Plan 01 flips these to active by removing
 * .skip and adding the actual assertions once src/features/dashboard/
 * computeHobbyAnalytics.ts is created.
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
import { describe, it } from "vitest";
// TODO Plan 01: replace this comment with:
//   import { expect, beforeEach, afterEach, vi } from "vitest";
//   import { computeHobbyAnalytics } from "@/features/dashboard/computeHobbyAnalytics";

describe("computeHobbyAnalytics — ANLY-04 velocity (units/month average)", () => {
  it.skip("returns velocityString='0.0' when sessions array is empty", () => {});
  it.skip("returns velocityString='1.0' when one session exists (single-day floor: months=1, units=1)", () => {});
  it.skip("returns velocityString='3.0' when 6 distinct units have sessions across 2 months (6 ÷ 2 = 3.0)", () => {});
  it.skip("returns velocityString='3.1' with 1 decimal place (Math: 31 ÷ 10 = 3.1, never integer-rounded to '3')", () => {});
  it.skip("does NOT return 'Infinity' when all sessions occurred on the same date (Pitfall 2: monthsDiff=0 floored to 1)", () => {});
  it.skip("counts DISTINCT unit_ids (3 sessions all on unit 1 contribute 1 to numerator, not 3)", () => {});
});

describe("computeHobbyAnalytics — ANLY-05 streak (consecutive calendar days)", () => {
  it.skip("returns streakString='0 days' when sessions array is empty", () => {});
  it.skip("returns streakString='1 days' when there is exactly one session dated today", () => {});
  it.skip("returns streakString='3 days' when sessions exist on today, today-1, today-2 (no gaps)", () => {});
  it.skip("returns streakString='0 days' when most recent session is yesterday but not today (streak does not include today)", () => {});
  it.skip("stops counting at first calendar-day gap (sessions today + today-2 → streak=1, not 2)", () => {});
  it.skip("uses dates.ts (todayISO + parseLocalDate) — never raw new Date().toISOString() (Pitfall 5: timezone safety)", () => {});
});

describe("computeHobbyAnalytics — ANLY-06 monthlyData (12-month rolling window)", () => {
  it.skip("always returns exactly 12 entries (length === 12) regardless of input rawMonthlySpend length", () => {});
  it.skip("fills missing months with pence=0 — input [] produces 12 zero entries (Pitfall 3: SQL gaps padded in JS)", () => {});
  it.skip("merges SQL rows by YYYY-MM key — input [{month:'2026-03',pence:5500}] surfaces 5500 in the matching slot", () => {});
  it.skip("month labels use 3-character abbreviation when window stays in current year (e.g. 'Jan', 'Feb', 'Mar')", () => {});
  it.skip("month labels use Jan '25 style suffix for months belonging to a year before the current year (Pitfall 6)", () => {});
  it.skip("entries are ordered oldest-first (entry 0 = 11 months ago, entry 11 = current month)", () => {});
});
