/**
 * Phase 56 — StrategemsTab component tests.
 *
 * Covers GAME-02 (phase grouping) and GAME-07 (reminders pinned at top).
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { StrategemsTab } from "@/features/game-day/StrategemsTab";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockStratagems = [
  {
    id: "s1",
    faction_id: "SM",
    name: "Honour the Chapter",
    type: null,
    cp_cost: "1",
    legend: "A test legend",
    turn: null,
    phase: "Fight",
    detachment: null,
    detachment_id: "det-1",
    description: "Re-roll melee hits.",
  },
  {
    id: "s2",
    faction_id: "SM",
    name: "Adaptive Strategy",
    type: null,
    cp_cost: "1",
    legend: null,
    turn: null,
    phase: "Command",
    detachment: null,
    detachment_id: "det-1",
    description: "Choose a combat doctrine.",
  },
  {
    id: "s3",
    faction_id: "SM",
    name: "Rapid Ingress",
    type: null,
    cp_cost: "1",
    legend: null,
    turn: null,
    phase: "Movement",
    detachment: null,
    detachment_id: "det-1",
    description: "Set up a unit from Reserves.",
  },
  {
    id: "s4",
    faction_id: "SM",
    name: "Free Strat",
    type: null,
    cp_cost: "0",
    legend: null,
    turn: null,
    phase: "Shooting",
    detachment: null,
    detachment_id: "det-1",
    description: "Does something free.",
  },
];

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

vi.mock("@/hooks/useRulesExtended", () => ({
  useStratagemsByDetachment: (detachmentId: string | undefined) => ({
    data: detachmentId ? mockStratagems : [],
    isLoading: false,
  }),
}));

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
  it("renders phase group headers for phases with stratagems", () => {
    render(
      <StrategemsTab detachmentId="det-1" listId={1} />,
      { wrapper: createWrapper() },
    );
    // Phase text appears both in group headers and in stratagem card badges.
    // Check that at least one element with each phase name exists.
    expect(screen.getAllByText("Command").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Movement").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Shooting").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Fight").length).toBeGreaterThanOrEqual(1);
  });

  it("does not render Charge phase header when no stratagems in that phase", () => {
    render(
      <StrategemsTab detachmentId="det-1" listId={1} />,
      { wrapper: createWrapper() },
    );
    // "Charge" as a phase group header should not appear since no stratagems have that phase
    const allText = screen.queryAllByText("Charge");
    // Filter to only phase group headers (not badges inside stratagem cards)
    expect(allText.length).toBe(0);
  });

  it("renders reminders section when is_reminder=1 favorites exist", () => {
    render(
      <StrategemsTab detachmentId="det-1" listId={1} />,
      { wrapper: createWrapper() },
    );
    expect(screen.getByText("Reminders")).toBeInTheDocument();
    expect(screen.getByText("Remember to use Oath")).toBeInTheDocument();
  });

  it("does not render non-reminder favorites in reminders section", () => {
    render(
      <StrategemsTab detachmentId="det-1" listId={1} />,
      { wrapper: createWrapper() },
    );
    expect(screen.queryByText("Some Favorite")).not.toBeInTheDocument();
  });

  it("shows empty state when no detachment selected", () => {
    render(
      <StrategemsTab detachmentId={null} listId={1} />,
      { wrapper: createWrapper() },
    );
    expect(
      screen.getByText(/no detachment selected/i),
    ).toBeInTheDocument();
  });

  it("renders stratagem names within phase groups", () => {
    render(
      <StrategemsTab detachmentId="det-1" listId={1} />,
      { wrapper: createWrapper() },
    );
    expect(screen.getByText("Honour the Chapter")).toBeInTheDocument();
    expect(screen.getByText("Adaptive Strategy")).toBeInTheDocument();
    expect(screen.getByText("Rapid Ingress")).toBeInTheDocument();
  });
});
