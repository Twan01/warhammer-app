/**
 * Phase 45 — syncFreshness utility tests (META-05).
 *
 * Uses vi.useFakeTimers() + vi.setSystemTime() for deterministic date testing.
 * All dates relative to a fixed "now" of 2026-05-08T12:00:00.000Z.
 */
import { vi, describe, it, expect, afterEach } from "vitest";
import { getSyncFreshness, getSyncAgeLabel } from "@/lib/syncFreshness";

const NOW = new Date("2026-05-08T12:00:00.000Z");

function daysAgo(days: number): string {
  const d = new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

afterEach(() => {
  vi.useRealTimers();
});

describe("getSyncFreshness", () => {
  it("META-05: returns 'never' when lastSyncAt is null", () => {
    expect(getSyncFreshness(null)).toBe("never");
  });

  it("META-05: returns 'fresh' when synced 2 days ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(getSyncFreshness(daysAgo(2))).toBe("fresh");
  });

  it("META-05: returns 'aging' when synced 10 days ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(getSyncFreshness(daysAgo(10))).toBe("aging");
  });

  it("META-05: returns 'stale' when synced 20 days ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(getSyncFreshness(daysAgo(20))).toBe("stale");
  });

  it("META-05: returns 'aging' for exactly 7 days ago (boundary — not < 7)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(getSyncFreshness(daysAgo(7))).toBe("aging");
  });

  it("META-05: returns 'stale' for exactly 14 days ago (boundary — not < 14)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(getSyncFreshness(daysAgo(14))).toBe("stale");
  });
});

describe("getSyncAgeLabel", () => {
  it("META-05: returns 'Never synced' when lastSyncAt is null", () => {
    expect(getSyncAgeLabel(null)).toBe("Never synced");
  });

  it("META-05: returns 'Synced today' for 0 days ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(getSyncAgeLabel(daysAgo(0))).toBe("Synced today");
  });

  it("META-05: returns 'Synced yesterday' for 1 day ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(getSyncAgeLabel(daysAgo(1))).toBe("Synced yesterday");
  });

  it("META-05: returns 'Synced 5 days ago' for 5 days ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(getSyncAgeLabel(daysAgo(5))).toBe("Synced 5 days ago");
  });
});
