/**
 * Phase 53 Plan 01 — SyncStatusCard tests.
 *
 * RULES-01: renders last sync date (ageLabel text), row counts, source version, freshness dot
 * RULES-03: renders error history collapsible when errors present; hidden section when empty
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ReactNode } from "react";

// Mock hooks before importing the component
vi.mock("@/hooks/useDatasheet", () => ({
  useRulesSyncMeta: vi.fn(() => ({
    data: {
      id: 1,
      last_sync_at: "2026-05-09T10:00:00Z",
      wahapedia_version: "20260509",
      factions_count: 30,
      sources_count: 5,
      datasheets_count: 1200,
      models_count: 800,
      abilities_count: 500,
      keywords_count: 600,
      wargear_count: 400,
      shared_abilities_count: 100,
      stratagems_count: 300,
      detachments_count: 50,
      detachment_abilities_count: 200,
    },
  })),
  useWahapediaFactionId: vi.fn(() => ({ data: undefined })),
  RULES_SYNC_META_KEY: ["rules-sync-meta"],
}));

vi.mock("@/hooks/useRulesSync", () => ({
  useRulesSync: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

vi.mock("@/hooks/useSyncErrors", () => ({
  useRulesSyncErrors: vi.fn(() => ({ data: [] })),
}));

import { SyncStatusCard } from "@/features/rules-hub/SyncStatusCard";
import { useRulesSyncErrors } from "@/hooks/useSyncErrors";

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <TooltipProvider>{children}</TooltipProvider>
      </QueryClientProvider>
    );
  };
}

const noopDiff = null;
const noop = () => {};

beforeEach(() => {
  vi.clearAllMocks();
  // Reset to empty errors by default
  vi.mocked(useRulesSyncErrors).mockReturnValue({ data: [] } as unknown as ReturnType<typeof useRulesSyncErrors>);
});

describe("SyncStatusCard — RULES-01: freshness and row counts", () => {
  it("renders the freshness dot element", () => {
    render(
      <SyncStatusCard lastSyncDiff={noopDiff} onSyncComplete={noop} />,
      { wrapper: makeWrapper() },
    );
    // Freshness dot is a span with rounded-full class
    const dots = document.querySelectorAll(".rounded-full");
    expect(dots.length).toBeGreaterThan(0);
  });

  it("renders the age label text", () => {
    render(
      <SyncStatusCard lastSyncDiff={noopDiff} onSyncComplete={noop} />,
      { wrapper: makeWrapper() },
    );
    // The mock last_sync_at is 2026-05-09, current date is 2026-05-10 → 1 day ago
    expect(screen.getByText(/synced yesterday/i)).toBeDefined();
  });

  it("renders row counts: datasheets, stratagems, detachments", () => {
    render(
      <SyncStatusCard lastSyncDiff={noopDiff} onSyncComplete={noop} />,
      { wrapper: makeWrapper() },
    );
    expect(screen.getByText("1200")).toBeDefined();
    expect(screen.getByText(/datasheets/i)).toBeDefined();
    expect(screen.getByText("300")).toBeDefined();
    expect(screen.getByText(/stratagems/i)).toBeDefined();
    expect(screen.getByText("50")).toBeDefined();
    expect(screen.getByText(/detachments/i)).toBeDefined();
  });

  it("renders the wahapedia version badge", () => {
    render(
      <SyncStatusCard lastSyncDiff={noopDiff} onSyncComplete={noop} />,
      { wrapper: makeWrapper() },
    );
    expect(screen.getByText(/20260509/)).toBeDefined();
  });
});

describe("SyncStatusCard — RULES-03: error history collapsible", () => {
  it("shows zero error count when no errors", () => {
    render(
      <SyncStatusCard lastSyncDiff={noopDiff} onSyncComplete={noop} />,
      { wrapper: makeWrapper() },
    );
    expect(screen.getByText(/sync errors \(0\)/i)).toBeDefined();
  });

  it("shows error count when errors are present", () => {
    vi.mocked(useRulesSyncErrors).mockReturnValue({
      data: [
        {
          id: 1,
          occurred_at: "2026-05-08T12:00:00Z",
          error_type: "fetch_failed",
          message: "Network error",
          csv_file: "Factions.csv",
        },
      ],
    } as unknown as ReturnType<typeof useRulesSyncErrors>);

    render(
      <SyncStatusCard lastSyncDiff={noopDiff} onSyncComplete={noop} />,
      { wrapper: makeWrapper() },
    );
    expect(screen.getByText(/sync errors \(1\)/i)).toBeDefined();
  });

  it("reveals error list when collapsible trigger is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(useRulesSyncErrors).mockReturnValue({
      data: [
        {
          id: 1,
          occurred_at: "2026-05-08T12:00:00Z",
          error_type: "fetch_failed",
          message: "Network error",
          csv_file: "Factions.csv",
        },
      ],
    } as unknown as ReturnType<typeof useRulesSyncErrors>);

    render(
      <SyncStatusCard lastSyncDiff={noopDiff} onSyncComplete={noop} />,
      { wrapper: makeWrapper() },
    );

    const trigger = screen.getByRole("button", { name: /sync errors/i });
    await user.click(trigger);
    // After click, content is in DOM (Radix Collapsible reveals it)
    expect(screen.getByText(/Network error/, { exact: false })).toBeDefined();
  });
});
