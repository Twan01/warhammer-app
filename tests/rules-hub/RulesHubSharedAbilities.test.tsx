/**
 * Phase 134 — HON-03: RulesHubPage Shared Abilities tab tests.
 *
 * Verifies that the Shared Abilities tab:
 *   (1) Renders real ability names when useDetachmentAbilities returns data.
 *   (2) Shows the honest no-data empty state when hook returns [] and search is empty.
 *   (3) Shows the search-filtered empty state when data is present but search has no match.
 *
 * These tests are written against the post-stub-removal behavior; they are RED until
 * Task 2 swaps the stub for useDetachmentAbilities in RulesHubPage.tsx.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ReactNode } from "react";
import type { UdbDetachmentAbilityWithDetachment } from "@/types/gameData";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock("@/hooks/useDatasheet", () => ({
  useWahapediaFactions: vi.fn(() => ({
    data: [{ id: "SM", name: "Space Marines" }],
  })),
  useDatasheetsByFactionWithPoints: vi.fn(() => ({ data: [], isLoading: false })),
  RULES_SYNC_META_KEY: ["rules-sync-meta"],
}));

vi.mock("@/hooks/useUdbMeta", () => ({
  useUdbMeta: vi.fn(() => ({
    data: { built_at: "2026-05-09T10:00:00Z", version: "1.0" },
  })),
}));

vi.mock("@/hooks/useRulesFavorites", () => ({
  useRulesFavorites: vi.fn(() => ({ data: [] })),
  useUpsertRulesFavorite: () => ({ mutate: vi.fn() }),
  useDeleteRulesFavorite: () => ({ mutate: vi.fn() }),
}));

vi.mock("@/hooks/useRulesNotes", () => ({
  useRulesNotes: vi.fn(() => ({ data: [] })),
  useUpsertRulesNote: () => ({ mutate: vi.fn() }),
}));

vi.mock("@/hooks/useGameData", () => ({
  useStratagemsByFaction: vi.fn(() => ({ data: [], isLoading: false })),
  useDetachmentsByFaction: vi.fn(() => ({ data: [], isLoading: false })),
  useDetachmentAbilities: vi.fn(() => ({ data: [], isLoading: false })),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const smAbilities: UdbDetachmentAbilityWithDetachment[] = [
  {
    id: "da-sm-1",
    detachment_id: "det-gladius",
    faction_id: "SM",
    name: "Oaths of Moment",
    description: "<b>Once per battle</b>, this unit can reroll its charge roll.",
    detachment_name: "Gladius Task Force",
  },
  {
    id: "da-sm-2",
    detachment_id: "det-gladius",
    faction_id: "SM",
    name: "Tactical Discipline",
    description: "Add 1 to hit rolls for ranged attacks.",
    detachment_name: "Gladius Task Force",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Test setup: reset Zustand store between tests
// ---------------------------------------------------------------------------

import { useRulesHubFilters } from "@/features/rules-hub/rulesHubFilters";
import { RulesHubPage } from "@/features/rules-hub/RulesHubPage";

beforeEach(() => {
  useRulesHubFilters.setState({
    selectedFactionId: null,
    searchText: "",
    phaseFilter: null,
    cpFilter: null,
  });
});

// ---------------------------------------------------------------------------
// HON-03 Tests
// ---------------------------------------------------------------------------

describe("RulesHubPage — HON-03: Shared Abilities tab renders real data", () => {
  it("renders a real ability name when useDetachmentAbilities returns data for the selected faction", async () => {
    const user = userEvent.setup();
    const { useDetachmentAbilities } = await import("@/hooks/useGameData");
    vi.mocked(useDetachmentAbilities).mockReturnValue({
      data: smAbilities,
      isLoading: false,
    } as unknown as ReturnType<typeof useDetachmentAbilities>);

    // Set faction directly via Zustand store
    useRulesHubFilters.setState({ selectedFactionId: "SM" });

    render(<RulesHubPage />, { wrapper: makeWrapper() });

    // Click the Shared Abilities tab
    const tab = screen.getByRole("tab", { name: /shared abilities/i });
    await user.click(tab);

    // Real ability name must be present (proves real data, not stub)
    expect(screen.getByText("Oaths of Moment")).toBeInTheDocument();
  });
});

describe("RulesHubPage — HON-03: Shared Abilities tab honest no-data empty state", () => {
  it("shows the no-data empty state when hook returns empty array and search is empty", async () => {
    const user = userEvent.setup();
    const { useDetachmentAbilities } = await import("@/hooks/useGameData");
    vi.mocked(useDetachmentAbilities).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useDetachmentAbilities>);

    useRulesHubFilters.setState({ selectedFactionId: "SM", searchText: "" });

    render(<RulesHubPage />, { wrapper: makeWrapper() });

    const tab = screen.getByRole("tab", { name: /shared abilities/i });
    await user.click(tab);

    expect(
      screen.getByText("No shared abilities for this faction in the canonical database."),
    ).toBeInTheDocument();
  });
});

describe("RulesHubPage — HON-03: Shared Abilities tab search-filtered empty state", () => {
  it("shows the search-filtered empty state when data is present but search matches nothing", async () => {
    const user = userEvent.setup();
    const { useDetachmentAbilities } = await import("@/hooks/useGameData");
    vi.mocked(useDetachmentAbilities).mockReturnValue({
      data: smAbilities,
      isLoading: false,
    } as unknown as ReturnType<typeof useDetachmentAbilities>);

    useRulesHubFilters.setState({
      selectedFactionId: "SM",
      searchText: "zzz-no-match",
    });

    render(<RulesHubPage />, { wrapper: makeWrapper() });

    const tab = screen.getByRole("tab", { name: /shared abilities/i });
    await user.click(tab);

    expect(
      screen.getByText("No shared abilities match your search."),
    ).toBeInTheDocument();
  });
});
