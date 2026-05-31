/**
 * DX-01 -- VersionInfoCard renders info items with correct labels.
 * Phase 107: simplified to App Version, DB Schema, Data Version.
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

// Mock udb meta hook
vi.mock("@/hooks/useUdbMeta", () => ({
  useUdbMeta: vi.fn(),
}));

import { useSchemaVersions } from "@/hooks/useDiagnostics";
import { useUdbMeta } from "@/hooks/useUdbMeta";
import { VersionInfoCard } from "@/features/data-health/VersionInfoCard";

const mockUseSchemaVersions = vi.mocked(useSchemaVersions);
const mockUseUdbMeta = vi.mocked(useUdbMeta);

beforeEach(() => {
  mockUseSchemaVersions.mockReturnValue({
    data: { hobbyforge: 39 },
    isLoading: false,
  } as ReturnType<typeof useSchemaVersions>);

  mockUseUdbMeta.mockReturnValue({
    data: { version: "2026.05.20", built_at: "2026-05-20T10:00:00Z", game_system: "40k-10th", unit_count: 500, faction_count: 25 },
    isLoading: false,
  } as unknown as ReturnType<typeof useUdbMeta>);
});

describe("VersionInfoCard", () => {
  it("renders all 3 info item labels", () => {
    render(<VersionInfoCard />);

    expect(screen.getByText("App Version")).toBeInTheDocument();
    expect(screen.getByText("DB Schema")).toBeInTheDocument();
    expect(screen.getByText("Data Version")).toBeInTheDocument();
  });

  it("renders app version after getVersion resolves", async () => {
    render(<VersionInfoCard />);

    await waitFor(() => {
      expect(screen.getByText("v0.2.13")).toBeInTheDocument();
    });
  });

  it("renders schema version from hook data", () => {
    render(<VersionInfoCard />);

    expect(screen.getByText("v39")).toBeInTheDocument();
  });

  it("renders udb data version", () => {
    render(<VersionInfoCard />);

    expect(screen.getByText("2026.05.20")).toBeInTheDocument();
  });

  it("shows skeleton when schema versions are loading", () => {
    mockUseSchemaVersions.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useSchemaVersions>);

    render(<VersionInfoCard />);

    expect(screen.getByText("DB Schema")).toBeInTheDocument();
    expect(screen.queryByText("v39")).not.toBeInTheDocument();
  });

  it("shows 'Not imported' when udb meta is null", () => {
    mockUseUdbMeta.mockReturnValue({
      data: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useUdbMeta>);

    render(<VersionInfoCard />);

    expect(screen.getByText("Not imported")).toBeInTheDocument();
  });
});
