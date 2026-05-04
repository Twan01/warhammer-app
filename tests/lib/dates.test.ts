/**
 * Phase 17 — UTC-safe date utility contract tests.
 *
 * Tests todayISO() and parseLocalDate() from src/lib/dates.ts.
 * Uses format-only and arithmetic assertions — does NOT assert UTC-vs-local
 * divergence because jsdom does not simulate OS-level timezone (RESEARCH §Open Question 2).
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { todayISO, parseLocalDate } from "@/lib/dates";

describe("todayISO()", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a string matching YYYY-MM-DD format", () => {
    const result = todayISO();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns YYYY-MM-DD format even under fake timers", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T23:30:00Z"));
    const result = todayISO();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("parseLocalDate()", () => {
  it("parses YYYY-MM-DD into local-midnight with correct year/month/day components", () => {
    const d = parseLocalDate("2024-03-15");
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(2); // 0-indexed: March = 2
    expect(d.getDate()).toBe(15);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });

  it("parses 2024-01-01 as local midnight day 1 (not UTC-shifted day 31)", () => {
    // In a negative-UTC timezone, new Date("2024-01-01") parses as UTC midnight
    // and getDate() would return 31 (Dec 31). parseLocalDate must return 1.
    const d = parseLocalDate("2024-01-01");
    expect(d.getDate()).toBe(1);
  });
});
