/**
 * Phase 134 HON-04 — PlaybookStats "Link unit" button tests.
 *
 * Requirements tested:
 *   - Button is NOT disabled when wahapediaFactionId is null (removes dead end)
 *   - Button label is "Re-link unit" when hasDatasheetLink is true
 *   - Button label is "Link unit" when hasDatasheetLink is false
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { PlaybookStats } from "@/features/units/PlaybookStats";
import type { UdbMeta } from "@/hooks/useUdbMeta";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const mockSyncMeta: UdbMeta = {
  version: "1.0",
  unit_count: 100,
  last_synced_at: "2026-06-17T00:00:00Z",
};

const baseProps = {
  unitId: 1,
  syncMeta: mockSyncMeta,
  overrideRow: null,
  hasDatasheetLink: false,
  hasMultipleProfiles: false,
  statsEditMode: false,
  onToggleStatsEditMode: vi.fn(),
  onPickerOpen: vi.fn(),
  onDeleteOverride: vi.fn(),
  statValue: () => null,
  setStat: vi.fn(),
  importedStatValue: () => null,
  isStatOverridden: () => false,
  pointsOverrideValue: "",
  onPointsOverrideChange: vi.fn(),
  unitPoints: null,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PlaybookStats — HON-04: "Link unit" button is never disabled', () => {
  it("button is NOT disabled when wahapediaFactionId is null", () => {
    render(
      <PlaybookStats {...baseProps} wahapediaFactionId={null} />,
      { wrapper },
    );
    const btn = screen.getByRole("button", { name: /link unit/i });
    expect(btn).not.toBeDisabled();
  });

  it("button is NOT disabled when wahapediaFactionId is undefined", () => {
    render(
      <PlaybookStats {...baseProps} wahapediaFactionId={undefined} />,
      { wrapper },
    );
    const btn = screen.getByRole("button", { name: /link unit/i });
    expect(btn).not.toBeDisabled();
  });

  it("button is NOT disabled when wahapediaFactionId is a valid id", () => {
    render(
      <PlaybookStats {...baseProps} wahapediaFactionId="SM" />,
      { wrapper },
    );
    const btn = screen.getByRole("button", { name: /link unit/i });
    expect(btn).not.toBeDisabled();
  });
});

describe('PlaybookStats — HON-04: button copy "Link unit" vs "Re-link unit"', () => {
  it('shows "Link unit" when hasDatasheetLink is false', () => {
    render(
      <PlaybookStats {...baseProps} hasDatasheetLink={false} wahapediaFactionId={null} />,
      { wrapper },
    );
    expect(screen.getByRole("button", { name: "Link unit" })).toBeInTheDocument();
  });

  it('shows "Re-link unit" when hasDatasheetLink is true', () => {
    render(
      <PlaybookStats {...baseProps} hasDatasheetLink={true} wahapediaFactionId="SM" />,
      { wrapper },
    );
    expect(screen.getByRole("button", { name: "Re-link unit" })).toBeInTheDocument();
  });

  it('"Re-link unit" button is NOT disabled', () => {
    render(
      <PlaybookStats {...baseProps} hasDatasheetLink={true} wahapediaFactionId="SM" />,
      { wrapper },
    );
    const btn = screen.getByRole("button", { name: "Re-link unit" });
    expect(btn).not.toBeDisabled();
  });
});
