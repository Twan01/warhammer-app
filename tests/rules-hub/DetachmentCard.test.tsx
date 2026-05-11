/**
 * Phase 53 Plan 03 — DetachmentCard tests.
 * Phase 55 Plan 01 — Annotation controls tests (PLAY-01, PLAY-02, PLAY-04).
 *
 * RULES-06: renders detachment name and abilities count badge
 * RULES-06: when expanded, renders ability names
 * RULES-06: handles empty abilities array gracefully
 * PLAY-04: applies border-l-primary when favoritesMap has a matching entry
 * PLAY-01/02: shows annotation controls for each ability when expanded
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { RwDetachment, RwDetachmentAbility } from "@/types/datasheet";
import type { UseQueryResult } from "@tanstack/react-query";
import type { RulesFavorite } from "@/types/rulesFavorite";
import type { RulesNote } from "@/types/rulesNote";
import { useDetachmentAbilitiesByDetachment } from "@/hooks/useRulesExtended";

vi.mock("@/hooks/useRulesExtended", () => ({
  useDetachmentAbilitiesByDetachment: vi.fn(),
}));

vi.mock("@/hooks/useRulesFavorites", () => ({
  useUpsertRulesFavorite: () => ({ mutate: vi.fn() }),
  useDeleteRulesFavorite: () => ({ mutate: vi.fn() }),
}));

vi.mock("@/hooks/useRulesNotes", () => ({
  useUpsertRulesNote: () => ({ mutate: vi.fn() }),
}));

const mockUseDetachmentAbilitiesByDetachment = vi.mocked(useDetachmentAbilitiesByDetachment);

function makeQueryResult<T>(data: T, isLoading = false): UseQueryResult<T> {
  return {
    data,
    isLoading,
    isError: false,
    error: null,
    status: isLoading ? "pending" : "success",
    isPending: isLoading,
    isSuccess: !isLoading,
    isFetching: false,
    isRefetching: false,
    isStale: false,
    isPlaceholderData: false,
    isFetchedAfterMount: true,
    isFetched: true,
    isLoadingError: false,
    isRefetchError: false,
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    fetchStatus: "idle",
    refetch: vi.fn(),
    promise: Promise.resolve(data),
  } as unknown as UseQueryResult<T>;
}

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const mockDetachment: RwDetachment = {
  id: "det-1",
  faction_id: "SM",
  name: "Gladius Task Force",
  legend: null,
  type: null,
};

const mockAbilities: RwDetachmentAbility[] = [
  {
    id: "a1",
    faction_id: "SM",
    name: "Combat Doctrines",
    legend: "Tactical flexibility",
    description: "Some ability text about tactics",
    detachment: "Gladius Task Force",
    detachment_id: "det-1",
  },
  {
    id: "a2",
    faction_id: "SM",
    name: "Rapid Assault",
    legend: null,
    description: "Advance and shoot without penalty",
    detachment: "Gladius Task Force",
    detachment_id: "det-1",
  },
  {
    id: "a3",
    faction_id: "SM",
    name: "Iron Will",
    legend: "Stubborn defenders",
    description: null,
    detachment: "Gladius Task Force",
    detachment_id: "det-1",
  },
];

// Import component AFTER mocks are set up
import { DetachmentCard } from "@/features/rules-hub/DetachmentCard";

describe("DetachmentCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders detachment name and abilities count badge", () => {
    mockUseDetachmentAbilitiesByDetachment.mockReturnValue(
      makeQueryResult(mockAbilities)
    );

    render(<DetachmentCard detachment={mockDetachment} favoritesMap={new Map()} notesMap={new Map()} />, { wrapper });

    expect(screen.getByText("Gladius Task Force")).toBeInTheDocument();
    expect(screen.getByText("3 abilities")).toBeInTheDocument();
  });

  it("shows singular 'ability' when count is 1", () => {
    mockUseDetachmentAbilitiesByDetachment.mockReturnValue(
      makeQueryResult([mockAbilities[0]])
    );

    render(<DetachmentCard detachment={mockDetachment} favoritesMap={new Map()} notesMap={new Map()} />, { wrapper });

    expect(screen.getByText("1 ability")).toBeInTheDocument();
  });

  it("shows '0 abilities' badge when no abilities", () => {
    mockUseDetachmentAbilitiesByDetachment.mockReturnValue(
      makeQueryResult([])
    );

    render(<DetachmentCard detachment={mockDetachment} favoritesMap={new Map()} notesMap={new Map()} />, { wrapper });

    expect(screen.getByText("0 abilities")).toBeInTheDocument();
  });

  it("shows ability names after expanding the card", async () => {
    mockUseDetachmentAbilitiesByDetachment.mockReturnValue(
      makeQueryResult(mockAbilities)
    );

    const user = userEvent.setup();
    render(<DetachmentCard detachment={mockDetachment} favoritesMap={new Map()} notesMap={new Map()} />, { wrapper });

    // Abilities not visible initially
    expect(screen.queryByText("Combat Doctrines")).not.toBeInTheDocument();

    // Click the trigger to expand
    await user.click(screen.getByText("Gladius Task Force"));

    expect(screen.getByText("Combat Doctrines")).toBeInTheDocument();
    expect(screen.getByText("Rapid Assault")).toBeInTheDocument();
    expect(screen.getByText("Iron Will")).toBeInTheDocument();
  });

  it("shows 'No abilities found' when expanded with empty list", async () => {
    mockUseDetachmentAbilitiesByDetachment.mockReturnValue(
      makeQueryResult([])
    );

    const user = userEvent.setup();
    render(<DetachmentCard detachment={mockDetachment} favoritesMap={new Map()} notesMap={new Map()} />, { wrapper });

    await user.click(screen.getByText("Gladius Task Force"));

    expect(screen.getByText("No abilities found.")).toBeInTheDocument();
  });

  it("shows 'Loading...' when isLoading is true", async () => {
    mockUseDetachmentAbilitiesByDetachment.mockReturnValue(
      makeQueryResult([], true)
    );

    const user = userEvent.setup();
    render(<DetachmentCard detachment={mockDetachment} favoritesMap={new Map()} notesMap={new Map()} />, { wrapper });

    await user.click(screen.getByText("Gladius Task Force"));

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  // PLAY-04: card-level annotation styling when favoritesMap has a matching ability entry
  it("applies border-l-primary to card when favoritesMap has a matching ability entry (PLAY-04)", () => {
    mockUseDetachmentAbilitiesByDetachment.mockReturnValue(
      makeQueryResult(mockAbilities)
    );

    const mockFav: RulesFavorite = {
      id: 1,
      rule_id: "a1",
      rule_type: "detachment_ability",
      rule_name: "Combat Doctrines",
      is_reminder: 0,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const favMap = new Map<string, RulesFavorite>([["a1:detachment_ability", mockFav]]);

    const { container } = render(
      <DetachmentCard detachment={mockDetachment} favoritesMap={favMap} notesMap={new Map()} />,
      { wrapper }
    );

    const collapsible = container.firstChild as HTMLElement;
    expect(collapsible).toHaveClass("border-l-primary");
    expect(collapsible).toHaveClass("bg-primary/5");
  });

  it("does NOT apply annotation classes when favoritesMap and notesMap are empty (PLAY-04)", () => {
    mockUseDetachmentAbilitiesByDetachment.mockReturnValue(
      makeQueryResult(mockAbilities)
    );

    const { container } = render(
      <DetachmentCard detachment={mockDetachment} favoritesMap={new Map()} notesMap={new Map()} />,
      { wrapper }
    );

    const collapsible = container.firstChild as HTMLElement;
    expect(collapsible).not.toHaveClass("border-l-primary");
    expect(collapsible).not.toHaveClass("bg-primary/5");
  });

  // PLAY-01/02: annotation controls visible for each ability when card is expanded
  it("shows star and flag buttons for each ability when expanded (PLAY-01, PLAY-02)", async () => {
    mockUseDetachmentAbilitiesByDetachment.mockReturnValue(
      makeQueryResult([mockAbilities[0]])
    );

    const user = userEvent.setup();
    render(<DetachmentCard detachment={mockDetachment} favoritesMap={new Map()} notesMap={new Map()} />, { wrapper });

    await user.click(screen.getByText("Gladius Task Force"));

    // Star and flag buttons rendered for the ability
    expect(screen.getByRole("button", { name: "Add to favorites" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Set as Game Day reminder" })).toBeInTheDocument();
  });

  it("shows filled yellow star for ability when it is in the favoritesMap (PLAY-01)", async () => {
    mockUseDetachmentAbilitiesByDetachment.mockReturnValue(
      makeQueryResult([mockAbilities[0]])
    );

    const mockFav: RulesFavorite = {
      id: 1,
      rule_id: "a1",
      rule_type: "detachment_ability",
      rule_name: "Combat Doctrines",
      is_reminder: 0,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const favMap = new Map<string, RulesFavorite>([["a1:detachment_ability", mockFav]]);

    const user = userEvent.setup();
    render(<DetachmentCard detachment={mockDetachment} favoritesMap={favMap} notesMap={new Map()} />, { wrapper });

    await user.click(screen.getByText("Gladius Task Force"));

    const starBtn = screen.getByRole("button", { name: "Remove from favorites" });
    expect(starBtn.querySelector("svg")).toHaveClass("fill-yellow-500");
  });

  it("shows filled blue flag for ability when is_reminder === 1 (PLAY-02)", async () => {
    mockUseDetachmentAbilitiesByDetachment.mockReturnValue(
      makeQueryResult([mockAbilities[0]])
    );

    const mockFavReminder: RulesFavorite = {
      id: 1,
      rule_id: "a1",
      rule_type: "detachment_ability",
      rule_name: "Combat Doctrines",
      is_reminder: 1,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const favMap = new Map<string, RulesFavorite>([["a1:detachment_ability", mockFavReminder]]);

    const user = userEvent.setup();
    render(<DetachmentCard detachment={mockDetachment} favoritesMap={favMap} notesMap={new Map()} />, { wrapper });

    await user.click(screen.getByText("Gladius Task Force"));

    const flagBtn = screen.getByRole("button", { name: "Remove Game Day reminder" });
    expect(flagBtn.querySelector("svg")).toHaveClass("fill-blue-500");
  });

  it("shows StickyNote indicator for ability when it is in the notesMap", async () => {
    mockUseDetachmentAbilitiesByDetachment.mockReturnValue(
      makeQueryResult([mockAbilities[0]])
    );

    const mockNote: RulesNote = {
      id: 1,
      rule_id: "a1",
      rule_type: "detachment_ability",
      rule_name: "Combat Doctrines",
      note_text: "Use in Fight phase",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const notesMap = new Map<string, RulesNote>([["a1:detachment_ability", mockNote]]);

    const user = userEvent.setup();
    render(<DetachmentCard detachment={mockDetachment} favoritesMap={new Map()} notesMap={notesMap} />, { wrapper });

    await user.click(screen.getByText("Gladius Task Force"));

    // StickyNote indicator: three SVGs inside the annotation controls div (star, flag, note)
    const starBtn = screen.getByRole("button", { name: "Add to favorites" });
    const controlsDiv = starBtn.parentElement;
    expect(controlsDiv?.querySelectorAll("svg").length).toBeGreaterThanOrEqual(3);
  });
});
