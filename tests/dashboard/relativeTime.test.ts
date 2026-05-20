/**
 * DASH-06 — Relative time formatter (manual implementation per UI-SPEC).
 * Uses vi.setSystemTime() for deterministic time math without relying
 * on real Date.now().
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { formatRelativeTime } from "@/features/dashboard/relativeTime";

// Anchor "now" at a fixed UTC instant so all assertions are deterministic.
const NOW = new Date("2026-05-01T12:00:00Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
});

/** Helper: SQLite datetime string (space separator, no Z) for `minutesAgo` minutes before NOW. */
function ago(minutes: number): string {
  const d = new Date(NOW.getTime() - minutes * 60_000);
  // YYYY-MM-DD HH:MM:SS in UTC — matches SQLite datetime('now') output
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

describe("DASH-06 formatRelativeTime — minutes range (<1h)", () => {
  it("returns 'just now' for 'just now'", () => {
    expect(formatRelativeTime(ago(0))).toBe("just now");
  });
  it("returns '30m' for 30 minutes ago", () => {
    expect(formatRelativeTime(ago(30))).toBe("30m");
  });
  it("returns '59m' at the upper boundary", () => {
    expect(formatRelativeTime(ago(59))).toBe("59m");
  });
});

describe("DASH-06 formatRelativeTime — hours range (<24h)", () => {
  it("returns '1h' at the lower boundary (60m)", () => {
    expect(formatRelativeTime(ago(60))).toBe("1h");
  });
  it("returns '5h' for 5 hours ago", () => {
    expect(formatRelativeTime(ago(5 * 60))).toBe("5h");
  });
  it("returns '23h' at the upper boundary", () => {
    expect(formatRelativeTime(ago(23 * 60))).toBe("23h");
  });
});

describe("DASH-06 formatRelativeTime — days range (<7d)", () => {
  it("returns '1d' at the lower boundary (24h)", () => {
    expect(formatRelativeTime(ago(24 * 60))).toBe("1d");
  });
  it("returns '3d' for 3 days ago", () => {
    expect(formatRelativeTime(ago(3 * 24 * 60))).toBe("3d");
  });
  it("returns '6d' at the upper boundary", () => {
    expect(formatRelativeTime(ago(6 * 24 * 60))).toBe("6d");
  });
});

describe("DASH-06 formatRelativeTime — weeks range (<4w)", () => {
  it("returns '1w' at the lower boundary (7d)", () => {
    expect(formatRelativeTime(ago(7 * 24 * 60))).toBe("1w");
  });
  it("returns '2w' for 2 weeks ago", () => {
    expect(formatRelativeTime(ago(14 * 24 * 60))).toBe("2w");
  });
  it("returns '3w' at the upper boundary", () => {
    expect(formatRelativeTime(ago(21 * 24 * 60))).toBe("3w");
  });
});

describe("DASH-06 formatRelativeTime — months range (>=4w)", () => {
  it("returns '1mo' at the lower boundary (4w)", () => {
    expect(formatRelativeTime(ago(28 * 24 * 60))).toBe("1mo");
  });
  it("returns '2mo' for 8 weeks ago", () => {
    expect(formatRelativeTime(ago(56 * 24 * 60))).toBe("2mo");
  });
});

describe("DASH-06 formatRelativeTime — SQLite datetime normalization (Pitfall 5)", () => {
  it("parses 'YYYY-MM-DD HH:MM:SS' (space separator, no Z) as UTC", () => {
    // 1 hour ago in UTC, expressed in SQLite format
    const sqliteFormat = ago(60);
    expect(sqliteFormat).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(sqliteFormat).not.toContain("T");
    expect(sqliteFormat).not.toContain("Z");
    // Must still produce '1h' — proves we normalized correctly
    expect(formatRelativeTime(sqliteFormat)).toBe("1h");
  });
});
