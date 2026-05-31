/**
 * Phase 56 / 107 -- StrategemsTab component tests.
 *
 * Phase 107: stratagems data source (rules.db) eliminated -- inline stub returns empty.
 * Tests verify component renders correctly with the stub (always empty data).
 * The reminders and phase-group tests are preserved as "todo" for when
 * stratagems are re-added to the canonical database.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { StrategemsTab } from "@/features/game-day/StrategemsTab";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFavorites = [
  {
    id: 1,
    rule_id: "r1",
    rule_type: "stratagem" as const,
    rule_name: "Remember to use Oath",
    is_reminder: 1 as const,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
  {
    id: 2,
    rule_id: "r2",
    rule_type: "detachment_ability" as const,
    rule_name: "Some Favorite",
    is_reminder: 0 as const,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
];

vi.mock("@/hooks/useRulesFavorites", () => ({
  useRulesFavorites: () => ({
    data: mockFavorites,
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useBattleLogs", () => ({
  useForgottenRules: () => ({
    data: ["Invulnerable saves", "Overwatch"],
    isLoading: false,
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("StrategemsTab", () => {
  it("shows empty state when no detachment selected", () => {
    render(
      <StrategemsTab detachmentId={null} listId={1} />,
      { wrapper: createWrapper() },
    );
    expect(
      screen.getByText(/no detachment selected/i),
    ).toBeInTheDocument();
  });

  it("shows 'No stratagems found' when detachment selected (data source removed in Phase 107)", () => {
    render(
      <StrategemsTab detachmentId="det-1" listId={1} />,
      { wrapper: createWrapper() },
    );
    expect(
      screen.getByText(/no stratagems found/i),
    ).toBeInTheDocument();
  });

  it("does not render Charge phase header when no stratagems exist", () => {
    render(
      <StrategemsTab detachmentId="det-1" listId={1} />,
      { wrapper: createWrapper() },
    );
    const allText = screen.queryAllByText("Charge");
    expect(allText.length).toBe(0);
  });

  // Phase 107: stratagems data source removed -- these tests are deferred
  // until stratagems are re-added to the canonical database.
  it.todo("renders phase group headers for phases with stratagems");
  it.todo("renders reminders section when is_reminder=1 favorites exist");
  it.todo("renders stratagem names within phase groups");
});
