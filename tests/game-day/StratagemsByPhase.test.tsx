/**
 * Phase 120 -- StrategemsTab component tests.
 *
 * Phase 120: wired to useStratagemsByDetachment from @/hooks/useGameData.
 * Mock must target @/hooks/useGameData, not a local stub.
 * Tests verify phase grouping (with normalizePhase), reminders section,
 * and the no-detachment / empty-data guard states.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { StrategemsTab } from "@/features/game-day/StrategemsTab";
import type { UdbStratagem } from "@/types/gameData";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Stratagems with Wahapedia-style phase names (including " phase" suffix)
const mockStratagems: UdbStratagem[] = [
  {
    id: "s-1",
    faction_id: "SM",
    detachment_id: "det-1",
    name: "Strike First",
    type: null,
    cp_cost: 1,
    turn: "Your turn",
    phase: "Fight phase",
    description: "<b>Description</b>",
  },
  {
    id: "s-2",
    faction_id: "SM",
    detachment_id: "det-1",
    name: "Rapid Advance",
    type: null,
    cp_cost: 2,
    turn: null,
    phase: "Movement phase",
    description: "Move further",
  },
  {
    id: "s-3",
    faction_id: null,
    detachment_id: null,
    name: "Universal Strat",
    type: null,
    cp_cost: 1,
    turn: null,
    phase: "Command phase",
    description: "Universal",
  },
  {
    id: "s-4",
    faction_id: "SM",
    detachment_id: "det-1",
    name: "No Phase Strat",
    type: null,
    cp_cost: 1,
    turn: null,
    phase: null,
    description: "No phase",
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
    rule_name: "Some Non-Reminder Favorite",
    is_reminder: 0 as const,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
];

vi.mock("@/hooks/useGameData", () => ({
  useStratagemsByDetachment: vi.fn(),
}));

vi.mock("@/hooks/useRulesFavorites", () => ({
  useRulesFavorites: () => ({
    data: mockFavorites,
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useBattleLogs", () => ({
  useForgottenRules: () => ({
    data: [],
    isLoading: false,
  }),
}));

vi.mock("@/features/game-day/gameDayStore", () => ({
  useGameDayStore: () => vi.fn(),
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
  it("shows empty state when no detachment selected", async () => {
    const { useStratagemsByDetachment } = await import("@/hooks/useGameData");
    vi.mocked(useStratagemsByDetachment).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as unknown as ReturnType<typeof useStratagemsByDetachment>);

    render(
      <StrategemsTab detachmentId={null} listId={1} />,
      { wrapper: createWrapper() },
    );
    expect(
      screen.getByText(/no detachment selected/i),
    ).toBeInTheDocument();
  });

  it("shows loading skeleton while useStratagemsByDetachment is loading", async () => {
    const { useStratagemsByDetachment } = await import("@/hooks/useGameData");
    vi.mocked(useStratagemsByDetachment).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useStratagemsByDetachment>);

    const { container } = render(
      <StrategemsTab detachmentId="det-1" listId={1} />,
      { wrapper: createWrapper() },
    );
    // Loading state renders Skeleton elements, not phase headers
    expect(container.querySelector("[data-slot='skeleton']")).toBeInTheDocument();
    expect(screen.queryByText("Fight")).not.toBeInTheDocument();
  });

  it("shows 'No stratagems found' when hook returns empty array", async () => {
    const { useStratagemsByDetachment } = await import("@/hooks/useGameData");
    vi.mocked(useStratagemsByDetachment).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useStratagemsByDetachment>);

    render(
      <StrategemsTab detachmentId="det-1" listId={1} />,
      { wrapper: createWrapper() },
    );
    expect(
      screen.getByText(/no stratagems found for this detachment/i),
    ).toBeInTheDocument();
  });

  it("renders phase group headers for phases with stratagems — normalizes ' phase' suffix", async () => {
    const { useStratagemsByDetachment } = await import("@/hooks/useGameData");
    vi.mocked(useStratagemsByDetachment).mockReturnValue({
      data: mockStratagems,
      isLoading: false,
    } as unknown as ReturnType<typeof useStratagemsByDetachment>);

    render(
      <StrategemsTab detachmentId="det-1" listId={1} />,
      { wrapper: createWrapper() },
    );

    // "Fight phase" -> "Fight" group header must appear
    expect(screen.getByText("Fight")).toBeInTheDocument();
    // "Movement phase" -> "Movement"
    expect(screen.getByText("Movement")).toBeInTheDocument();
    // "Command phase" -> "Command"
    expect(screen.getByText("Command")).toBeInTheDocument();
    // null phase -> "Other"
    expect(screen.getByText("Other")).toBeInTheDocument();
  });

  it("renders stratagem names within phase groups", async () => {
    const { useStratagemsByDetachment } = await import("@/hooks/useGameData");
    vi.mocked(useStratagemsByDetachment).mockReturnValue({
      data: mockStratagems,
      isLoading: false,
    } as unknown as ReturnType<typeof useStratagemsByDetachment>);

    render(
      <StrategemsTab detachmentId="det-1" listId={1} />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByText("Strike First")).toBeInTheDocument();
    expect(screen.getByText("Rapid Advance")).toBeInTheDocument();
    expect(screen.getByText("Universal Strat")).toBeInTheDocument();
    expect(screen.getByText("No Phase Strat")).toBeInTheDocument();
  });

  it("renders reminders section when is_reminder=1 favorites exist", async () => {
    const { useStratagemsByDetachment } = await import("@/hooks/useGameData");
    vi.mocked(useStratagemsByDetachment).mockReturnValue({
      data: mockStratagems,
      isLoading: false,
    } as unknown as ReturnType<typeof useStratagemsByDetachment>);

    render(
      <StrategemsTab detachmentId="det-1" listId={1} />,
      { wrapper: createWrapper() },
    );

    // The reminder with is_reminder=1 should appear by name
    expect(screen.getByText("Remember to use Oath")).toBeInTheDocument();
    // Non-reminder favorite (is_reminder=0) must NOT appear in reminders section
    expect(screen.queryByText("Some Non-Reminder Favorite")).not.toBeInTheDocument();
  });

  it("does not render Shooting phase group when no stratagems exist for that phase", async () => {
    const { useStratagemsByDetachment } = await import("@/hooks/useGameData");
    // mockStratagems has no "Shooting phase" stratagems
    vi.mocked(useStratagemsByDetachment).mockReturnValue({
      data: mockStratagems,
      isLoading: false,
    } as unknown as ReturnType<typeof useStratagemsByDetachment>);

    render(
      <StrategemsTab detachmentId="det-1" listId={1} />,
      { wrapper: createWrapper() },
    );

    // "Shooting" phase header should not be present since no stratagems map to it
    expect(screen.queryByText("Shooting")).not.toBeInTheDocument();
  });
});
