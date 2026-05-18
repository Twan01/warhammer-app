/**
 * Phase 80 — backupFreshness utility tests (STS-01, STS-02).
 *
 * Uses vi.useFakeTimers() + vi.setSystemTime() for deterministic date testing.
 * All dates relative to a fixed "now" of 2026-05-18T12:00:00.000Z.
 */
import { vi, describe, it, expect, afterEach } from "vitest";
import {
  getBackupFreshness,
  getBackupAgeLabel,
  BACKUP_FRESHNESS_DOT_CLASS,
} from "@/lib/backupFreshness";

const NOW = new Date("2026-05-18T12:00:00.000Z");

function daysAgo(days: number): string {
  const d = new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

afterEach(() => {
  vi.useRealTimers();
});

describe("getBackupFreshness", () => {
  it("STS-01: returns 'never' when date is null", () => {
    expect(getBackupFreshness(null)).toBe("never");
  });

  it("STS-01: returns 'healthy' when backed up 2 days ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(getBackupFreshness(daysAgo(2))).toBe("healthy");
  });

  it("STS-01: returns 'healthy' for exactly 7 days ago (inclusive boundary <=7)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(getBackupFreshness(daysAgo(7))).toBe("healthy");
  });

  it("STS-01: returns 'recommended' for exactly 8 days ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(getBackupFreshness(daysAgo(8))).toBe("recommended");
  });

  it("STS-01: returns 'recommended' for exactly 30 days ago (inclusive boundary <=30)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(getBackupFreshness(daysAgo(30))).toBe("recommended");
  });

  it("STS-01: returns 'overdue' for exactly 31 days ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(getBackupFreshness(daysAgo(31))).toBe("overdue");
  });

  it("STS-01: returns 'overdue' for 60 days ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(getBackupFreshness(daysAgo(60))).toBe("overdue");
  });
});

describe("getBackupAgeLabel", () => {
  it("STS-01: returns 'No backup' when date is null", () => {
    expect(getBackupAgeLabel(null)).toBe("No backup");
  });

  it("STS-01: returns 'Backed up today' for 0 days ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(getBackupAgeLabel(daysAgo(0))).toBe("Backed up today");
  });

  it("STS-01: returns 'Backed up yesterday' for 1 day ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(getBackupAgeLabel(daysAgo(1))).toBe("Backed up yesterday");
  });

  it("STS-01: returns 'Backed up 5 days ago' for 5 days ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(getBackupAgeLabel(daysAgo(5))).toBe("Backed up 5 days ago");
  });
});

describe("BACKUP_FRESHNESS_DOT_CLASS", () => {
  it("STS-02: healthy tier maps to bg-green-500", () => {
    expect(BACKUP_FRESHNESS_DOT_CLASS["healthy"]).toBe("bg-green-500");
  });

  it("STS-02: recommended tier maps to bg-amber-500", () => {
    expect(BACKUP_FRESHNESS_DOT_CLASS["recommended"]).toBe("bg-amber-500");
  });

  it("STS-02: overdue tier maps to bg-orange-500 (not bg-red-500)", () => {
    expect(BACKUP_FRESHNESS_DOT_CLASS["overdue"]).toBe("bg-orange-500");
  });

  it("STS-02: never tier maps to bg-muted-foreground", () => {
    expect(BACKUP_FRESHNESS_DOT_CLASS["never"]).toBe("bg-muted-foreground");
  });
});
