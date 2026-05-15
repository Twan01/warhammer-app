/**
 * DX-01 -- VersionInfoCard renders all 5 info items with correct labels.
 *
 * Verifies: App Version, DB Schema, Rules Schema, Last Sync, Sync Errors
 * are all rendered with values from their respective hooks.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// Mock Tauri getVersion
vi.mock("@tauri-apps/api/app", () => ({
  getVersion: vi.fn(() => Promise.resolve("0.2.13")),
}));

// Mock diagnostics hooks
vi.mock("@/hooks/useDiagnostics", () => ({
  useSchemaVersions: vi.fn(),
}));

// Mock sync meta hook
vi.mock("@/hooks/useDatasheet", () => ({
  useRulesSyncMeta: vi.fn(),
}));

// Mock sync errors hook
vi.mock("@/hooks/useSyncErrors", () => ({
  useRulesSyncErrors: vi.fn(),
}));

// Mock syncFreshness
vi.mock("@/lib/syncFreshness", () => ({
  getSyncFreshness: vi.fn(() => "fresh"),
  getSyncAgeLabel: vi.fn(() => "2 hours ago"),
  FRESHNESS_DOT_CLASS: {
    fresh: "bg-green-500",
    aging: "bg-yellow-500",
    stale: "bg-red-500",
    never: "bg-gray-500",
  },
}));

import { useSchemaVersions } from "@/hooks/useDiagnostics";
import { useRulesSyncMeta } from "@/hooks/useDatasheet";
import { useRulesSyncErrors } from "@/hooks/useSyncErrors";
import { VersionInfoCard } from "@/features/data-health/VersionInfoCard";

const mockUseSchemaVersions = vi.mocked(useSchemaVersions);
const mockUseRulesSyncMeta = vi.mocked(useRulesSyncMeta);
const mockUseRulesSyncErrors = vi.mocked(useRulesSyncErrors);

beforeEach(() => {
  mockUseSchemaVersions.mockReturnValue({
    data: { hobbyforge: 8, rules: 2 },
    isLoading: false,
  } as ReturnType<typeof useSchemaVersions>);

  mockUseRulesSyncMeta.mockReturnValue({
    data: { last_sync_at: "2026-05-15T10:00:00Z", total_datasheets: 100 },
    isLoading: false,
  } as ReturnType<typeof useRulesSyncMeta>);

  mockUseRulesSyncErrors.mockReturnValue({
    data: [],
    isLoading: false,
  } as ReturnType<typeof useRulesSyncErrors>);
});

describe("VersionInfoCard", () => {
  it("renders all 5 info item labels", async () => {
    render(<VersionInfoCard />);

    expect(screen.getByText("App Version")).toBeInTheDocument();
    expect(screen.getByText("DB Schema")).toBeInTheDocument();
    expect(screen.getByText("Rules Schema")).toBeInTheDocument();
    expect(screen.getByText("Last Sync")).toBeInTheDocument();
    expect(screen.getByText("Sync Errors")).toBeInTheDocument();
  });

  it("renders app version after getVersion resolves", async () => {
    render(<VersionInfoCard />);

    await waitFor(() => {
      expect(screen.getByText("v0.2.13")).toBeInTheDocument();
    });
  });

  it("renders schema versions from hook data", () => {
    render(<VersionInfoCard />);

    expect(screen.getByText("v8")).toBeInTheDocument();
    expect(screen.getByText("v2")).toBeInTheDocument();
  });

  it("renders sync age label for Last Sync", () => {
    render(<VersionInfoCard />);

    expect(screen.getByText("2 hours ago")).toBeInTheDocument();
  });

  it("renders sync error count with badge", () => {
    render(<VersionInfoCard />);

    // 0 errors
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("shows destructive badge when sync errors > 0", () => {
    mockUseRulesSyncErrors.mockReturnValue({
      data: [
        { id: 1, table_name: "test", error_message: "fail", created_at: "2026-01-01" },
        { id: 2, table_name: "test2", error_message: "fail2", created_at: "2026-01-01" },
      ],
      isLoading: false,
    } as ReturnType<typeof useRulesSyncErrors>);

    render(<VersionInfoCard />);

    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows skeleton when schema versions are loading", () => {
    mockUseSchemaVersions.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useSchemaVersions>);

    const { container } = render(<VersionInfoCard />);

    // Labels should still be present
    expect(screen.getByText("DB Schema")).toBeInTheDocument();
    expect(screen.getByText("Rules Schema")).toBeInTheDocument();

    // But values should not be rendered (skeletons instead)
    expect(screen.queryByText("v8")).not.toBeInTheDocument();
  });
});
