/**
 * Phase 56 / 107 -- UnitAbilityCard component tests.
 *
 * Mocks useDatasheet, useStrategyNote, and the game day store to verify
 * rendering of painting badge, OPG abilities, regular abilities, strategy
 * notes, and empty state.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { UnitAbilityCard } from "@/features/game-day/UnitAbilityCard";
import type { ArmyListUnitRow } from "@/types/armyList";
import type { UdbUnitDetail, UdbAbility } from "@/db/queries/unitDatabase";
import type { StrategyNote } from "@/types/strategyNote";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockUnit: ArmyListUnitRow = {
  id: 1,
  list_id: 1,
  unit_id: 100,
  ghost_unit_name: null,
  is_warlord: 0,
  selected_model_count: null,
  leader_attached_to_id: null,
  points_override: null,
  notes: null,
  sort_order: 0,
  created_at: "2026-01-01",
  unit_name: "Intercessors",
  unit_points: 80,
  udb_unit_id: null,
  effective_points: 80,
  faction_id: 10,
  unit_category: null, unit_model_count: null,
  status_assembly: 1,
  status_painting: "Battle Ready",
  painting_percentage: 100,
  tactical_role: null,
  udb_base_points: null,
  udb_role: null,
  udb_keywords: null,
  override_points: null,
  tier_points: null,
};

const opgAbility: UdbAbility = {
  id: 1,
  unit_id: "ds-001",
  line_order: 1,
  name: "Oath of Moment",
  description: "Once per battle, you can re-roll all hits.",
  ability_type: "Core",
};

const regularAbility: UdbAbility = {
  id: 2,
  unit_id: "ds-001",
  line_order: 2,
  name: "Bolter Discipline",
  description: "Re-roll hit rolls of 1.",
  ability_type: "Datasheet",
};

const mockDatasheet: UdbUnitDetail = {
  id: "ds-001",
  faction_id: "F-SM",
  name: "Intercessors",
  role: "Battleline",
  base_points: 80,
  damaged_w: null,
  damaged_desc: null,
  models: [],
  weapons: [],
  abilities: [opgAbility, regularAbility],
  keywords: [],
  points: [],
  composition: [],
};

const mockStrategyNote: StrategyNote = {
  id: 1,
  unit_id: 100,
  battlefield_role: null,
  strengths: "Good at holding objectives",
  weaknesses: "Fragile to AP-2",
  best_targets: null,
  synergies: null,
  mistakes_to_avoid: null,
  rules_references: null,
  notes: "Deploy in cover",
  move: null,
  toughness: null,
  save: null,
  wounds: null,
  leadership: null,
  objective_control: null,
  keywords: null,
  abilities: null,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockToggleAbilityUsed = vi.fn();
let mockUsedAbilities: string[] = [];

vi.mock("@/hooks/useDatasheet", () => ({
  useDatasheet: vi.fn(() => ({ data: mockDatasheet, isLoading: false })),
}));

vi.mock("@/hooks/useStrategyNote", () => ({
  useStrategyNote: vi.fn(() => ({ data: mockStrategyNote, isLoading: false })),
}));

vi.mock("@/features/game-day/gameDayStore", () => ({
  useGameDayStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ toggleAbilityUsed: mockToggleAbilityUsed }),
  useGameDayListState: () => ({
    cp: 0,
    prevCp: null,
    startingCp: 0,
    checklistItems: [],
    usedAbilities: mockUsedAbilities,
  }),
}));

// Import after mocks so we can override return values
const { useDatasheet } = await import("@/hooks/useDatasheet");
const { useStrategyNote } = await import("@/hooks/useStrategyNote");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

async function renderCardExpanded(unit: ArmyListUnitRow = mockUnit) {
  const user = userEvent.setup();
  render(<UnitAbilityCard unit={unit} listId={1} />, { wrapper: Wrapper });
  const trigger = screen.getByText(unit.unit_name).closest("button")!;
  await user.click(trigger);
}

function renderCard(unit: ArmyListUnitRow = mockUnit) {
  return render(<UnitAbilityCard unit={unit} listId={1} />, { wrapper: Wrapper });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("UnitAbilityCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsedAbilities = [];
    vi.mocked(useDatasheet).mockReturnValue({ data: mockDatasheet, isLoading: false } as ReturnType<typeof useDatasheet>);
    vi.mocked(useStrategyNote).mockReturnValue({ data: mockStrategyNote, isLoading: false } as ReturnType<typeof useStrategyNote>);
  });

  it("renders unit name and painting status badge", () => {
    renderCard();
    expect(screen.getByText("Intercessors")).toBeInTheDocument();
    expect(screen.getByText("Battle Ready")).toBeInTheDocument();
    expect(screen.getByText("80pts")).toBeInTheDocument();
  });

  it("renders 'Once Per Game' section header when OPG abilities detected", async () => {
    await renderCardExpanded();
    expect(screen.getByText("Once Per Game")).toBeInTheDocument();
  });

  it("renders OPG ability name", async () => {
    await renderCardExpanded();
    expect(screen.getByText("Oath of Moment")).toBeInTheDocument();
  });

  it("renders regular abilities section", async () => {
    await renderCardExpanded();
    expect(screen.getByText("Bolter Discipline")).toBeInTheDocument();
  });

  it("renders strategy note fields when strategy note exists", async () => {
    await renderCardExpanded();
    expect(screen.getByText("Good at holding objectives")).toBeInTheDocument();
    expect(screen.getByText("Deploy in cover")).toBeInTheDocument();
  });

  it("renders empty state when no abilities and no strategy note", async () => {
    vi.mocked(useDatasheet).mockReturnValue({
      data: { ...mockDatasheet, abilities: [] },
      isLoading: false,
    } as unknown as ReturnType<typeof useDatasheet>);
    vi.mocked(useStrategyNote).mockReturnValue({
      data: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useStrategyNote>);

    await renderCardExpanded();
    expect(screen.getByText(/no ability data available/i)).toBeInTheDocument();
  });
});
