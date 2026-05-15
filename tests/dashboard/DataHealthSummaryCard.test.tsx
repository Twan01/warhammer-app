/**
 * Phase 78 — DataHealthSummaryCard component behavioral tests
 * (Task 78-02-03, Req GD-03/DB-03).
 *
 * Verifies:
 * - Renders sync dot, warning count, backup age in horizontal row
 * - "View full report" link to /data-health
 * - Loading skeletons for sync and flags
 * - Warning count 0 shows "No warnings"
 * - Warning count > 0 shows "{N} warning(s)"
 * - Backup status: "No backup" when null, date-based label when set
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { DiagnosticFlag } from "@/db/queries/diagnostics";
import type { BackupStatus } from "@/hooks/useDiagnostics";

// Controllable mock state
let mockSyncMeta: { last_sync_at: string | null } | null = null;
let mockSyncLoading = false;
let mockFlags: DiagnosticFlag[] | undefined = [];
let mockFlagsLoading = false;
let mockBackup: BackupStatus | null = null;

vi.mock("@/hooks/useDatasheet", () => ({
  useRulesSyncMeta: () => ({ data: mockSyncMeta, isLoading: mockSyncLoading }),
}));

vi.mock("@/hooks/useDiagnostics", () => ({
  useDiagnosticFlags: () => ({ data: mockFlags, isLoading: mockFlagsLoading }),
  useBackupStatus: () => mockBackup,
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, className }: { to: string; children: React.ReactNode; className?: string }) => (
    <a href={to} className={className}>{children}</a>
  ),
}));

import { DataHealthSummaryCard } from "@/features/dashboard/DataHealthSummaryCard";

beforeEach(() => {
  vi.clearAllMocks();
  mockSyncMeta = null;
  mockSyncLoading = false;
  mockFlags = [];
  mockFlagsLoading = false;
  mockBackup = null;
});

describe("DataHealthSummaryCard — sync dot and label", () => {
  it("renders sync label 'Never synced' when no sync has occurred", () => {
    mockSyncMeta = null;
    render(<DataHealthSummaryCard />);
    expect(screen.getByText("Never synced")).toBeInTheDocument();
  });

  it("renders sync label with days when syncMeta has a recent date", () => {
    // Use a date that is "today" so label reads "Synced today"
    const today = new Date().toISOString();
    mockSyncMeta = { last_sync_at: today };
    render(<DataHealthSummaryCard />);
    expect(screen.getByText("Synced today")).toBeInTheDocument();
  });

  it("renders a colored dot element for sync freshness", () => {
    mockSyncMeta = { last_sync_at: new Date().toISOString() };
    render(<DataHealthSummaryCard />);
    // fresh → bg-green-500 dot
    const dots = document.querySelectorAll(".bg-green-500");
    expect(dots.length).toBeGreaterThan(0);
  });

  it("renders sync loading skeleton when syncLoading is true", () => {
    mockSyncLoading = true;
    render(<DataHealthSummaryCard />);
    const skeletons = document.querySelectorAll("[class*='animate-pulse']");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe("DataHealthSummaryCard — warning count", () => {
  it("renders 'No warnings' when diagnostic flags array is empty", () => {
    mockFlags = [];
    render(<DataHealthSummaryCard />);
    expect(screen.getByText("No warnings")).toBeInTheDocument();
  });

  it("renders warning count when flags exist with non-zero counts", () => {
    mockFlags = [
      { type: "orphaned_progress", count: 3, description: "Orphaned rows", severity: "warning" },
      { type: "ambiguous_points", count: 2, description: "Ambiguous matches", severity: "warning" },
    ] as DiagnosticFlag[];
    render(<DataHealthSummaryCard />);
    expect(screen.getByText("5 warnings")).toBeInTheDocument();
  });

  it("renders singular '1 warning' (not 'warnings') for a single warning", () => {
    mockFlags = [{ type: "orphaned_progress", count: 1, description: "Orphaned rows", severity: "warning" }] as DiagnosticFlag[];
    render(<DataHealthSummaryCard />);
    expect(screen.getByText("1 warning")).toBeInTheDocument();
  });

  it("renders flags loading skeleton when flagsLoading is true", () => {
    mockFlagsLoading = true;
    mockFlags = undefined;
    render(<DataHealthSummaryCard />);
    const skeletons = document.querySelectorAll("[class*='animate-pulse']");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe("DataHealthSummaryCard — backup status", () => {
  it("renders 'No backup' when backup status is null", () => {
    mockBackup = null;
    render(<DataHealthSummaryCard />);
    expect(screen.getByText("No backup")).toBeInTheDocument();
  });

  it("renders 'Backed up today' when backup date is today", () => {
    mockBackup = { date: new Date().toISOString(), path: "/backup.db", success: true };
    render(<DataHealthSummaryCard />);
    expect(screen.getByText("Backed up today")).toBeInTheDocument();
  });

  it("renders 'Backed up yesterday' for a 1-day-old backup", () => {
    const yesterday = new Date(Date.now() - 1000 * 60 * 60 * 25); // 25 hours ago
    mockBackup = { date: yesterday.toISOString(), path: "/backup.db", success: true };
    render(<DataHealthSummaryCard />);
    expect(screen.getByText("Backed up yesterday")).toBeInTheDocument();
  });
});

describe("DataHealthSummaryCard — navigation link", () => {
  it("renders 'View full report' link pointing to /data-health", () => {
    render(<DataHealthSummaryCard />);
    const link = screen.getByText("View full report");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "/data-health");
  });
});
